mod store;
mod validation;

use axum::{body::Bytes,extract::{DefaultBodyLimit,Path,State,Request},http::{HeaderMap,StatusCode},middleware::{self,Next},response::{IntoResponse,Response},routing::{get,post},Json,Router};
use serde::{Deserialize,Serialize};
use serde_json::{json,Value};
use std::{collections::BTreeMap,fs::OpenOptions,io::Write,path::PathBuf,sync::{Arc,Mutex},time::{Duration,Instant}};
use tower_http::services::{ServeDir,ServeFile};
use uuid::Uuid;
use fs2::FileExt;
use store::Store;

type App=Arc<AppState>;
struct AppState {store:Mutex<Store>,root:PathBuf,token:String,ffmpeg:bool,port:u16,jobs:Mutex<BTreeMap<String,Job>>}
#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
struct Job {id:String,status:String,width:u32,height:u32,fps:u32,duration:f64,frames:u32,total_frames:u32,project:Value,#[serde(skip_serializing_if="Option::is_none")]error:Option<String>,#[serde(skip_serializing_if="Option::is_none")]url:Option<String>,#[serde(skip)]touched:Instant}
struct ApiError(StatusCode,String);
impl IntoResponse for ApiError {fn into_response(self)->Response{(self.0,Json(json!({"error":self.1}))).into_response()}}
impl From<String> for ApiError{fn from(e:String)->Self{Self(if e.starts_with("CONFLICT"){StatusCode::CONFLICT}else{StatusCode::BAD_REQUEST},e)}}
impl From<std::io::Error> for ApiError{fn from(e:std::io::Error)->Self{Self(StatusCode::INTERNAL_SERVER_ERROR,e.to_string())}}
fn error(s:&str)->ApiError{ApiError(StatusCode::BAD_REQUEST,s.into())}

#[tokio::main]
async fn main()->Result<(),Box<dyn std::error::Error>>{
    let args:Vec<String>=std::env::args().collect();
    let arg=|name:&str,default:&str|args.iter().position(|v|v==name).and_then(|i|args.get(i+1)).cloned().unwrap_or(default.into());
    let root=PathBuf::from(arg("--workspace","workspace"));let web=PathBuf::from(arg("--web","dist"));let port:u16=arg("--port","4783").parse()?;
    std::fs::create_dir_all(&root)?;let root=std::fs::canonicalize(root)?;
    let lock=OpenOptions::new().read(true).write(true).create(true).truncate(false).open(root.join("engine.lock"))?;
    lock.try_lock_exclusive().map_err(|_|"This workspace is already open in another engine process")?;
    for dir in ["media","renders"] {std::fs::create_dir_all(root.join(dir))?;}
    let store=Store::open(root.join("project.json"))?;
    let ffmpeg=hidden_command("ffmpeg").arg("-version").output().await.is_ok_and(|o|o.status.success());
    let state=Arc::new(AppState{store:Mutex::new(store),root:root.clone(),token:Uuid::new_v4().to_string(),ffmpeg,port,jobs:Mutex::new(BTreeMap::new())});
    let app=Router::new().route("/api/health",get(||async{Json(json!({"status":"ok","engine":"parallax","version":env!("CARGO_PKG_VERSION")}))}))
        .route("/api/session",get(session)).route("/api/project",get(project)).route("/api/version",get(version)).route("/api/command",post(command))
        .route("/api/import",post(import)).route("/api/renders",get(jobs).post(create_render)).route("/api/renders/{id}/claim",post(claim))
        .route("/api/renders/{id}/frames/{index}",post(frame)).route("/api/renders/{id}/finish",post(finish)).route("/api/renders/{id}/fail",post(fail))
        .nest_service("/media",ServeDir::new(root.join("media"))).nest_service("/renders",ServeDir::new(root.join("renders")))
        .fallback_service(ServeDir::new(&web).not_found_service(ServeFile::new(web.join("index.html"))))
        .layer(DefaultBodyLimit::max(100*1024*1024)).layer(middleware::from_fn_with_state(state.clone(),guard)).with_state(state.clone());
    let cleanup_state=state.clone();tokio::spawn(async move{loop{tokio::time::sleep(Duration::from_secs(10)).await;if let Ok(mut jobs)=cleanup_state.jobs.lock(){for j in jobs.values_mut(){if j.status=="rendering"&&j.touched.elapsed()>Duration::from_secs(90){j.status="failed".into();j.error=Some("Renderer disconnected or paused for more than 90 seconds. Start a new render.".into());}}}}});
    let listener=tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST,port)).await?;
    eprintln!("Parallax Studio http://127.0.0.1:{port} · workspace: {} · FFmpeg: {ffmpeg}",root.display());
    axum::serve(listener,app).with_graceful_shutdown(async{let _=tokio::signal::ctrl_c().await;}).await?;
    drop(lock);Ok(())
}
fn hidden_command(exe:&str)->tokio::process::Command{
    let mut cmd=tokio::process::Command::new(exe);
    #[cfg(windows)]cmd.creation_flags(0x08000000);
    cmd.kill_on_drop(true);cmd
}
async fn guard(State(s):State<App>,req:Request,next:Next)->Response{
    let allowed=[format!("127.0.0.1:{}",s.port),format!("localhost:{}",s.port),"127.0.0.1:5173".into(),"localhost:5173".into()];
    let host=req.headers().get("host").and_then(|h|h.to_str().ok()).unwrap_or("");
    if !allowed.iter().any(|h|h==host){return ApiError(StatusCode::FORBIDDEN,"Invalid local host".into()).into_response()}
    if let Some(origin)=req.headers().get("origin").and_then(|o|o.to_str().ok()) {if !allowed.iter().any(|h|origin==format!("http://{h}")){return ApiError(StatusCode::FORBIDDEN,"Cross-origin access denied".into()).into_response()}}
    if req.headers().get("sec-fetch-site").is_some_and(|h|h=="cross-site"){return ApiError(StatusCode::FORBIDDEN,"Cross-site access denied".into()).into_response()}
    let path=req.uri().path();
    if path.starts_with("/api/")&&path!="/api/health"&&path!="/api/session"&&req.headers().get("x-parallax-token").and_then(|v|v.to_str().ok())!=Some(s.token.as_str()){return ApiError(StatusCode::UNAUTHORIZED,"Local session token required".into()).into_response()}
    let mut response=next.run(req).await;
    response.headers_mut().insert("x-content-type-options","nosniff".parse().unwrap());
    response.headers_mut().insert("referrer-policy","same-origin".parse().unwrap());
    response
}
async fn session(State(s):State<App>)->impl IntoResponse{let mut h=HeaderMap::new();h.insert("cache-control","no-store".parse().unwrap());(h,Json(json!({"token":s.token,"ffmpeg":s.ffmpeg,"version":env!("CARGO_PKG_VERSION")})))}
async fn project(State(s):State<App>)->Json<Value>{Json(s.store.lock().unwrap().project.clone())}
async fn version(State(s):State<App>)->Json<Value>{let store=s.store.lock().unwrap();Json(json!({"revision":store.project["revision"],"canUndo":!store.past.is_empty(),"canRedo":!store.future.is_empty()}))}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CommandRequest{command:Value,revision:Option<u64>}
async fn command(State(s):State<App>,Json(body):Json<CommandRequest>)->Result<Json<Value>,ApiError>{
    if body.command.to_string().len()>8*1024*1024{return Err(error("Command exceeds 8 MB"))}
    let value=tokio::task::spawn_blocking(move||s.store.lock().map_err(|_|"Store unavailable".to_string())?.apply(&body.command,body.revision)).await.map_err(|e|error(&e.to_string()))??;
    Ok(Json(value))
}
async fn import(State(s):State<App>,bytes:Bytes)->Result<Json<Value>,ApiError>{
    if bytes.len()>100*1024*1024{return Err(error("Media exceeds 100 MB"))}
    let ext=if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {"png"}
    else if bytes.starts_with(b"\xff\xd8\xff") {"jpg"}
    else if bytes.starts_with(b"RIFF")&&bytes.get(8..12)==Some(b"WEBP") {"webp"}
    else if bytes.starts_with(b"glTF"){validate_glb(&bytes)?;"glb"}
    else{return Err(error("Supported files: PNG, JPEG, WebP and self-contained GLB 2.0"))};
    let file=format!("{}.{}",Uuid::new_v4(),ext);let path=s.root.join("media").join(&file);
    tokio::fs::write(path,&bytes).await?;Ok(Json(json!({"source":format!("/media/{file}")})))
}
fn validate_glb(bytes:&[u8])->Result<(),ApiError>{
    if bytes.len()<20{return Err(error("Truncated GLB"))}
    let u32at=|i:usize|u32::from_le_bytes(bytes[i..i+4].try_into().unwrap()) as usize;
    if u32at(4)!=2||u32at(8)!=bytes.len()||bytes.get(16..20)!=Some(b"JSON"){return Err(error("Invalid GLB 2.0 header"))}
    let len=u32at(12);let end=20usize.checked_add(len).ok_or_else(||error("GLB length overflow"))?;
    let json:Value=serde_json::from_slice(bytes.get(20..end).ok_or_else(||error("Truncated GLB JSON"))?).map_err(|_|error("Invalid GLB JSON"))?;
    for key in ["buffers","images"]{if let Some(items)=json[key].as_array(){for item in items{if item.get("uri").is_some(){return Err(error("Use a self-contained GLB with embedded binary buffers and textures; external/data URIs are not supported"))}}}}
    Ok(())
}
async fn jobs(State(s):State<App>)->Json<Vec<Job>>{Json(s.jobs.lock().unwrap().values().cloned().collect())}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RenderRequest{width:u32,height:u32,fps:u32}
async fn create_render(State(s):State<App>,Json(r):Json<RenderRequest>)->Result<Json<Job>,ApiError>{
    if !s.ffmpeg{return Err(error("FFmpeg is not installed. Install it and restart the engine, or export WebM from the editor."))}
    if ![(1280,720),(1920,1080)].contains(&(r.width,r.height))||![24,30,60].contains(&r.fps){return Err(error("Choose 720p or 1080p at 24, 30 or 60 fps"))}
    let project=s.store.lock().unwrap().project.clone();let duration=project["duration"].as_f64().unwrap();
    if duration>120.{return Err(error("Offline MP4 export is limited to 120 seconds per job"))}
    let mut jobs=s.jobs.lock().unwrap();if jobs.values().any(|j|["queued","rendering","encoding"].contains(&j.status.as_str())){return Err(error("Another render is active"))}
    if jobs.len()>=20{if let Some(id)=jobs.values().filter(|j|j.status=="complete"||j.status=="failed").min_by_key(|j|j.touched).map(|j|j.id.clone()){jobs.remove(&id);}}
    let id=Uuid::new_v4().to_string();std::fs::create_dir_all(s.root.join("renders").join(&id))?;
    let j=Job{id:id.clone(),status:"queued".into(),width:r.width,height:r.height,fps:r.fps,duration,frames:0,total_frames:(duration*r.fps as f64).ceil() as u32,project,error:None,url:None,touched:Instant::now()};
    jobs.insert(id,j.clone());Ok(Json(j))
}
async fn claim(State(s):State<App>,Path(id):Path<String>)->Result<Json<Job>,ApiError>{let mut jobs=s.jobs.lock().unwrap();let j=jobs.get_mut(&id).ok_or_else(||error("Render not found"))?;if j.status!="queued"{return Err(ApiError(StatusCode::CONFLICT,"Render already claimed".into()))}j.status="rendering".into();j.touched=Instant::now();Ok(Json(j.clone()))}
async fn frame(State(s):State<App>,Path((id,index)):Path<(String,u32)>,bytes:Bytes)->Result<Json<Value>,ApiError>{
    tokio::task::spawn_blocking(move||{
        let mut jobs=s.jobs.lock().unwrap();let j=jobs.get_mut(&id).ok_or_else(||error("Render not found"))?;
        if j.status!="rendering"||index!=j.frames||index>=j.total_frames{return Err(error("Frame index must be sequential on a claimed render"))}
        if bytes.len()>16*1024*1024{return Err(error("PNG exceeds 16 MB"))}
        let mut decoder=png::Decoder::new(std::io::Cursor::new(&bytes));decoder.set_limits(png::Limits{bytes:32*1024*1024});
        let mut reader=decoder.read_info().map_err(|_|error("Invalid PNG"))?;let info=reader.info();
        if (info.width,info.height)!=(j.width,j.height){return Err(error("Frame dimensions do not match render"))}
        let mut decoded=vec![0;reader.output_buffer_size()];reader.next_frame(&mut decoded).map_err(|_|error("Corrupt PNG frame"))?;
        let path=s.root.join("renders").join(&id).join(format!("frame-{index:06}.png"));
        let mut file=std::fs::File::create(path)?;file.write_all(&bytes)?;j.frames+=1;j.touched=Instant::now();Ok(Json(json!({"frames":j.frames})))
    }).await.map_err(|e|error(&e.to_string()))?
}
async fn finish(State(s):State<App>,Path(id):Path<String>)->Result<Json<Job>,ApiError>{
    let job={let mut jobs=s.jobs.lock().unwrap();let j=jobs.get_mut(&id).ok_or_else(||error("Render not found"))?;if j.status!="rendering"||j.frames!=j.total_frames{return Err(error("All frames must be uploaded before encoding"))}j.status="encoding".into();j.touched=Instant::now();j.clone()};
    let task_state=s.clone();let task_job=job.clone();tokio::spawn(async move{
        let folder=task_state.root.join("renders").join(&task_job.id);
        let mut cmd=hidden_command("ffmpeg");cmd.args(["-nostdin","-y","-loglevel","error","-framerate",&task_job.fps.to_string(),"-i"]).arg(folder.join("frame-%06d.png")).args(["-frames:v",&task_job.total_frames.to_string(),"-c:v","libx264","-preset","fast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart"]).arg(folder.join("film.mp4"));
        let result=tokio::time::timeout(Duration::from_secs(300),cmd.output()).await;
        let failure=match result{Ok(Ok(o)) if o.status.success()=>None,Ok(Ok(o))=>Some(String::from_utf8_lossy(&o.stderr).chars().take(2000).collect()),Ok(Err(e))=>Some(e.to_string()),Err(_)=>Some("FFmpeg timed out after 5 minutes".into())};
        if let Ok(mut jobs)=task_state.jobs.lock(){if let Some(j)=jobs.get_mut(&task_job.id){j.error=failure;j.status=if j.error.is_none(){"complete"}else{"failed"}.into();j.touched=Instant::now();if j.error.is_none(){j.url=Some(format!("/renders/{}/film.mp4",j.id));}}}
        // Remove only frames created by this exact job; keep the completed movie or failure evidence.
        if let Ok(jobs)=task_state.jobs.lock(){if jobs.get(&task_job.id).is_some_and(|j|j.status=="complete"){for i in 0..task_job.total_frames{let _=std::fs::remove_file(folder.join(format!("frame-{i:06}.png")));}}}
    });Ok(Json(job))
}
async fn fail(State(s):State<App>,Path(id):Path<String>,Json(body):Json<Value>)->Result<Json<Value>,ApiError>{let mut jobs=s.jobs.lock().unwrap();let j=jobs.get_mut(&id).ok_or_else(||error("Render not found"))?;if !["queued","rendering"].contains(&j.status.as_str()){return Err(error("This render cannot be cancelled"))}j.status="failed".into();j.error=Some(body["error"].as_str().unwrap_or("Cancelled").chars().take(2000).collect());Ok(Json(json!({"status":"failed"})))}

#[cfg(test)]
mod tests {use super::*;#[test]fn media_paths(){assert!(validation::valid_media("/media/abc-123.glb"));assert!(!validation::valid_media("/media/../project.json"));assert!(!validation::valid_media("https://example.com/a.png"));}#[test]fn glb_external_uri_rejected(){let mut data=br#"{"buffers":[{"uri":"https://example.com/secret"}]}"#.to_vec();while data.len()%4!=0{data.push(b' ');}let mut bytes=b"glTF".to_vec();bytes.extend(2u32.to_le_bytes());bytes.extend(((20+data.len())as u32).to_le_bytes());bytes.extend((data.len()as u32).to_le_bytes());bytes.extend(b"JSON");bytes.extend(data);assert!(validate_glb(&bytes).is_err());assert!(validate_glb(b"glTF").is_err());}}
