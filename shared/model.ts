import { z } from 'zod';

export const vector = z.tuple([z.number().finite().min(-10000).max(10000), z.number().finite().min(-10000).max(10000), z.number().finite().min(-10000).max(10000)]);
export const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const boneSchema = z.object({ id, parent: id.nullable(), position: vector, rotation: z.number().finite().min(-3600).max(3600).default(0) }).strict();
export const partSchema = z.object({ id, bone: id, shape: z.enum(['ellipse','box','triangle']), position: vector, size: vector, color }).strict();
export const assetSchema = z.object({ id, name: z.string().min(1).max(120), kind: z.enum(['character','animal','prop','sprite','model']), template: z.enum(['human','fox','tree','rock','crate','custom']), color, bones: z.array(boneSchema).max(128), parts: z.array(partSchema).max(512), source: z.string().max(200).optional(), width: z.number().positive().max(100).default(2), height: z.number().positive().max(100).default(3), rigged: z.boolean().default(false) }).strict();
export const nodeSchema = z.object({ id, assetId: id, name: z.string().min(1).max(120), position: vector, rotation: vector, scale: vector, visible: z.boolean(), castShadow: z.boolean() }).strict();
export const keySchema = z.object({ time: z.number().min(0).max(600), value: z.number().finite().min(-10000).max(10000), easing: z.enum(['linear','smooth','step']).default('smooth') }).strict();
export const trackSchema = z.object({ id, nodeId: id, property: z.string().min(1).max(150), keys: z.array(keySchema).max(2000) }).strict();
export const clipSchema = z.object({ id, nodeId: id, name: z.string().max(120), preset: z.enum(['idle','walk','run','wave','bounce','spin','gltf']), start: z.number().min(0).max(600), duration: z.number().positive().max(600), speed: z.number().positive().max(10), amplitude: z.number().min(0).max(5) }).strict();
export const cameraSchema = z.object({ position: vector, target: vector, fov: z.number().min(15).max(100), projection: z.enum(['perspective','orthographic']), orthoSize: z.number().min(2).max(50) }).strict();
export const lightSchema = z.object({ position: vector, color, intensity: z.number().min(0).max(15), ambient: z.number().min(0).max(5), shadows: z.boolean() }).strict();
export const shotSchema = z.object({ id, name: z.string().min(1).max(120), start: z.number().min(0).max(600), duration: z.number().positive().max(600), camera: cameraSchema }).strict();
export const projectSchema = z.object({ schemaVersion: z.literal(1), revision: z.number().int().min(0), id, name: z.string().min(1).max(120), duration: z.number().min(1).max(600), fps: z.number().int().min(12).max(60), background: color, ground: color, assets: z.array(assetSchema).max(500), nodes: z.array(nodeSchema).max(500), clips: z.array(clipSchema).max(2000), tracks: z.array(trackSchema).max(5000), shots: z.array(shotSchema).max(300), camera: cameraSchema, light: lightSchema }).strict();
export type Bone = z.infer<typeof boneSchema>;
export type Part = z.infer<typeof partSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type SceneNode = z.infer<typeof nodeSchema>;
export type Keyframe = z.infer<typeof keySchema>;
export type Track = z.infer<typeof trackSchema>;
export type Clip = z.infer<typeof clipSchema>;
export type Camera = z.infer<typeof cameraSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Vec3 = z.infer<typeof vector>;
export type Command = { op: string; [key: string]: unknown };
export type RenderJob = { id: string; status: 'queued'|'rendering'|'encoding'|'complete'|'failed'; width: number; height: number; fps: number; duration: number; frames: number; totalFrames: number; project: Project; error?: string; url?: string };

export function validateRelations(p: Project) {
  const unique = (values: {id:string}[]) => { if (new Set(values.map(v=>v.id)).size !== values.length) throw new Error('ID trùng lặp'); };
  [p.assets,p.nodes,p.clips,p.tracks,p.shots].forEach(unique);
  for (const a of p.assets) {
    unique(a.bones); unique(a.parts);
    const bones = new Map(a.bones.map(b=>[b.id,b]));
    for (const b of a.bones) {
      const seen = new Set([b.id]); let parent = b.parent;
      while (parent) { if (seen.has(parent) || !bones.has(parent)) throw new Error('Cây xương không hợp lệ'); seen.add(parent); parent = bones.get(parent)!.parent; }
    }
    for (const part of a.parts) if (!bones.has(part.bone)) throw new Error('Lớp vẽ tham chiếu xương không tồn tại');
    if (a.source && !/^\/media\/[a-zA-Z0-9_-]+\.(png|webp|jpg|glb)$/.test(a.source)) throw new Error('Nguồn asset không hợp lệ');
  }
  for (const n of p.nodes) if (!p.assets.some(a=>a.id===n.assetId)) throw new Error('Asset không tồn tại');
  for (const c of p.clips) if (!p.nodes.some(n=>n.id===c.nodeId) || c.start+c.duration>p.duration+1e-6) throw new Error('Clip vượt phạm vi cảnh');
  for (const t of p.tracks) {
    const n = p.nodes.find(n=>n.id===t.nodeId); if (!n) throw new Error('Track thiếu đối tượng');
    const property = /^(position|rotation|scale)\.[xyz]$/.test(t.property) || (t.property.startsWith('bone.') && t.property.endsWith('.rotation') && p.assets.find(a=>a.id===n.assetId)!.bones.some(b=>`bone.${b.id}.rotation`===t.property));
    if (!property) throw new Error('Thuộc tính keyframe không hợp lệ');
    if (t.keys.some((k,i)=>k.time>p.duration || (i>0 && t.keys[i-1].time>=k.time))) throw new Error('Keyframe phải tăng dần và nằm trong cảnh');
  }
  for(const shot of p.shots) if(shot.start+shot.duration>p.duration+1e-6) throw new Error('Shot vượt phạm vi cảnh');
  return p;
}
