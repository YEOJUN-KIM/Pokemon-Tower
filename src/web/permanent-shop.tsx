'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {permanentPrices,permanentResearch,type PermanentResult,type PermanentProduct,type ResearchProduct} from '../data/permanent-upgrades';
import {eggMachineTuningRules,type EggMachineTuning} from '../data/egg-machine-tuning';
import {eggKinds,eggKindInfo,machinePokemonWeights,MACHINE_SHINY_WEIGHT,highestEggKind,type EggKind} from '../data/egg-kinds';
import {EggVisual} from './egg-visual';
import {EggHatchDialog} from './egg-hatch-dialog';
import type {BattleResponse,TowerView} from './contracts';
import {type PokedexEntry} from './pokedex-data';
import {PokedexDialog} from './pokedex-dialog';
import {useGameKeyboard} from './game-keyboard';
import {UpgradeCompleteDialog,type UpgradeCompletion} from './upgrade-complete-dialog';

import {EggStationMenu,eggMenuControls} from './egg-station-menu';
import {GameMenuProvider,GameMenuBar} from './game-menu-context';
import eggStyles from './styles/egg-station-menu.module.css';
type Props={entries?:PokedexEntry[];page:'upgrades'|'eggs'};
export default function PermanentShop(props:Props){return props.page==='eggs'?<GameMenuProvider><PermanentShopContent {...props}/></GameMenuProvider>:<PermanentShopContent {...props}/>;}
function PermanentShopContent({entries=[],page}:Props){
 const [eggOdds,setEggOdds]=useState(false);
 const [tuning,setTuning]=useState<EggMachineTuning>({kind:'none'});
 const [completion,setCompletion]=useState<UpgradeCompletion|null>(null);
 const [dispensedKind,setDispensedKind]=useState<EggKind|null>(null);
 const [tower,setTower]=useState<TowerView|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PermanentResult|null>(null),[spinning,setSpinning]=useState(false);
 const lock=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),pending=useRef<{requestId:string;action:string;product:PermanentProduct;count:number;species?:string;eggKind?:string;tuning?:EggMachineTuning}|null>(null);
 useGameKeyboard('.permanent-shop button',1,page==='upgrades',(event,cursor,select)=>{if(event.key.toLowerCase()==='x'){window.location.href='/';return true;}if(event.key.startsWith('Arrow')&&cursor){event.preventDefault();const rect=cursor.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,horizontal=['ArrowLeft','ArrowRight'].includes(event.key),positive=['ArrowRight','ArrowDown'].includes(event.key);const next=Array.from(document.querySelectorAll<HTMLButtonElement>('.permanent-shop button:not(:disabled)')).filter(b=>b!==cursor&&b.getClientRects().length).map(button=>{const r=button.getBoundingClientRect(),dx=r.x+r.width/2-x,dy=r.y+r.height/2-y;return {button,along:horizontal?dx:dy,cost:Math.abs(horizontal?dx:dy)+3*Math.abs(horizontal?dy:dx)};}).filter(b=>positive?b.along>2:b.along< -2).sort((a,b)=>a.cost-b.cost)[0];if(next){select(next.button);next.button.scrollIntoView({block:'nearest'});}return true;}return false;});
 useEffect(()=>{let alive=true;fetch('/api/battle?view=collection',{cache:'no-store'}).then(async r=>{const data:BattleResponse=await r.json();if(!r.ok)throw Error(data.error);if(alive){setTower(data.tower);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;if(timer.current)clearTimeout(timer.current);};},[]);
 const permanent=tower?.permanent??{retryLimit:0,rerollLevel:0,rerollLimit:1,shinyTickets:0,eggTickets:0};
 async function send(action:string,product:PermanentProduct,count=1,species?:string,retry=false,eggKind?:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setResult(null);
  const body=retry&&pending.current?pending.current:{requestId:crypto.randomUUID(),action,product,count,...(action==='hatch'&&tuning.kind!=='none'?{tuning}:{}),...(eggKind?{eggKind}:{}),...(species?{species}:{})};pending.current=body;
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
   else{setCompletion(tower?.permanent&&data.tower.permanent?{product:body.product,before:tower.permanent,after:data.tower.permanent,spent:Math.max(0,tower.growthPoints-data.tower.growthPoints),points:data.tower.growthPoints}:null);setResult(data.permanentResult??null);setBusy(false);lock.current=false;}
  }catch(e){setSpinning(false);setDispensedKind(null);setError(e instanceof Error?e.message:'연결하지 못했습니다.');setBusy(false);lock.current=false;}
 }
 const blocked=busy||!tower||!!pending.current,points=tower?.growthPoints??0;
 const unitPrice=tuning.kind==='none'?permanentPrices.egg:eggMachineTuningRules.focusedPrice;
 const hatchCost=(count:number)=>Math.max(0,count-permanent.eggTickets)*unitPrice;
 const hatchLabel=(count:number)=>{const tickets=Math.min(count,permanent.eggTickets),cost=hatchCost(count);return `${count}회 뽑기 · ${[tickets?`${tickets}장`:null,cost?`${cost.toLocaleString()}P`:null].filter(Boolean).join(' + ')}`;};
 const rerollPrice=permanentPrices.reroll[permanent.rerollLevel];
 const retryPrice=permanentPrices.retry[permanent.retryLimit];
 return <main className={`permanent-shop ${page==='eggs'?`egg-game-screen ${eggStyles.scope} ${eggStyles.screen}`:''}`}><header className="permanent-page-header"><h1>{page==='eggs'?'알뽑기':'영구 업그레이드'}</h1></header><div className="permanent-wallet"><span>성장 포인트</span><strong data-testid="permanent-wallet">{points.toLocaleString()}P</strong></div>
 {error&&<div role="alert" className="permanent-error">{error}{pending.current?<button disabled={busy} onClick={()=>void send('buy','egg',1,undefined,true)}>같은 요청 다시 확인</button>:!tower?<button onClick={()=>window.location.reload()}>다시 불러오기</button>:null}</div>}
 {page==='upgrades'&&<section aria-label="영구 업그레이드 상품">
 <div className="permanent-products">
 {(Object.keys(permanentResearch) as ResearchProduct[]).map(product=>{
  const definition=permanentResearch[product],level=product==='allowance'?permanent.allowanceLevel??0:permanent.eggFocusLevel??0,price=definition.prices[level];
  return <section key={product}><span className="permanent-ticket" aria-hidden="true">{product==='allowance'?'₽':'◎'}</span><h2>{definition.name}</h2><p>{product==='allowance'?'새 도전의 첫 구매를 위한 시작 자금':'지역·타입 지정 알 뽑기의 대상 선택 비중 증가'}</p><strong>{product==='allowance'?`시작 자금 ${permanent.startingCoins??0}코인`:`지정 대상 비중 ${permanent.eggFocusWeight??50}%`}</strong><small>{level} / 3단계 · {product==='allowance'?'다음 도전부터 적용 · 최대 450코인':'즉시 적용 · 최대 65% · 알 등급·이로치 확률 유지'}</small><button data-permanent-product={product} disabled={blocked||level>=3||points<(price??Infinity)} onClick={()=>void send('buy',product)}>{level>=3?'최대 연구 완료':`${level+1}단계 연구 · ${price.toLocaleString()}P`}</button></section>;
 })}
 <section><span className="permanent-ticket reroll-ticket" aria-hidden="true">↶</span><h2>다시하기 확장</h2><p>패배한 상대에 맞춰 출전 팀과 기술을 다시 준비</p><strong>도전당 {permanent.retryLimit}회 / 최대 3회</strong><small>기본 0회 · 다음 도전부터 적용</small><button data-permanent-product="retry" disabled={blocked||permanent.retryLimit>=3||points<(retryPrice??Infinity)} onClick={()=>void send('buy','retry')}>{permanent.retryLimit>=3?'최대 확장 완료':`${permanent.retryLimit+1}회로 확장 · ${retryPrice.toLocaleString()}P`}</button></section>
 <section><span className="permanent-ticket reroll-ticket" aria-hidden="true">↻</span><h2>리롤 확장권</h2><p>일반 상점과 기술머신의 무료 리롤 횟수 증가</p><strong>현재 {permanent.rerollLimit}회 / 최대 3회</strong><small>구매 즉시 진행 중인 도전에도 적용</small><button data-permanent-product="reroll" disabled={blocked||permanent.rerollLevel>=2||points<(rerollPrice??Infinity)} onClick={()=>void send('buy','reroll')}>{permanent.rerollLevel>=2?'최대 확장 완료':`${permanent.rerollLimit+1}회로 확장 · ${rerollPrice.toLocaleString()}P`}</button></section>

 </div>
 </section>}
 {page==='eggs'&&<EggStationMenu tuning={tuning} onTuning={setTuning} permanent={permanent} points={points} blocked={blocked} spinning={spinning} dispensedKind={dispensedKind} unitPrice={unitPrice} hatchCost={hatchCost} hatchLabel={hatchLabel} onHatch={count=>void send('hatch','egg',count)} onRewardHatch={kind=>void send('hatch-reward','egg',1,undefined,false,kind)} onOdds={()=>setEggOdds(true)}/>}

 {result?.eggs?<EggHatchDialog result={result} entries={entries} onClose={()=>setResult(null)}/>:result&&<UpgradeCompleteDialog result={result} completion={completion} onClose={()=>setResult(null)}/>}
 {eggOdds&&<PokedexDialog title="알 확률" className="permanent-dialog egg-odds-dialog" large returnFocus="[data-egg-odds-button]" onClose={()=>setEggOdds(false)}>
 <p className={eggStyles.help}>지정 대상 비중 {eggMachineTuningRules.focusWeight}{(permanent.eggFocusWeight??eggMachineTuningRules.focusWeight)>eggMachineTuningRules.focusWeight?` + ${(permanent.eggFocusWeight??0)-eggMachineTuningRules.focusWeight}`:''}% · 같은 알 등급 안에서 대상을 선택합니다. 대상이 없는 등급은 기존 풀을 사용합니다. 알 등급과 이로치 확률은 그대로 유지됩니다.</p><div className="egg-odds-list">{eggKinds.map(kind=><article key={kind} className={kind==='shiny'?'egg-odds-shiny':undefined}><EggVisual kind={kind}/><h3>{eggKindInfo[kind].name}</h3><strong>{(kind==='shiny'?MACHINE_SHINY_WEIGHT:machinePokemonWeights[kind])/100}%</strong>{kind==='shiny'&&<small>모든 등급 공통 · 별도 판정</small>}<p>{kind==='normal'?'일반 포켓몬 · 스타팅 · 600족':eggKindInfo[kind].description}</p></article>)}</div>
 <button data-initial-focus onClick={()=>setEggOdds(false)}>확인</button></PokedexDialog>}
 {page==='eggs'?<GameMenuBar context="eggs" controls={eggMenuControls}><div className={eggStyles.footerActions}><button data-egg-utility data-egg-odds-button tabIndex={-1} aria-label="알 확률" disabled={blocked} onClick={()=>setEggOdds(true)}><kbd>Y</kbd>알 확률</button><Link href="/" tabIndex={-1}>돌아가기</Link></div></GameMenuBar>:<footer className="permanent-page-footer"><span><kbd>X</kbd> 타이틀로 돌아가기</span><Link href="/" tabIndex={-1}>돌아가기</Link></footer>}
 </main>;
}
