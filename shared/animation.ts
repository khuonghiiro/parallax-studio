import type { Camera, Clip, Keyframe, Project, SceneNode, Vec3 } from './model';

export const radians = (degrees: number) => degrees * Math.PI / 180;
export function sampleKeys(keys: Keyframe[], time: number): number | undefined {
  if (!keys.length) return undefined;
  if (time <= keys[0].time) return keys[0].value;
  if (time >= keys[keys.length-1].time) return keys[keys.length-1].value;
  let lo=0, hi=keys.length-1;
  while(hi-lo>1) { const mid=(lo+hi)>>>1; if(keys[mid].time<=time) lo=mid; else hi=mid; }
  const a=keys[lo], b=keys[hi]; let f=(time-a.time)/(b.time-a.time);
  if(a.easing==='step') f=0; else if(a.easing==='smooth') f=f*f*(3-2*f);
  return a.value+(b.value-a.value)*f;
}
export function clipPose(clip: Clip, time: number): { y: number; rotation: number; bones: Record<string, number> } {
  const pose = { y:0, rotation:0, bones:{} as Record<string,number> };
  if(time<clip.start || time>=clip.start+clip.duration) return pose;
  const t=(time-clip.start)*clip.speed, wave=Math.sin(t*Math.PI*2), amp=clip.amplitude;
  switch(clip.preset) {
    case 'idle': pose.y=Math.sin(t*2)*0.035*amp; pose.bones.head=Math.sin(t)*3*amp; break;
    case 'run':
    case 'walk': { const fast=clip.preset==='run'?2:1, s=Math.sin(t*Math.PI*2*fast)*amp; pose.y=Math.abs(s)*0.07; Object.assign(pose.bones,{arm_l:s*30,arm_r:-s*30,leg_l:-s*28,leg_r:s*28,front_l:s*25,front_r:-s*25,back_l:-s*25,back_r:s*25,tail:s*10}); break; }
    case 'wave': pose.bones.arm_r=-125+wave*20*amp; pose.bones.forearm_r=wave*18*amp; break;
    case 'bounce': pose.y=Math.abs(wave)*0.65*amp; break;
    case 'spin': pose.rotation=t*180*amp; break;
  }
  return pose;
}
export function evaluateNode(project: Project, node: SceneNode, time: number) {
  const result={ position:[...node.position] as Vec3, rotation:[...node.rotation] as Vec3, scale:[...node.scale] as Vec3, bones:{} as Record<string,number> };
  for (const c of project.clips) if(c.nodeId===node.id) { const p=clipPose(c,time); result.position[1]+=p.y; result.rotation[1]+=p.rotation; for(const [id,v] of Object.entries(p.bones)) result.bones[id]=(result.bones[id]??0)+v; }
  for (const tr of project.tracks) if(tr.nodeId===node.id) {
    const v=sampleKeys(tr.keys,time); if(v===undefined) continue;
    const [group, axis]=tr.property.split('.');
    if(group==='bone') result.bones[axis]=v;
    else if(group==='position'||group==='rotation'||group==='scale') result[group][{x:0,y:1,z:2}[axis] ?? 0]=v;
  }
  return result;
}
export function cameraAt(project: Project, time: number): Camera { return [...project.shots].reverse().find(s=>time>=s.start && time<s.start+s.duration)?.camera ?? project.camera; }

/** Inverse-distance skinning; four nearest joints, normalized to one. Rig placement is explicit. */
export function skinWeights(point: Vec3, joints: Vec3[]) {
  if (!joints.length) return { indices:[0,0,0,0], weights:[1,0,0,0] };
  const distances=joints.map((j,i)=>({i,d:Math.max(0.0001,(j[0]-point[0])**2+(j[1]-point[1])**2)})).sort((a,b)=>a.d-b.d).slice(0,4);
  const total=distances.reduce((sum,j)=>sum+1/(j.d*j.d),0);
  const indices=[0,0,0,0],weights=[0,0,0,0];
  distances.forEach((j,i)=>{indices[i]=j.i;weights[i]=(1/(j.d*j.d))/total;});
  return {indices,weights};
}
