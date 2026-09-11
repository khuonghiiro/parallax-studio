use serde::Deserialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Project {
    schema_version: u32, revision: u64, id: String, name: String, duration: f64, fps: u32,
    background: String, ground: String, assets: Vec<Asset>, nodes: Vec<Node>, clips: Vec<Clip>, tracks: Vec<Track>, shots: Vec<Shot>, camera: Camera, light: Light,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Bone { id: String, parent: Option<String>, position: [f64;3], rotation:f64 }
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Part { id:String, bone:String, shape:String, position:[f64;3], size:[f64;3], color:String }
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Asset { id:String,name:String,kind:String,template:String,color:String,bones:Vec<Bone>,parts:Vec<Part>,source:Option<String>,width:f64,height:f64,rigged:bool }
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
struct Node {id:String,asset_id:String,name:String,position:[f64;3],rotation:[f64;3],scale:[f64;3],visible:bool,cast_shadow:bool}
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
struct Clip {id:String,node_id:String,name:String,preset:String,start:f64,duration:f64,speed:f64,amplitude:f64}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Key {time:f64,value:f64,easing:String}
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
struct Track {id:String,node_id:String,property:String,keys:Vec<Key>}
#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
struct Camera {position:[f64;3],target:[f64;3],fov:f64,projection:String,ortho_size:f64}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Light {position:[f64;3],color:String,intensity:f64,ambient:f64,shadows:bool}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Shot {id:String,name:String,start:f64,duration:f64,camera:Camera}
fn check(ok:bool,msg:&str)->Result<(),String>{if ok {Ok(())} else {Err(msg.into())}}
fn num(v:f64,lo:f64,hi:f64)->bool{v.is_finite()&&v>=lo&&v<=hi}
fn vec(v:&[f64;3])->bool{v.iter().all(|n|num(*n,-10000.,10000.))}
fn id(s:&str)->bool{!s.is_empty()&&s.len()<=100&&s.bytes().all(|c|c.is_ascii_alphanumeric()||c==b'_'||c==b'-')}
fn name(s:&str)->bool{!s.trim().is_empty()&&s.chars().count()<=120}
fn color(s:&str)->bool{s.len()==7&&s.starts_with('#')&&s[1..].bytes().all(|c|c.is_ascii_hexdigit())}
fn unique<'a>(values:impl Iterator<Item=&'a str>)->bool{let mut seen=HashSet::new();values.into_iter().all(|s|id(s)&&seen.insert(s))}
fn camera(c:&Camera)->bool{vec(&c.position)&&vec(&c.target)&&c.position!=c.target&&num(c.fov,15.,100.)&&num(c.ortho_size,2.,50.)&&["perspective","orthographic"].contains(&c.projection.as_str())}
pub fn validate(v:&Value)->Result<(),String>{
    let p:Project=serde_json::from_value(v.clone()).map_err(|e|format!("Project schema: {e}"))?;
    check(p.schema_version==1&&id(&p.id)&&name(&p.name),"Invalid project identity")?;
    let _=p.revision;
    check(num(p.duration,1.,600.)&&(12..=60).contains(&p.fps),"Invalid duration or fps")?;
    check(color(&p.background)&&color(&p.ground)&&camera(&p.camera),"Invalid scene/camera")?;
    check(vec(&p.light.position)&&color(&p.light.color)&&num(p.light.intensity,0.,15.)&&num(p.light.ambient,0.,5.),"Invalid light")?;
    let _=p.light.shadows;
    check(p.assets.len()<=500&&p.nodes.len()<=500&&p.clips.len()<=2000&&p.tracks.len()<=5000&&p.shots.len()<=300,"Project limit exceeded")?;
    check(unique(p.assets.iter().map(|a|a.id.as_str()))&&unique(p.nodes.iter().map(|a|a.id.as_str()))&&unique(p.clips.iter().map(|a|a.id.as_str()))&&unique(p.tracks.iter().map(|a|a.id.as_str()))&&unique(p.shots.iter().map(|a|a.id.as_str())),"Duplicate or invalid IDs")?;
    for a in &p.assets {
        check(name(&a.name)&&color(&a.color)&&num(a.width,0.001,100.)&&num(a.height,0.001,100.),"Invalid asset")?;
        check(["character","animal","prop","sprite","model"].contains(&a.kind.as_str())&&["human","fox","tree","rock","crate","custom"].contains(&a.template.as_str()),"Unknown asset kind/template")?;
        check(a.bones.len()<=128&&a.parts.len()<=512&&unique(a.bones.iter().map(|b|b.id.as_str()))&&unique(a.parts.iter().map(|b|b.id.as_str())),"Invalid bone/part IDs or count")?;
        let _=a.rigged;
        let bones:HashMap<_,_>=a.bones.iter().map(|b|(b.id.as_str(),b)).collect();
        for b in &a.bones {
            check(vec(&b.position)&&num(b.rotation,-3600.,3600.),"Invalid bone transform")?;
            let mut seen=HashSet::from([b.id.as_str()]);let mut parent=b.parent.as_deref();
            while let Some(id)=parent { check(seen.insert(id),"Bone cycle")?;parent=bones.get(id).ok_or("Missing parent bone")?.parent.as_deref(); }
        }
        for part in &a.parts {check(bones.contains_key(part.bone.as_str())&&["box","ellipse","triangle"].contains(&part.shape.as_str())&&vec(&part.position)&&part.size.iter().all(|n|num(*n,0.001,100.))&&color(&part.color),"Invalid part or bone reference")?;}
        if let Some(source)=&a.source {check(valid_media(source),"Invalid media path")?;}
        check(!["sprite","model"].contains(&a.kind.as_str())||a.source.is_some(),"Imported asset needs media source")?;
    }
    for n in &p.nodes {check(p.assets.iter().any(|a|a.id==n.asset_id)&&name(&n.name)&&vec(&n.position)&&vec(&n.rotation)&&vec(&n.scale)&&n.scale.iter().all(|s|s.abs()>=0.001),"Invalid node or asset reference")?;let _=(n.visible,n.cast_shadow);}
    for c in &p.clips {check(p.nodes.iter().any(|n|n.id==c.node_id)&&name(&c.name)&&num(c.start,0.,p.duration)&&num(c.duration,0.001,600.)&&c.start+c.duration<=p.duration+0.000001&&num(c.speed,0.001,10.)&&num(c.amplitude,0.,5.)&&["idle","walk","run","wave","bounce","spin","gltf"].contains(&c.preset.as_str()),"Invalid animation clip")?;}
    for t in &p.tracks {
        let n=p.nodes.iter().find(|n|n.id==t.node_id).ok_or("Missing track node")?;
        let a=p.assets.iter().find(|a|a.id==n.asset_id).ok_or("Missing track asset")?;
        let transform=["position","rotation","scale"].iter().any(|s|["x","y","z"].iter().any(|axis|t.property==format!("{s}.{axis}")));
        let bone=a.bones.iter().any(|b|t.property==format!("bone.{}.rotation",b.id));
        check((transform||bone)&&t.keys.len()<=2000,"Unknown animation property")?;
        let mut last=-1.;for k in &t.keys {check(num(k.time,0.,p.duration)&&k.time>last&&num(k.value,-10000.,10000.)&&["linear","smooth","step"].contains(&k.easing.as_str()),"Invalid or unsorted keyframes")?;last=k.time;}
    }
    for s in &p.shots {check(name(&s.name)&&num(s.start,0.,p.duration)&&num(s.duration,0.001,600.)&&s.start+s.duration<=p.duration+0.000001&&camera(&s.camera),"Invalid camera shot")?;}
    Ok(())
}
pub fn valid_media(source:&str)->bool{
    let Some(file)=source.strip_prefix("/media/") else{return false};
    let Some((stem,ext))=file.rsplit_once('.') else{return false};
    id(stem)&&["png","webp","jpg","glb"].contains(&ext)
}
