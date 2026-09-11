import type { Asset, Bone, Part, Vec3 } from './model';

export const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-','').slice(0,12)}`;
const bone = (id:string,parent:string|null,position:Vec3):Bone=>({id,parent,position,rotation:0});
export function rigTemplate(type:'human'|'fox'|'prop', width=2, height=3):Bone[] {
  const b = type==='human' ? [bone('root',null,[0,0,0]),bone('hip','root',[0,1.1,0]),bone('torso','hip',[0,0.45,0]),bone('head','torso',[0,0.83,0]),bone('arm_l','torso',[-0.48,0.42,0]),bone('forearm_l','arm_l',[0,-0.5,0]),bone('arm_r','torso',[0.48,0.42,0]),bone('forearm_r','arm_r',[0,-0.5,0]),bone('leg_l','hip',[-0.23,0,0]),bone('shin_l','leg_l',[0,-0.5,0]),bone('leg_r','hip',[0.23,0,0]),bone('shin_r','leg_r',[0,-0.5,0])]
    : type==='fox' ? [bone('root',null,[0,0,0]),bone('body','root',[0,0.68,0]),bone('head','body',[0.63,0.15,0]),bone('tail','body',[-0.65,0.1,0]),bone('front_l','body',[0.43,-0.15,0.06]),bone('front_r','body',[0.28,-0.15,-0.04]),bone('back_l','body',[-0.43,-0.15,0.05]),bone('back_r','body',[-0.28,-0.15,-0.04])]
    : [bone('root',null,[0,0,0])];
  const sx=width/(type==='fox'?2.4:2), sy=height/(type==='fox'?1.5:3);
  return b.map(b=>({...b,position:[b.position[0]*sx,b.position[1]*sy,b.position[2]]}));
}

export function createAsset(template:Asset['template'], name:string, tint='#e7a966'):Asset {
  const parts:Part[]=[];
  const add=(id:string,boneId:string,shape:Part['shape'],position:Vec3,size:Vec3,color:string)=>parts.push({id,bone:boneId,shape,position,size,color});
  let bones:Bone[]=rigTemplate('prop'),kind:Asset['kind']='prop',width=2,height=3;
  if(template==='human') {
    kind='character';bones=rigTemplate('human');
    add('coat','torso','box',[0,0.16,0],[0.85,0.9,0.12],tint);
    add('hem','hip','box',[0,0.2,0.01],[0.85,0.35,0.1],tint);
    add('shirt','torso','box',[0,0.3,0.09],[0.22,0.75,0.04],'#efe8d3');
    add('belt','hip','box',[0,0.19,0.12],[0.8,0.11,0.04],'#73564b');
    add('buckle','hip','box',[0,0.19,0.16],[0.14,0.13,0.04],'#deb15f');
    add('face','head','ellipse',[0,0,0.02],[0.65,0.74,0.14],'#f2c7a0');
    add('hair','head','ellipse',[0,0.28,-0.02],[0.72,0.39,0.12],'#514139');
    add('fringe','head','ellipse',[-0.19,0.2,0.13],[0.31,0.23,0.04],'#514139');
    add('eye_l','head','ellipse',[-0.12,0.02,0.13],[0.045,0.075,0.025],'#333a37');
    add('eye_r','head','ellipse',[0.12,0.02,0.13],[0.045,0.075,0.025],'#333a37');
    add('cheek','head','ellipse',[0.2,-0.12,0.13],[0.1,0.06,0.02],'#df9d87');
    add('scarf','torso','box',[0,0.59,0.15],[0.7,0.17,0.07],'#db7659');
    add('scarf_end','torso','box',[-0.18,0.36,0.15],[0.16,0.44,0.07],'#db7659');
    for(const side of ['l','r']) {
      add(`sleeve_${side}`,`arm_${side}`,'box',[0,-0.23,0],[0.27,0.52,0.12],tint);
      add(`sleeve2_${side}`,`forearm_${side}`,'box',[0,-0.14,0],[0.22,0.33,0.12],tint);
      add(`hand_${side}`,`forearm_${side}`,'ellipse',[0,-0.37,0.02],[0.23,0.28,0.13],'#f2c7a0');
      add(`pants_${side}`,`leg_${side}`,'box',[0,-0.22,-0.015],[0.3,0.55,0.13],'#485b60');
      add(`pants2_${side}`,`shin_${side}`,'box',[0,-0.18,-0.015],[0.26,0.45,0.13],'#485b60');
      add(`boot_${side}`,`shin_${side}`,'box',[0.04,-0.47,0.04],[0.4,0.24,0.19],'#624e43');
    }
  } else if(template==='fox') {
    kind='animal';width=2.4;height=1.5;bones=rigTemplate('fox',width,height);
    add('body','body','ellipse',[0,0,0],[1.47,0.68,0.17],tint);
    add('chest','body','ellipse',[0.39,-0.02,0.13],[0.45,0.53,0.05],'#f7e6c6');
    add('face','head','ellipse',[0.13,0.1,0.08],[0.67,0.6,0.18],tint);
    add('muzzle','head','triangle',[0.38,-0.02,0.15],[0.7,0.35,0.07],'#f7e6c6');
    add('ear_l','head','triangle',[-0.05,0.48,0.05],[0.27,0.5,0.1],tint);
    add('ear_r','head','triangle',[0.3,0.46,0.05],[0.27,0.47,0.1],tint);
    add('ear_inner','head','triangle',[0.3,0.45,0.12],[0.13,0.25,0.04],'#684b45');
    add('eye','head','ellipse',[0.28,0.14,0.19],[0.055,0.08,0.03],'#323e3e');
    add('nose','head','ellipse',[0.66,-0.06,0.18],[0.12,0.1,0.07],'#323e3e');
    add('tail','tail','ellipse',[-0.39,0.08,-0.03],[1.08,0.49,0.12],tint);
    add('tail_tip','tail','ellipse',[-0.73,0.08,0.02],[0.43,0.39,0.12],'#f7e6c6');
    for(const name of ['front_l','front_r','back_l','back_r']) {
      add(name,name,'box',[0,-0.2,0],[0.16,0.49,0.12],tint);
      add(`${name}_paw`,name,'box',[0.05,-0.43,0.01],[0.26,0.16,0.15],'#624c43');
    }
  } else if(template==='tree') {
    height=5;width=3;
    add('trunk','root','box',[0,1.3,0],[0.24,2.6,0.18],'#766958');
    add('pine_low','root','triangle',[0,2.15,0.08],[2.3,2.4,0.12],tint);
    add('pine_mid','root','triangle',[0,3.1,0.1],[1.82,2.3,0.12],tint);
    add('pine_top','root','triangle',[0,4.0,0.12],[1.3,2.1,0.12],tint);
  } else if(template==='rock') {
    width=1.8;height=1;
    add('rock','root','ellipse',[0,0.34,0],[1.6,0.85,0.45],tint);
    add('highlight','root','ellipse',[-0.25,0.46,0.27],[0.64,0.38,0.04],'#a5bbb1');
  } else if(template==='crate') {
    width=1;height=1;
    add('box','root','box',[0,0.5,0],[1,1,0.65],tint);
    for(let i=0;i<3;i++) add(`plank${i}`,'root','box',[0,0.17+i*0.33,0.34],[0.93,0.04,0.025],'#665543');
    add('band_l','root','box',[-0.33,0.5,0.36],[0.08,0.94,0.035],'#d4b47a');
    add('band_r','root','box',[0.33,0.5,0.36],[0.08,0.94,0.035],'#d4b47a');
  }
  return {id:uid('asset'),name,kind,template,color:tint,bones,parts,width,height,rigged:true};
}
