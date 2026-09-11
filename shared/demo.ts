import type { Project, SceneNode, Asset } from './model';
import {createAsset,uid} from './templates';
export function createDemo():Project {
  const hero=createAsset('human','Milo · Người lữ hành','#a9bd88');
  const fox=createAsset('fox','Ember · Cáo nhỏ','#d99351');
  const tree=createAsset('tree','Thông · Tầng gần','#496b5f');
  const farTree=createAsset('tree','Thông · Tầng xa','#759083');
  const rock=createAsset('rock','Đá phủ rêu','#81978b');
  const crate=createAsset('crate','Hòm gỗ','#a88b62');
  const node=(id:string,a:Asset,p:SceneNode['position'],s=1):SceneNode=>({id,assetId:a.id,name:a.name,position:p,rotation:[0,0,0],scale:[s,s,s],visible:true,castShadow:true});
  return {schemaVersion:1,revision:0,id:'forest_journey',name:'Lối nhỏ trong rừng',duration:12,fps:24,background:'#bfd1c7',ground:'#93aa97',assets:[hero,fox,tree,farTree,rock,crate],nodes:[node('milo',hero,[-1.25,0,0]),node('ember',fox,[1.05,0,0.25],0.8),node('pine_1',tree,[-4.4,0,-1.5],1.15),node('pine_2',tree,[4.7,0,-2],1.25),node('pine_3',farTree,[-2.9,0,-4.3],0.85),node('pine_4',farTree,[0.2,0,-5],1.1),node('pine_5',farTree,[2.9,0,-4.5],0.8),node('rock_1',rock,[3.1,0,0.4],0.7),node('rock_2',rock,[-3.2,0,0.8],0.5)],clips:[{id:uid('clip'),nodeId:'milo',name:'Nhịp thở',preset:'idle',start:0,duration:12,speed:1,amplitude:1},{id:uid('clip'),nodeId:'milo',name:'Vẫy chào',preset:'wave',start:3,duration:4,speed:0.6,amplitude:0.5},{id:uid('clip'),nodeId:'ember',name:'Bước chân nhẹ',preset:'walk',start:0,duration:12,speed:0.7,amplitude:0.55}],tracks:[],shots:[],camera:{position:[8,6,16],target:[0,1.75,0],fov:36,projection:'orthographic',orthoSize:10},light:{position:[-3,8,5],color:'#fff4dc',intensity:3,ambient:1.6,shadows:true}};
}
