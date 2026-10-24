'use client';
import {useEffect,useRef} from 'react';
import type {Motion} from './battle-presentation';
import {effectAssets,flamethrowerBeam,moveAnimationPlan,type EffectPoint} from './move-animation-plan';
import {assetRegistry} from '../assets/registry';
import {loadAssetImage} from '../assets/load-image';

const images=new Map<string,HTMLImageElement>();
let loading:Promise<void>|undefined;
function preload(){
  const assets=[...effectAssets.map(asset=>({asset,url:assetRegistry.moveEffect(asset)})),flamethrowerBeam];
  return loading ??= Promise.all(assets.map(async({asset,url})=>{
    const image=await loadAssetImage(url);if(image)images.set(asset,image);
  })).then(()=>{});
}
type Position={x:number;y:number};
const interpolate=(a:number,b:number,t:number)=>a+(b-a)*t;

export function MoveVisuals({motion,speed=1}:{motion:Motion|null;speed?:number}){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{void preload();},[]);
  useEffect(()=>{
    const element=canvas.current,arena=element?.closest<HTMLElement>('.arena');
    if(!element||!arena)return;
    const context=element.getContext('2d');if(!context)return;
    context.clearRect(0,0,element.width,element.height);
    if(motion?.kind!=='move'||!motion.move)return;
    const blocked=motion.blocked;
    const plan=moveAnimationPlan(motion.move,motion.color,motion.category?{category:motion.category}:undefined),reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    let cancelled=false,frame=0;const animations:Animation[]=[];
    const bounds=arena.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
    element.width=Math.round(bounds.width*ratio);element.height=Math.round(bounds.height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    const unit=Math.max(18,Math.min(72,bounds.width*.07,bounds.height*.14));
    function position(side:'player'|'enemy'):Position {
      const sprite=arena!.querySelector<HTMLElement>(`.${side}-position .sprite .pokemon-image-frame img`) ?? arena!.querySelector<HTMLElement>(`.${side}-position .sprite`);
      const box=sprite?.getBoundingClientRect();
      return box?{x:box.x-bounds.x+box.width/2,y:box.y-bounds.y+box.height*.55}:{x:bounds.width*(side==='player'?.26:.75),y:bounds.height*(side==='player'?.7:.4)};
    }
    const source=position(motion.side),target=position(motion.targetSide ?? (motion.side==='player'?'enemy':'player'));
    if(motion.missed){target.x+=unit*1.4;target.y-=unit*.4;}
    const locate=(p:EffectPoint)=>({x:(p.anchor==='source'?source:target).x+p.x*unit,y:(p.anchor==='source'?source:target).y+p.y*unit});
    const began=performance.now();
    const sprite=arena.querySelector<HTMLImageElement>(`.${motion.side}-position .pokemon-image-frame img`);
    const cloneImage=sprite;
    if(!reduced) {
      const attacker=arena.querySelector<HTMLElement>(`.${motion.side}-position .motion-wrap`);
      const dx=(target.x-source.x)*(plan.contact?.42:.035),dy=(target.y-source.y)*(plan.contact?.42:.035);
      const movement=plan.presentation.pokemonMotion;
      if(attacker&&['Dash','FastDash','Jump','Spin','Disappear'].includes(movement)){
        const action=movement==='Jump'?`translate(${dx}px,${dy-unit*.8}px)`:movement==='Spin'?`translate(${dx}px,${dy}px) rotate(360deg)`:`translate(${dx}px,${dy}px)`;
        animations.push(attacker.animate([{transform:'translate(0,0)',opacity:1,offset:0},{transform:action,opacity:movement==='Disappear'?.15:1,offset:movement==='FastDash'?.2:.4},{transform:action,opacity:1,offset:.53},{transform:'translate(0,0)',opacity:1,offset:1}],{duration:plan.duration,easing:movement==='FastDash'?'ease-out':'ease-in-out'}));
      }
      const shake=plan.presentation.screenEffect;
      if(shake==='ShakeSmall'||shake==='ShakeLarge'){
        const distance=shake==='ShakeLarge'?unit*.12:unit*.045;
        animations.push(arena.animate([{transform:'translate(0,0)'},{transform:`translate(${distance}px,2px)`},{transform:`translate(${-distance}px,-2px)`},{transform:'translate(0,0)'}],{delay:plan.presentation.impactAt,duration:280}));
      }
      if(plan.presentation.specialSequence==='Earthquake')for(const participant of arena.querySelectorAll<HTMLElement>('.motion-wrap'))animations.push(participant.animate([{transform:'translateY(0)'},{transform:'translateY(-4px)'},{transform:'translateY(3px)'},{transform:'translateY(0)'}],{delay:180,duration:450}));
      const defender=arena.querySelector<HTMLElement>(`.${motion.targetSide ?? (motion.side==='player'?'enemy':'player')}-position .motion-wrap`);
      if(defender&&!motion.missed&&!motion.blocked&&plan.offensive&&plan.presentation.targetEffect!=='None'&&plan.presentation.specialSequence!=='Earthquake')animations.push(defender.animate([{transform:'translateX(0)'},{transform:`translateX(${unit*.13}px)`},{transform:`translateX(${-unit*.13}px)`},{transform:'translateX(0)'}],{delay:plan.presentation.impactAt,duration:240}));
      // WAAPI animations created here may appear after the parent scheduler's
      // effect. Set the rate here too so Canvas and sprite motion cannot drift.
      animations.forEach(animation=>animation.updatePlaybackRate(speed));
    }
    function draw(elapsed:number){
      context!.clearRect(0,0,bounds.width,bounds.height);
      if(plan.style==='clone'||plan.presentation.pokemonMotion==='FastDash'){
        const spread=reduced?.65:Math.sin(Math.PI*Math.min(1,elapsed/plan.duration));
        if(cloneImage?.complete&&cloneImage.naturalWidth>0){
          const box=cloneImage.getBoundingClientRect();
          for(const direction of [-1,1]){
            context!.save();context!.globalAlpha=.32*spread;
            context!.drawImage(cloneImage,source.x-box.width/2+direction*unit*spread,source.y-box.height*.55,box.width,box.height);context!.restore();
          }
        }
      }
      if(plan.style==='soundwave')for(let i=0;i<3;i++){
        const t=reduced?.5:(elapsed/plan.duration-i*.16);if(t<0||t>1)continue;
        context!.save();context!.strokeStyle='#e5f1ff';context!.globalAlpha=(1-t)*.7;context!.lineWidth=unit*.045;
        context!.beginPath();context!.ellipse(interpolate(source.x,target.x,t),interpolate(source.y,target.y,t),unit*(.25+t*.8),unit*(.35+t),0,0,Math.PI*2);context!.stroke();context!.restore();
      }
      if(plan.wash&&!reduced){context!.globalAlpha=.12*Math.sin(Math.PI*Math.min(1,elapsed/plan.duration));context!.fillStyle=plan.wash;context!.fillRect(0,0,bounds.width,bounds.height);context!.globalAlpha=1;}
      const beamImage=plan.beam?images.get(plan.beam.asset):undefined;
      if(plan.beam&&beamImage&&elapsed>=plan.beam.start&&elapsed<plan.beam.end){
        const beam=plan.beam;
        const growth=Math.max(0,Math.min(1,(elapsed-beam.start)/(beam.extended-beam.start)));
        const length=reduced?1:.06+.94*(1-(1-growth)**3);
        const fade=reduced?1:Math.max(0,Math.min(1,(beam.end-elapsed)/(beam.end-beam.fade)));
        const dx=beam.tip.x-beam.origin.x,dy=beam.tip.y-beam.origin.y;
        const distance=Math.hypot(target.x-source.x,target.y-source.y),nativeLength=Math.hypot(dx,dy);
        // Rotate the PNG's diagonal into beam-local coordinates, then stretch
        // along the attack axis. The tail stays anchored to the attacker.
        context!.save();context!.imageSmoothingEnabled=false;
        context!.globalAlpha=reduced?.65:Math.min(1,(elapsed-beam.start)/55)*fade;
        context!.translate(source.x,source.y);context!.rotate(Math.atan2(target.y-source.y,target.x-source.x));
        context!.scale(distance/nativeLength*length,unit*.85/240*(reduced?1:(.35+.65*growth)*(.7+.3*fade)));
        context!.rotate(-Math.atan2(dy,dx));context!.translate(-beam.origin.x,-beam.origin.y);
        context!.drawImage(beamImage,0,0);context!.restore();
      }
      if(!beamImage&&['flame','blueflame','icebeam','greenbeam','dragonbeam','waterbeam','beam'].includes(plan.style)&&elapsed>100&&elapsed<720&&!reduced){
        const t=Math.min(1,(elapsed-100)/380),x=interpolate(source.x,target.x,t),y=interpolate(source.y,target.y,t);
        const color=plan.style==='flame'?'#ff942d':plan.style==='blueflame'?'#68aaff':plan.style==='icebeam'?'#c5f7ff':plan.style==='greenbeam'?'#c7ff8a':plan.style==='waterbeam'?'#84dcff':plan.style==='dragonbeam'?'#90a4ff':'#fff5c0';
        context!.save();context!.globalAlpha=Math.min(1,(720-elapsed)/130)*.7;context!.strokeStyle=color;context!.lineWidth=unit*.22;context!.lineCap='round';context!.shadowColor=color;context!.shadowBlur=unit*.25;context!.beginPath();context!.moveTo(source.x,source.y);context!.lineTo(x,y);context!.stroke();context!.restore();
      }
      if(plan.lightning&&!reduced){
        for(let i=0;i<3;i++){const t=elapsed-(130+i*200);if(t<0||t>190)continue;
          context!.save();context!.strokeStyle='#ffed89';context!.lineWidth=unit*.10;context!.shadowColor='#ffffb2';context!.shadowBlur=unit*.3;context!.globalAlpha=.85*(1-t/210);context!.beginPath();
          for(let j=0;j<8;j++){const x=target.x+(i-1)*unit*.35+(j%2?1:-1)*unit*(.25+Math.sin(j*7+i)*.2),y=target.y-unit*3.8+j/7*unit*3.8;if(j===0)context!.moveTo(x,y);else context!.lineTo(x,y);}context!.stroke();context!.restore();
        }
      }
      for(const particle of plan.particles){
        if(plan.beam&&(blocked||motion!.missed))continue;
        if(blocked&&(particle.asset==='impact'||particle.asset==='hitmarker'))continue;
        const t=(elapsed-particle.start)/(particle.end-particle.start);if(t<0||t>1)continue;
        const image=images.get(particle.asset);if(!image)continue;
        const from=locate(particle.from),to=locate(particle.to),eased=1-(1-t)**2;
        const x=interpolate(from.x,to.x,eased),y=interpolate(from.y,to.y,eased)+Math.sin(Math.PI*t)*particle.arc*unit;
        const size=unit*particle.size*interpolate(1,particle.grow,eased),aspect=image.naturalHeight/image.naturalWidth;
        context!.save();context!.globalAlpha=particle.opacity*Math.min(1,t/.1,(1-t)/.27);context!.translate(x,y);context!.rotate(particle.rotate*t*Math.PI/180);context!.drawImage(image,-size/2,-size*aspect/2,size,size*aspect);context!.restore();
      }
    }
    void preload().then(()=>{
      if(cancelled)return;
      if(reduced){draw(Math.min(500,plan.duration*.55));return;}
      const tick=()=>{if(cancelled)return;const elapsed=(performance.now()-began)*speed;draw(elapsed);if(elapsed<plan.duration)frame=requestAnimationFrame(tick);else context.clearRect(0,0,bounds.width,bounds.height);};
      frame=requestAnimationFrame(tick);
    });
    return ()=>{cancelled=true;cancelAnimationFrame(frame);animations.forEach(animation=>animation.cancel());context.clearRect(0,0,bounds.width,bounds.height);};
  },[motion,speed]);
  return <canvas ref={canvas} className="move-visuals" data-testid="move-visuals" data-active={motion?.kind==='move'} data-move={motion?.kind==='move'?motion.move:undefined} aria-hidden="true"/>;
}
