import * as THREE from 'three';

/** Opt-in rendering mode: procedural material variation, sunlight shadows and
 * screen-space ambient occlusion. No third-party photo textures or false
 * statements about construction materials. Normal mode stays lightweight.
 */
export function createQualityMode(scene:THREE.Scene,camera:THREE.PerspectiveCamera,
  renderer:THREE.WebGLRenderer,exterior:THREE.Group,ground:THREE.Mesh,
  sunlight:THREE.DirectionalLight,ambient:THREE.HemisphereLight,button:HTMLButtonElement){
  let active=false;
  let composer: {render:()=>void;setSize:(w:number,h:number)=>void}|null=null;
  const baseBackground=scene.background;
  const baseFog=scene.fog;
  const baseLightPosition=sunlight.position.clone();
  const baseMaterials=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();
  const originalShadows=new Map<THREE.Mesh,[boolean,boolean]>();
  const procedural=(base:number,variance:number)=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const context=canvas.getContext('2d')!;
    const image=context.createImageData(128,128);
    // Reproducible, subtle aggregate-scale noise; not a photograph of the site.
    let seed=912349;
    for(let i=0;i<128*128;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const grain=(((seed>>>8)%1024)/1023-.5)*variance;
      const c=Math.max(0,Math.min(255,Math.round(base+grain)));
      image.data.set([c,c,c,255],i*4);
    }
    context.putImageData(image,0,0);
    const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(2,2);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return tex;
  };
  const stoneTexture=procedural(239,22),roadTexture=procedural(226,35);
  const upgraded=new Map<THREE.Material,THREE.Material>();
  const setMode=(enabled:boolean)=>{
    const ambientIntensity=enabled?.86:2.0,sunIntensity=enabled?1.55:1.75;
    ambient.intensity=ambientIntensity;sunlight.intensity=sunIntensity;
    sunlight.position.copy(enabled?new THREE.Vector3(75,190,115):baseLightPosition);
    renderer.toneMapping=enabled?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;
    renderer.toneMappingExposure=enabled?1.08:1;
    renderer.shadowMap.enabled=enabled;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene.background=enabled?new THREE.Color('#cbd9d9'):baseBackground;
    scene.fog=enabled?new THREE.Fog('#cbd9d9',330,850):baseFog;
    for(const [mesh,flags] of originalShadows){
      mesh.castShadow=enabled && flags[0];mesh.receiveShadow=enabled && flags[1];
    }
    for(const [mesh,original] of baseMaterials){
      if(!enabled){mesh.material=original;continue;}
      const base=original as THREE.MeshStandardMaterial;
      let enhanced=upgraded.get(base);
      if(!enhanced){
        const material=base.clone();material.map=base.color.getHex() < 0x888888?roadTexture:stoneTexture;
        material.roughness=Math.min(1,base.roughness+.08);
        enhanced=material;upgraded.set(base,enhanced);
      }
      mesh.material=enhanced;
    }
    ground.receiveShadow=enabled;
    sunlight.castShadow=enabled;
    button.classList.toggle('selected',enabled);
    button.textContent=enabled?'高質感 ON · 標準に戻す':'高質感モード';
  };
  exterior.traverse(obj=>{
    if(!(obj instanceof THREE.Mesh))return;
    const name=obj.name;
    const solid=/wall|enclosure|glazed|roof cap|stair|landing|plant|tree|membrane|ridge|facade/i.test(name);
    const floor=/stair|landing|ground|street|roof|plaza|deck|paving/i.test(name);
    originalShadows.set(obj,[solid,floor]);
    if(!(obj.material instanceof THREE.MeshStandardMaterial)||!obj.geometry.getAttribute('uv'))return;
    if(obj.material.transparent || /glass|foliage|tree|plant|roof seam|membrane/i.test(name))return;
    if(obj.material.roughness<.72)return;
    baseMaterials.set(obj,obj.material);
  });
  sunlight.shadow.mapSize.set(2048,2048);
  sunlight.shadow.camera.left=-165;sunlight.shadow.camera.right=165;
  sunlight.shadow.camera.top=165;sunlight.shadow.camera.bottom=-165;
  sunlight.shadow.camera.near=1;sunlight.shadow.camera.far=700;
  sunlight.shadow.bias=-.00015;sunlight.shadow.normalBias=.04;
  // Place light closer to the actual campus; shadow map then resolves stairs.
  sunlight.target.position.set(0,0,-35);
  scene.add(sunlight.target);
  button.addEventListener('click',async()=>{
    active=!active;
    setMode(active);
    if(active && !composer){
      try{
        const [{EffectComposer},{RenderPass},{SSAOPass},{OutputPass}]=await Promise.all([
          import('three/addons/postprocessing/EffectComposer.js'),
          import('three/addons/postprocessing/RenderPass.js'),
          import('three/addons/postprocessing/SSAOPass.js'),
          import('three/addons/postprocessing/OutputPass.js')
        ]);
        const pipeline=new EffectComposer(renderer);
        pipeline.addPass(new RenderPass(scene,camera));
        const ao=new SSAOPass(scene,camera,renderer.domElement.width,renderer.domElement.height,12);
        ao.kernelRadius=8;ao.minDistance=.003;ao.maxDistance=.06;
        pipeline.addPass(ao);pipeline.addPass(new OutputPass());composer=pipeline;
        pipeline.setSize(renderer.domElement.clientWidth,renderer.domElement.clientHeight);
      }catch(err){console.warn('SSAO unavailable; shadow quality still enabled',err);}
    }
  });
  return {get active(){return active;},render(){if(active && composer)composer.render();else renderer.render(scene,camera);},resize(w:number,h:number){composer?.setSize(w,h)}};
}
