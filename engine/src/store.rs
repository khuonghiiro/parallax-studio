use serde_json::{json,Value};
use std::{io::Write,path::PathBuf};
use crate::validation;

pub struct Store {pub project:Value,pub past:Vec<Value>,pub future:Vec<Value>,path:PathBuf}
impl Store {
    pub fn open(path:PathBuf)->Result<Self,String>{
        let project=if path.exists(){serde_json::from_slice(&std::fs::read(&path).map_err(|e|e.to_string())?).map_err(|e|format!("Cannot read project; original file preserved: {e}"))?}else{serde_json::from_str(include_str!("../seed.json")).map_err(|e|e.to_string())?};
        validation::validate(&project)?;
        let store=Self{project,past:vec![],future:vec![],path};store.save(&store.project)?;Ok(store)
    }
    fn save(&self,p:&Value)->Result<(),String>{
        let mut tmp=tempfile::NamedTempFile::new_in(self.path.parent().ok_or("Missing parent")?).map_err(|e|e.to_string())?;
        serde_json::to_writer_pretty(&mut tmp,p).map_err(|e|e.to_string())?;
        tmp.flush().map_err(|e|e.to_string())?;tmp.as_file().sync_all().map_err(|e|e.to_string())?;
        tmp.persist(&self.path).map_err(|e|e.to_string())?;Ok(())
    }
    pub fn apply(&mut self,command:&Value,revision:Option<u64>)->Result<Value,String>{
        let rev=self.project["revision"].as_u64().ok_or("Missing revision")?;
        if revision.is_some_and(|r|r!=rev){return Err("CONFLICT: Project changed; reload before applying this edit".into())}
        let op=command["op"].as_str().ok_or("Missing op")?;
        let mut candidate=match op {
            "undo"=>self.past.last().cloned().ok_or("Nothing to undo")?,
            "redo"=>self.future.last().cloned().ok_or("Nothing to redo")?,
            _=>{let mut p=self.project.clone();apply_command(&mut p,command,0)?;p}
        };
        candidate["revision"]=json!(rev+1);validation::validate(&candidate)?;self.save(&candidate)?;
        match op {
            "undo"=>{self.past.pop();self.future.push(self.project.clone());},
            "redo"=>{self.future.pop();self.past.push(self.project.clone());},
            _=>{self.past.push(self.project.clone());self.future.clear();}
        }
        // Bound history by both entries and serialized bytes for large imported projects.
        while self.past.len()>50||self.past.iter().map(|p|p.to_string().len()).sum::<usize>()>32*1024*1024{self.past.remove(0);}
        self.project=candidate;Ok(self.project.clone())
    }
}
fn field<'a>(v:&'a Value,key:&str)->Result<&'a Value,String>{v.get(key).ok_or_else(||format!("Missing {key}"))}
fn string<'a>(v:&'a Value,key:&str)->Result<&'a str,String>{field(v,key)?.as_str().ok_or_else(||format!("{key} must be text"))}
fn array<'a>(p:&'a mut Value,key:&str)->Result<&'a mut Vec<Value>,String>{p[key].as_array_mut().ok_or_else(||format!("Invalid {key}"))}
fn merge(target:&mut Value,patch:&Value)->Result<(),String>{let t=target.as_object_mut().ok_or("Not an object")?;for(k,v)in patch.as_object().ok_or("Patch must be object")?{if k=="id"||k=="assetId"{return Err("Cannot change identity".into())}if !t.contains_key(k){return Err(format!("Unknown field {k}"))}t.insert(k.clone(),v.clone());}Ok(())}
pub fn apply_command(p:&mut Value,c:&Value,depth:usize)->Result<(),String>{
    if depth>4{return Err("Batch nesting limit".into())}
    match string(c,"op")? {
        "batch"=>{let commands=field(c,"commands")?.as_array().ok_or("Commands must be array")?;if commands.is_empty()||commands.len()>200{return Err("Batch must contain 1–200 commands".into())}for cmd in commands {apply_command(p,cmd,depth+1)?;}},
        "restore"=>{*p=field(c,"project")?.clone();},
        "add_asset"=>array(p,"assets")?.push(field(c,"asset")?.clone()),
        "update_asset"=>{let id=string(c,"id")?;let a=array(p,"assets")?.iter_mut().find(|a|a["id"]==id).ok_or("Asset not found")?;merge(a,field(c,"patch")?)?;},
        "add_node"=>array(p,"nodes")?.push(field(c,"node")?.clone()),
        "update_node"=>{let id=string(c,"id")?;let n=array(p,"nodes")?.iter_mut().find(|n|n["id"]==id).ok_or("Node not found")?;merge(n,field(c,"patch")?)?;},
        "delete_node"=>{let id=string(c,"id")?;if !array(p,"nodes")?.iter().any(|n|n["id"]==id){return Err("Node not found".into())}array(p,"nodes")?.retain(|n|n["id"]!=id);array(p,"clips")?.retain(|n|n["nodeId"]!=id);array(p,"tracks")?.retain(|n|n["nodeId"]!=id);},
        "add_clip"=>array(p,"clips")?.push(field(c,"clip")?.clone()),
        "delete_clip"=>{let id=string(c,"id")?;let items=array(p,"clips")?;let idx=items.iter().position(|a|a["id"]==id).ok_or("Clip not found")?;items.remove(idx);},
        "upsert_track"=>{let track=field(c,"track")?.clone();let items=array(p,"tracks")?;if let Some(i)=items.iter().position(|a|a["id"]==track["id"]){items[i]=track;}else{items.push(track);}},
        "delete_track"=>{let id=string(c,"id")?;let items=array(p,"tracks")?;let idx=items.iter().position(|a|a["id"]==id).ok_or("Track not found")?;items.remove(idx);},
        "set_camera"=>merge(&mut p["camera"],field(c,"patch")?)?,
        "set_light"=>merge(&mut p["light"],field(c,"patch")?)?,
        "set_scene"=>{for(k,v)in field(c,"patch")?.as_object().ok_or("Patch must be object")?{if !["name","duration","fps","background","ground"].contains(&k.as_str()){return Err(format!("Unknown scene field {k}"))}p[k]=v.clone();}},
        "add_shot"=>array(p,"shots")?.push(field(c,"shot")?.clone()),
        "delete_shot"=>{let id=string(c,"id")?;let items=array(p,"shots")?;let idx=items.iter().position(|a|a["id"]==id).ok_or("Shot not found")?;items.remove(idx);},
        other=>return Err(format!("Unknown operation: {other}"))
    };Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn rollback_conflicts_and_history(){let dir=tempfile::tempdir().unwrap();let mut s=Store::open(dir.path().join("project.json")).unwrap();let old=s.project.clone();assert!(s.apply(&json!({"op":"batch","commands":[{"op":"set_scene","patch":{"name":"changed"}},{"op":"add_node","node":{"id":"broken"}}]}),Some(0)).is_err());assert_eq!(s.project,old);s.apply(&json!({"op":"set_scene","patch":{"name":"changed"}}),Some(0)).unwrap();assert!(s.apply(&json!({"op":"set_scene","patch":{"name":"stale"}}),Some(0)).is_err());s.apply(&json!({"op":"undo"}),Some(1)).unwrap();assert_eq!(s.project["name"],old["name"]);assert_eq!(s.project["revision"],2);s.apply(&json!({"op":"redo"}),Some(2)).unwrap();assert_eq!(s.project["name"],"changed");assert_eq!(Store::open(dir.path().join("project.json")).unwrap().project,s.project);}
    #[test] fn rejects_cycles_and_bad_references(){let mut p:Value=serde_json::from_str(include_str!("../seed.json")).unwrap();p["assets"][0]["bones"][0]["parent"]=json!("head");assert!(validation::validate(&p).is_err());let mut p:Value=serde_json::from_str(include_str!("../seed.json")).unwrap();p["nodes"][0]["assetId"]=json!("missing");assert!(validation::validate(&p).is_err());}
    #[test] fn cascade_deletion(){let dir=tempfile::tempdir().unwrap();let mut s=Store::open(dir.path().join("p.json")).unwrap();s.apply(&json!({"op":"delete_node","id":"milo"}),Some(0)).unwrap();assert!(s.project["clips"].as_array().unwrap().iter().all(|c|c["nodeId"]!="milo"));}
}
