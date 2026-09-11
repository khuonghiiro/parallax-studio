import type {Asset,Bone} from '../../shared/model';
import {radians} from '../../shared/animation';
export function AssetPreview({asset}:{asset:Asset}){
  if(asset.source&&asset.kind==='sprite')return <img className="asset-image" src={asset.source} alt={asset.name}/>;
  if(asset.kind==='model')return <svg viewBox="0 0 100 85" aria-hidden="true"><path d="m50 12 30 17v34L50 80 20 63V29z" fill="#607596"/><path d="m50 12 30 17-30 18-30-18z" fill="#a6b9d6"/><path d="M50 47v33l30-17V29z" fill="#748cad"/><path d="M50 47v33M20 29l30 18 30-18" stroke="#c9d5e7" fill="none"/></svg>;
  const bones=new Map(asset.bones.map(b=>[b.id,b]));
  const world=(b:Bone):{x:number;y:number;angle:number}=>{if(!b.parent)return{x:b.position[0],y:b.position[1],angle:b.rotation};const p=world(bones.get(b.parent)!);return{x:p.x+b.position[0]*Math.cos(radians(p.angle))-b.position[1]*Math.sin(radians(p.angle)),y:p.y+b.position[0]*Math.sin(radians(p.angle))+b.position[1]*Math.cos(radians(p.angle)),angle:p.angle+b.rotation};};
  const width=asset.width*1.5,height=asset.height*1.13;
  return <svg viewBox={`${-width/2} ${-height} ${width} ${height+0.1}`} aria-hidden="true"><g transform="scale(1,-1)">{[...asset.parts].sort((a,b)=>a.position[2]-b.position[2]).map(part=>{const bone=bones.get(part.bone);if(!bone)return null;const t=world(bone);return <g key={part.id} transform={`translate(${t.x} ${t.y}) rotate(${t.angle}) translate(${part.position[0]} ${part.position[1]})`} fill={part.color}>{part.shape==='ellipse'?<ellipse rx={part.size[0]/2} ry={part.size[1]/2}/>:part.shape==='triangle'?<polygon points={`${-part.size[0]/2},${-part.size[1]/2} ${part.size[0]/2},${-part.size[1]/2} 0,${part.size[1]/2}`}/>:<rect x={-part.size[0]/2} y={-part.size[1]/2} width={part.size[0]} height={part.size[1]} rx={Math.min(part.size[0],part.size[1])*0.12}/>}</g>})}</g></svg>;
}
