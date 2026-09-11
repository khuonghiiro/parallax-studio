import { projectSchema, validateRelations, type Command, type Project, type RenderJob } from '../shared/model';
let token='';
async function request<T>(path:string,init:RequestInit={}):Promise<T> {
  const response=await fetch(path,{...init,headers:{...(init.body && !(init.body instanceof Blob) ? {'Content-Type':'application/json'}:{}),'X-Parallax-Token':token,...init.headers}});
  if(!response.ok) { const body=await response.json().catch(()=>({error:`HTTP ${response.status}`}));throw new Error(body.error??`HTTP ${response.status}`); }
  return response.json();
}
export const api={
  async connect() { const session=await request<{token:string;ffmpeg:boolean;version:string}>('/api/session');token=session.token;return session; },
  async project() { return validateRelations(projectSchema.parse(await request('/api/project'))); },
  async command(command:Command,revision?:number) { return validateRelations(projectSchema.parse(await request('/api/command',{method:'POST',body:JSON.stringify({command,revision})}))); },
  async importFile(file:File) { return request<{source:string}>('/api/import',{method:'POST',body:file,headers:{'Content-Type':'application/octet-stream','X-Filename':encodeURIComponent(file.name)}}); },
  version:()=>request<{revision:number;canUndo:boolean;canRedo:boolean}>('/api/version'),
  jobs:()=>request<RenderJob[]>('/api/renders'),
  createRender:(options:{width:number;height:number;fps:number})=>request<RenderJob>('/api/renders',{method:'POST',body:JSON.stringify(options)}),
  claim:(id:string)=>request<RenderJob>(`/api/renders/${id}/claim`,{method:'POST'}),
  frame:(id:string,index:number,png:Blob)=>request(`/api/renders/${id}/frames/${index}`,{method:'POST',body:png,headers:{'Content-Type':'image/png'}}),
  finish:(id:string)=>request<RenderJob>(`/api/renders/${id}/finish`,{method:'POST'}),
  fail:(id:string,error:string)=>request(`/api/renders/${id}/fail`,{method:'POST',body:JSON.stringify({error})}),
  auth:()=>token,
};
export type {Project};
