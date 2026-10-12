'use client';
import {useEffect,useRef} from 'react';
import type {Motion} from './battle-presentation';
import {effectAssets,moveAnimationPlan,type EffectPoint} from './move-animation-plan';

const images=new Map<string,HTMLImageElement>();
let loading:Promise<void>|undefined;
function preload(){
  return loading ??= Promise.all(effectAssets.map(asset=>new Promise<void>(resolve=>{
    const image=new Image();image.onload=()=>{images.set(asset,image);resolve();};image.onerror=()=>resolve();
    image.src=`/vendor/showdown/fx/${asset}.png`;
  }))).then(()=>{});
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
    const plan=moveAnimationPlan(motion.move,motion.color),reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
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
    if(!reduced) {
      const attacker=arena.querySelector<HTMLElement>(`.${motion.side}-position .motion-wrap`);
      const dx=(target.x-source.x)*(plan.contact?.42:.035),dy=(target.y-source.y)*(plan.contact?.42:.035);
      if(attacker&&plan.style!=='support')animations.push(attacker.animate([{transform:'translate(0,0)',offset:0},{transform:`translate(${dx}px,${dy}px)`,offset:.4},{transform:`translate(${dx}px,${dy}px)`,offset:.53},{transform:'translate(0,0)',offset:1}],{duration:plan.duration,easing:'ease-in-out'}));
      const defender=arena.querySelector<HTMLElement>(`.${motion.targetSide ?? (motion.side==='player'?'enemy':'player')}-position .motion-wrap`);
      if(defender&&!motion.missed&&!motion.blocked&&plan.offensive)animations.push(defender.animate([{transform:'translateX(0)'},{transform:`translateX(${unit*.13}px)`},{transform:`translateX(${-unit*.13}px)`},{transform:'translateX(0)'}],{delay:plan.contact?430:600,duration:240}));
    }
    function draw(elapsed:number){
      context!.clearRect(0,0,bounds.width,bounds.height);
      if(plan.wash&&!reduced){context!.globalAlpha=.12*Math.sin(Math.PI*Math.min(1,elapsed/plan.duration));context!.fillStyle=plan.wash;context!.fillRect(0,0,bounds.width,bounds.height);context!.globalAlpha=1;}
      if(['flame','blueflame','icebeam','greenbeam','dragonbeam','waterbeam','beam'].includes(plan.style)&&elapsed>100&&elapsed<720&&!reduced){
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
