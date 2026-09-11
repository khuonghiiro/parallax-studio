import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cameraAt, evaluateNode, radians, skinWeights } from '../../shared/animation';
import type { Asset, Camera, Project, SceneNode, Vec3 } from '../../shared/model';

type Entry = { group:THREE.Group; bones:Map<string,THREE.Bone>; assetKey:string; helper?:THREE.SkeletonHelper; mixer?:THREE.AnimationMixer; animations?:THREE.AnimationClip[]; ready:Promise<void> };
export class Stage {
  readonly renderer:THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly perspective=new THREE.PerspectiveCamera(36,16/9,0.05,500);
  readonly orthographic=new THREE.OrthographicCamera(-8,8,4.5,-4.5,0.05,500);
  camera:THREE.Camera=this.orthographic;
  readonly orbit:OrbitControls;
  readonly transform:TransformControls;
  private entries=new Map<string,Entry>();
  private light=new THREE.DirectionalLight('#fff4dc',3);
  private ambient=new THREE.HemisphereLight('#e7f4ef','#657765',1.6);
  private floor:THREE.Mesh;
  private grid=new THREE.GridHelper(30,30,'#739384','#859e90');
  private project?:Project;
  private selected:string|null=null;
  private size={width:1280,height:720};
  private observer:ResizeObserver;
  private dirty=true;
  private disposed=false;
  private rig=false;
  private orbiting=false;
  private exporting=false;
  private dragging=false;
  private lastTime=-1;
  private lastCamera='';
  private onPick:(id:string|null)=>void;
  private onTransform:(id:string,patch:Partial<SceneNode>)=>void;
  private onError:(message:string)=>void;
  private pointerStart=[0,0];
  constructor(private host:HTMLElement,callbacks:{onPick:(id:string|null)=>void;onTransform:(id:string,patch:Partial<SceneNode>)=>void;onError:(message:string)=>void}) {
    this.onPick=callbacks.onPick;this.onTransform=callbacks.onTransform;this.onError=callbacks.onError;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.renderer.domElement.setAttribute('aria-label','Khung dựng cảnh hoạt hình 2.5D');
    this.host.appendChild(this.renderer.domElement);
    this.scene.add(this.ambient,this.light,this.light.target);
    this.light.castShadow=true;this.light.shadow.mapSize.set(2048,2048);this.light.shadow.camera.left=-15;this.light.shadow.camera.right=15;this.light.shadow.camera.top=15;this.light.shadow.camera.bottom=-15;this.light.shadow.camera.near=0.1;this.light.shadow.camera.far=60;this.light.shadow.normalBias=0.015;this.light.shadow.bias=-0.0002;
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#93aa97',roughness:1}));this.floor.rotation.x=-Math.PI/2;this.floor.position.y=-0.04;this.floor.receiveShadow=true;this.scene.add(this.floor);
    this.grid.position.y=-0.025;this.grid.visible=false;this.scene.add(this.grid);
    this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.enableDamping=true;this.orbit.enabled=false;this.orbit.maxPolarAngle=Math.PI*0.49;this.orbit.minDistance=2;this.orbit.maxDistance=60;this.orbit.addEventListener('change',()=>{this.dirty=true;});
    this.transform=new TransformControls(this.camera,this.renderer.domElement);this.transform.setSize(0.7);this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('dragging-changed',(event)=>{this.dragging=Boolean(event.value);this.orbit.enabled=this.orbiting&&!this.dragging;if(!this.dragging&&this.selected){const obj=this.entries.get(this.selected)?.group;if(obj)this.onTransform(this.selected,{position:obj.position.toArray(),rotation:[obj.rotation.x*180/Math.PI,obj.rotation.y*180/Math.PI,obj.rotation.z*180/Math.PI],scale:obj.scale.toArray()});}this.dirty=true;});
    this.transform.addEventListener('change',()=>{this.dirty=true;});
    this.renderer.domElement.addEventListener('pointerdown',this.pointerDown);
    this.renderer.domElement.addEventListener('pointerup',this.pointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  }
  private contextLost=(e:Event)=>{e.preventDefault();this.onError('GPU đã mất kết nối. Lưu dự án rồi tải lại giao diện.');};
  private pointerDown=(e:PointerEvent)=>{this.pointerStart=[e.clientX,e.clientY];};
  private pointerUp=(e:PointerEvent)=>{
    if(this.exporting||this.dragging||this.transform.axis||e.button!==0||Math.hypot(e.clientX-this.pointerStart[0],e.clientY-this.pointerStart[1])>4)return;
    const r=this.renderer.domElement.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);
    const hit=ray.intersectObjects([...this.entries.values()].filter(e=>e.group.visible).map(e=>e.group),true).find(h=>!(h.object instanceof THREE.SkeletonHelper));
    let object:THREE.Object3D|undefined=hit?.object;while(object&&!object.userData.nodeId)object=object.parent??undefined;
    this.onPick(object?.userData.nodeId??null);
  };
  private resize(){if(this.exporting)return;this.size={width:Math.max(1,this.host.clientWidth),height:Math.max(1,this.host.clientHeight)};this.renderer.setSize(this.size.width,this.size.height);this.dirty=true;this.lastCamera='';}
  setProject(project:Project){
    this.project=project;this.scene.background=new THREE.Color(project.background);this.scene.fog=new THREE.Fog(project.background,22,75);
    (this.floor.material as THREE.MeshStandardMaterial).color.set(project.ground);
    this.light.position.fromArray(project.light.position);this.light.color.set(project.light.color);this.light.intensity=project.light.intensity;this.light.castShadow=project.light.shadows;this.renderer.shadowMap.enabled=project.light.shadows;this.ambient.intensity=project.light.ambient;
    const ids=new Set(project.nodes.map(n=>n.id));
    for(const [id,entry]of this.entries)if(!ids.has(id)){this.disposeEntry(entry);this.entries.delete(id);}
    for(const node of project.nodes){
      const asset=project.assets.find(a=>a.id===node.assetId)!;const key=JSON.stringify(asset);let entry=this.entries.get(node.id);
      if(!entry||entry.assetKey!==key){if(entry)this.disposeEntry(entry);entry={group:new THREE.Group(),bones:new Map(),assetKey:key,ready:Promise.resolve()};entry.group.userData.nodeId=node.id;this.entries.set(node.id,entry);this.scene.add(entry.group);entry.ready=this.build(entry,asset,node).catch(e=>{if(!this.disposed)this.onError(`${asset.name}: ${e instanceof Error?e.message:String(e)}`);throw e;});void entry.ready.catch(()=>{});}
      entry.group.visible=node.visible;entry.group.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=node.castShadow;o.receiveShadow=true;}});
    }
    this.select(this.selected);this.dirty=true;
  }
  private async build(entry:Entry,asset:Asset,node:SceneNode){
    if(asset.kind==='model'&&asset.source){
      const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(url.startsWith('blob:')||url===asset.source||url===new URL(asset.source,location.origin).href)return url;throw new Error('Model yêu cầu tài nguyên ngoài GLB. Hãy đóng gói texture vào GLB.');});
      const gltf=await new GLTFLoader(manager).loadAsync(asset.source);
      if(this.disposed||this.entries.get(node.id)!==entry){disposeObject(gltf.scene);return;}
      const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const scale=asset.height/Math.max(size.y,0.001);const model=new THREE.Group();gltf.scene.position.set(-center.x,-bounds.min.y,-center.z);model.add(gltf.scene);model.scale.setScalar(scale);entry.group.add(model);
      gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=node.castShadow;o.receiveShadow=true;}if(o instanceof THREE.Bone)entry.bones.set(o.name,o);});
      entry.mixer=new THREE.AnimationMixer(gltf.scene);entry.animations=gltf.animations;
    } else {
      for(const b of asset.bones){const obj=new THREE.Bone();obj.name=b.id;obj.position.fromArray(b.position);obj.rotation.z=radians(b.rotation);entry.bones.set(b.id,obj);}
      for(const b of asset.bones){const obj=entry.bones.get(b.id)!;if(b.parent)entry.bones.get(b.parent)?.add(obj);else entry.group.add(obj);}
      if(asset.kind==='sprite'&&asset.source){
        const texture=await new THREE.TextureLoader().loadAsync(asset.source);
        if(this.disposed||this.entries.get(node.id)!==entry){texture.dispose();return;}
        texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
        const geometry=new THREE.PlaneGeometry(asset.width,asset.height,24,32);geometry.translate(0,asset.height/2,0);
        const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:0.35,side:THREE.DoubleSide,roughness:0.9});
        if(asset.rigged&&asset.bones.length){
          entry.group.updateMatrixWorld(true);const bones=[...entry.bones.values()];const joints=bones.map(b=>b.getWorldPosition(new THREE.Vector3()).toArray());
          const vertices=geometry.getAttribute('position');const indices:number[]=[],weights:number[]=[];
          for(let i=0;i<vertices.count;i++){const skin=skinWeights([vertices.getX(i),vertices.getY(i),vertices.getZ(i)],joints);indices.push(...skin.indices);weights.push(...skin.weights);}
          geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
          const mesh=new THREE.SkinnedMesh(geometry,material);entry.group.add(mesh);const skeleton=new THREE.Skeleton(bones);mesh.bind(skeleton);mesh.frustumCulled=false;mesh.castShadow=node.castShadow;mesh.receiveShadow=true;
          mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:texture,alphaTest:0.35,side:THREE.DoubleSide});
        }else{const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=node.castShadow;mesh.receiveShadow=true;entry.group.add(mesh);}
      }else{
        for(const part of asset.parts){
          let geometry:THREE.BufferGeometry;
          if(part.shape==='ellipse')geometry=new THREE.SphereGeometry(0.5,24,12);
          else if(part.shape==='triangle'){const s=new THREE.Shape();s.moveTo(-0.5,-0.5);s.lineTo(0.5,-0.5);s.lineTo(0,0.5);s.closePath();geometry=new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false});geometry.translate(0,0,-0.5);}
          else geometry=new THREE.BoxGeometry(1,1,1);
          const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:part.color,roughness:1,side:THREE.DoubleSide}));mesh.position.fromArray(part.position);mesh.scale.fromArray(part.size);mesh.castShadow=node.castShadow;mesh.receiveShadow=true;entry.bones.get(part.bone)?.add(mesh);
        }
      }
    }
    if(entry.bones.size){entry.helper=new THREE.SkeletonHelper(entry.group);const m=entry.helper.material as THREE.LineBasicMaterial;m.depthTest=false;m.color.set('#dbff9e');m.transparent=true;m.opacity=0.95;entry.helper.renderOrder=10;entry.helper.visible=this.rig&&this.selected===node.id;this.scene.add(entry.helper);}
    this.select(this.selected);this.dirty=true;
  }
  select(id:string|null){this.selected=id;this.transform.detach();for(const [key,e]of this.entries){if(e.helper)e.helper.visible=this.rig&&id===key;}if(id&&!this.exporting){const entry=this.entries.get(id);if(entry?.group.visible)this.transform.attach(entry.group);}this.dirty=true;}
  setTool(tool:'select'|'translate'|'rotate'|'scale'){this.transform.enabled=tool!=='select';this.transform.getHelper().visible=tool!=='select';if(tool!=='select')this.transform.setMode(tool);this.dirty=true;}
  setRig(show:boolean){this.rig=show;this.select(this.selected);}
  setGrid(show:boolean){this.grid.visible=show;this.dirty=true;}
  setOrbit(enabled:boolean){this.orbiting=enabled;this.orbit.enabled=enabled;this.lastCamera='';this.dirty=true;}
  getCamera():Camera {return {position:(this.camera.position.toArray()) as Vec3,target:this.orbit.target.toArray(),fov:this.perspective.fov,projection:this.camera===this.perspective?'perspective':'orthographic',orthoSize:this.project?.camera.orthoSize??10};}
  private configureCamera(c:Camera){
    const signature=JSON.stringify([c,this.size.width,this.size.height]);if(signature===this.lastCamera)return;this.lastCamera=signature;
    const aspect=this.size.width/this.size.height;
    this.perspective.aspect=aspect;this.perspective.fov=c.fov;this.perspective.updateProjectionMatrix();
    this.orthographic.left=-c.orthoSize*aspect/2;this.orthographic.right=c.orthoSize*aspect/2;this.orthographic.top=c.orthoSize/2;this.orthographic.bottom=-c.orthoSize/2;this.orthographic.updateProjectionMatrix();
    this.camera=c.projection==='perspective'?this.perspective:this.orthographic;this.camera.position.fromArray(c.position);this.camera.lookAt(new THREE.Vector3(...c.target));this.orbit.object=this.camera;this.orbit.target.fromArray(c.target);this.transform.camera=this.camera;this.camera.updateMatrixWorld();
  }
  draw(time:number,force=false){
    if(!this.project||this.disposed)return;this.orbit.update();
    if(!force&&!this.dirty&&time===this.lastTime)return;
    if(!this.orbiting||this.exporting)this.configureCamera(cameraAt(this.project,time));else if(!this.lastCamera)this.configureCamera(this.project.camera);
    for(const node of this.project.nodes){const entry=this.entries.get(node.id);if(!entry)continue;
      if(!(this.dragging&&node.id===this.selected)){
        const pose=evaluateNode(this.project,node,time);entry.group.position.fromArray(pose.position);entry.group.rotation.set(...pose.rotation.map(radians) as Vec3);entry.group.scale.fromArray(pose.scale);
        const asset=this.project.assets.find(a=>a.id===node.assetId)!;
        for(const b of asset.bones){const bone=entry.bones.get(b.id);if(bone)bone.rotation.z=radians(b.rotation+(pose.bones[b.id]??0));}
        if(entry.mixer){entry.mixer.stopAllAction();const clip=this.project.clips.find(c=>c.nodeId===node.id&&c.preset==='gltf'&&time>=c.start&&time<c.start+c.duration);if(clip&&entry.animations?.length){const action=entry.mixer.clipAction(entry.animations[0]);action.play();entry.mixer.setTime((time-clip.start)*clip.speed);}}
      }
    }
    this.renderer.render(this.scene,this.camera);this.dirty=false;this.lastTime=time;
  }
  async ready(){await Promise.all([...this.entries.values()].map(e=>e.ready));}
  async beginExport(width:number,height:number){await this.ready();this.exporting=true;this.orbit.enabled=false;this.grid.visible=false;this.transform.getHelper().visible=false;for(const e of this.entries.values())if(e.helper)e.helper.visible=false;this.renderer.setPixelRatio(1);this.size={width,height};this.renderer.setSize(width,height,false);this.lastCamera='';}
  endExport(){this.exporting=false;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));this.resize();this.orbit.enabled=this.orbiting;this.select(this.selected);this.dirty=true;}
  async png(time:number){this.draw(time,true);return new Promise<Blob>((resolve,reject)=>this.renderer.domElement.toBlob(b=>b?resolve(b):reject(new Error('Không thể đọc frame GPU')),'image/png'));}
  private disposeEntry(entry:Entry){if(this.transform.object===entry.group)this.transform.detach();entry.mixer?.stopAllAction();entry.mixer?.uncacheRoot(entry.mixer.getRoot());if(entry.helper){entry.helper.removeFromParent();entry.helper.dispose();}entry.group.removeFromParent();disposeObject(entry.group);}
  dispose(){this.disposed=true;this.observer.disconnect();this.renderer.domElement.removeEventListener('pointerdown',this.pointerDown);this.renderer.domElement.removeEventListener('pointerup',this.pointerUp);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.orbit.dispose();this.transform.dispose();for(const e of this.entries.values())this.disposeEntry(e);disposeObject(this.scene);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
function disposeObject(root:THREE.Object3D){const materials=new Set<THREE.Material>();const textures=new Set<THREE.Texture>();root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.customDepthMaterial)materials.add(o.customDepthMaterial);if(o instanceof THREE.SkinnedMesh)o.skeleton.dispose();}});for(const m of materials){for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);m.dispose();}for(const t of textures)t.dispose();}
