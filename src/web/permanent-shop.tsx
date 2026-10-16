'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {permanentPrices,type PermanentResult,type PermanentProduct} from '../data/permanent-upgrades';
import {eggKinds,eggKindInfo,machinePokemonWeights,MACHINE_SHINY_WEIGHT,highestEggKind,type EggKind} from '../data/egg-kinds';
import {EggVisual} from './egg-visual';
import {EggHatchDialog} from './egg-hatch-dialog';
import type {BattleResponse,TowerView} from './contracts';
import {type PokedexEntry} from './pokedex-data';
import {PokedexDialog} from './pokedex-dialog';
import {useGameKeyboard} from './game-keyboard';

export default function PermanentShop({entries}:{entries:PokedexEntry[]}){
 const [tab,setTab]=useState<'upgrades'|'eggs'>('upgrades');
 const [eggOdds,setEggOdds]=useState(false);
 const [dispensedKind,setDispensedKind]=useState<EggKind|null>(null);
 const [tower,setTower]=useState<TowerView|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PermanentResult|null>(null),[spinning,setSpinning]=useState(false);
 const lock=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),pending=useRef<{requestId:string;action:string;product:PermanentProduct;count:number;species?:string;eggKind?:string}|null>(null);
 useGameKeyboard('.permanent-shop button',1,true,(event,cursor,select)=>{if(event.key.toLowerCase()==='x'){window.location.href='/';return true;}if(event.key.startsWith('Arrow')&&cursor){event.preventDefault();const rect=cursor.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,horizontal=['ArrowLeft','ArrowRight'].includes(event.key),positive=['ArrowRight','ArrowDown'].includes(event.key);const next=Array.from(document.querySelectorAll<HTMLButtonElement>('.permanent-shop button:not(:disabled)')).filter(b=>b!==cursor&&b.getClientRects().length).map(button=>{const r=button.getBoundingClientRect(),dx=r.x+r.width/2-x,dy=r.y+r.height/2-y;return {button,along:horizontal?dx:dy,cost:Math.abs(horizontal?dx:dy)+3*Math.abs(horizontal?dy:dx)};}).filter(b=>positive?b.along>2:b.along< -2).sort((a,b)=>a.cost-b.cost)[0];if(next){select(next.button);next.button.scrollIntoView({block:'nearest'});}return true;}return false;});
 useEffect(()=>{let alive=true;fetch('/api/battle?view=collection',{cache:'no-store'}).then(async r=>{const data:BattleResponse=await r.json();if(!r.ok)throw Error(data.error);if(alive){setTower(data.tower);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;if(timer.current)clearTimeout(timer.current);};},[]);
 const permanent=tower?.permanent??{retryLimit:0,rerollLevel:0,rerollLimit:1,shinyTickets:0,eggTickets:0};
 async function send(action:string,product:PermanentProduct,count=1,species?:string,retry=false,eggKind?:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setResult(null);
  const body=retry&&pending.current?pending.current:{requestId:crypto.randomUUID(),action,product,count,...(eggKind?{eggKind}:{}),...(species?{species}:{})};pending.current=body;
  if((body.action==='hatch'||body.action==='hatch-reward')){setDispensedKind(null);setSpinning(true);}
  try{
   const response=await fetch('/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'permanent',...body})});
   const data:BattleResponse=await response.json();if(!response.ok){if(response.status<500)pending.current=null;throw Error(data.error??'구매하지 못했습니다.');}
   setTower(data.tower);pending.current=null;
   if((body.action==='hatch'||body.action==='hatch-reward')){
    const kinds=(data.permanentResult?.eggs??[]).map(egg=>egg.eggKind??(egg.shiny?'shiny':'normal'));
    setDispensedKind(highestEggKind(kinds));
    const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?100:1600;
    timer.current=setTimeout(()=>{setSpinning(false);setDispensedKind(null);setResult(data.permanentResult??null);setBusy(false);lock.current=false;},duration);
   }
   else{setResult(data.permanentResult??null);setBusy(false);lock.current=false;}
  }catch(e){setSpinning(false);setDispensedKind(null);setError(e instanceof Error?e.message:'연결하지 못했습니다.');setBusy(false);lock.current=false;}
 }
 const blocked=busy||!tower||!!pending.current,points=tower?.growthPoints??0;
 const hatchCost=(count:number)=>Math.max(0,count-permanent.eggTickets)*permanentPrices.egg;
 const hatchLabel=(count:number)=>{const tickets=Math.min(count,permanent.eggTickets),cost=hatchCost(count);return `${count}회 뽑기 · ${[tickets?`${tickets}장`:null,cost?`${cost.toLocaleString()}P`:null].filter(Boolean).join(' + ')}`;};
 const rerollPrice=permanentPrices.reroll[permanent.rerollLevel];
 const retryPrice=permanentPrices.retry[permanent.retryLimit];
 return <main className="permanent-shop"><nav><Link href="/">← 타이틀</Link><h1>영구 업그레이드</h1><Link href="/pokedex">포켓몬 도감</Link></nav><div className="permanent-wallet"><span>성장 포인트</span><strong data-testid="permanent-wallet">{points.toLocaleString()}P</strong></div>
 {error&&<div role="alert" className="permanent-error">{error}{pending.current?<button disabled={busy} onClick={()=>void send('buy','egg',1,undefined,true)}>같은 요청 다시 확인</button>:!tower?<button onClick={()=>window.location.reload()}>다시 불러오기</button>:null}</div>}
 <div className="permanent-tabs" role="tablist" aria-label="성장 포인트 사용" data-game-tabs>
 {([['upgrades','영구 업그레이드'],['eggs','알 뽑기']] as const).map(([id,label])=><button key={id} id={`permanent-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`permanent-panel-${id}`} disabled={busy} onClick={()=>setTab(id)}>{label}</button>)}
 </div>
 <div id="permanent-panel-upgrades" role="tabpanel" aria-labelledby="permanent-tab-upgrades" hidden={tab!=='upgrades'}>
 <div className="permanent-products">
 <section><span className="permanent-ticket reroll-ticket" aria-hidden="true">↶</span><h2>다시하기 확장</h2><p>패배한 상대에 맞춰 출전 팀과 기술을 다시 준비</p><strong>도전당 {permanent.retryLimit}회 / 최대 3회</strong><small>기본 0회 · 다음 도전부터 적용</small><button disabled={blocked||permanent.retryLimit>=3||points<(retryPrice??Infinity)} onClick={()=>void send('buy','retry')}>{permanent.retryLimit>=3?'최대 확장 완료':`${permanent.retryLimit+1}회로 확장 · ${retryPrice.toLocaleString()}P`}</button></section>
 <section><span className="permanent-ticket reroll-ticket" aria-hidden="true">↻</span><h2>리롤 확장권</h2><p>일반 상점과 기술머신의 무료 리롤 횟수 증가</p><strong>현재 {permanent.rerollLimit}회 / 최대 3회</strong><small>구매 즉시 진행 중인 도전에도 적용</small><button disabled={blocked||permanent.rerollLevel>=2||points<(rerollPrice??Infinity)} onClick={()=>void send('buy','reroll')}>{permanent.rerollLevel>=2?'최대 확장 완료':`${permanent.rerollLimit+1}회로 확장 · ${rerollPrice.toLocaleString()}P`}</button></section>

 </div>
 </div>
 <div id="permanent-panel-eggs" role="tabpanel" aria-labelledby="permanent-tab-eggs" hidden={tab!=='eggs'}>
 <section aria-label="보상 알 티켓">{(['superRare','shiny'] as const).filter(kind=>(permanent.rewardEggTickets?.[kind]??0)>0).map(kind=><button key={kind} disabled={blocked} onClick={()=>void send('hatch-reward','egg',1,undefined,false,kind)}>{eggKindInfo[kind].name} 티켓 · {permanent.rewardEggTickets?.[kind]}장 · 1개 부화</button>)}</section>
 <div className="egg-odds-toolbar"><button data-egg-odds-button disabled={busy} onClick={()=>setEggOdds(true)}>알 확률</button></div>
 <section className={`egg-station ${spinning?'is-spinning':''}`} aria-label="알 뽑기 기계" aria-busy={spinning}>
 <div className="egg-machine" aria-hidden="true"><img className="egg-machine-art" src="/sprites/eggs/machine.png" alt="" width={1122} height={1402}/>{dispensedKind&&<span className="egg-machine-output" data-testid="dispensed-egg" data-egg-kind={dispensedKind}><img src={eggKindInfo[dispensedKind].image} alt=""/></span>}</div>
 <div className="egg-station-controls"><h2>알 뽑기</h2><p>뽑기권 {permanent.eggTickets}장 · 1회 {permanentPrices.egg.toLocaleString()}P</p>{spinning&&<p role="status">알을 뽑고 있어요…</p>}<div><button disabled={blocked||points<hatchCost(1)} onClick={()=>void send('hatch','egg',1)}>{hatchLabel(1)}</button><button disabled={blocked||points<hatchCost(10)} onClick={()=>void send('hatch','egg',10)}>{hatchLabel(10)}</button></div></div>
 </section>
 </div>

 {result?.eggs?<EggHatchDialog result={result} entries={entries} onClose={()=>setResult(null)}/>:result&&<PokedexDialog title="업그레이드 완료" className="permanent-dialog" onClose={()=>setResult(null)}><p role="status">{result.message}</p><button data-initial-focus onClick={()=>setResult(null)}>확인</button></PokedexDialog>}
 {eggOdds&&<PokedexDialog title="알 확률" className="permanent-dialog egg-odds-dialog" large returnFocus="[data-egg-odds-button]" onClose={()=>setEggOdds(false)}>
 <div className="egg-odds-list">{eggKinds.map(kind=><article key={kind} className={kind==='shiny'?'egg-odds-shiny':undefined}><EggVisual kind={kind}/><h3>{eggKindInfo[kind].name}</h3><strong>{(kind==='shiny'?MACHINE_SHINY_WEIGHT:machinePokemonWeights[kind])/100}%</strong>{kind==='shiny'&&<small>모든 등급 공통 · 별도 판정</small>}<p>{kind==='normal'?'일반 포켓몬 · 스타팅 · 600족':eggKindInfo[kind].description}</p></article>)}</div>
 <button data-initial-focus onClick={()=>setEggOdds(false)}>확인</button></PokedexDialog>}
 </main>;
}
