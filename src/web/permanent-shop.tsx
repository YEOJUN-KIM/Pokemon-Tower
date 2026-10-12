'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {permanentPrices,type PermanentResult,type PermanentProduct} from '../data/permanent-upgrades';
import {statKeys,statNames,type TrainingView} from '../data/training';
import type {BattleResponse,TowerView} from './contracts';
import type {PokedexEntry} from './pokedex-data';
import {PokemonImage} from './pokemon-image';
import {PokedexDialog} from './pokedex-dialog';
import {useGameKeyboard} from './game-keyboard';
import {moves} from './catalog';
import {pokemonRarity,pokemonRarityNames} from '../data/pokemon-rarity';

export default function PermanentShop({entries}:{entries:PokedexEntry[]}){
 const [tower,setTower]=useState<TowerView|null>(null),[training,setTraining]=useState<TrainingView[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PermanentResult|null>(null),[spinning,setSpinning]=useState(false),[exchange,setExchange]=useState(false),[query,setQuery]=useState('');
 const lock=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),pending=useRef<{requestId:string;action:string;product:PermanentProduct;count:number;species?:string}|null>(null);
 useGameKeyboard('.permanent-shop button',1,true,(event,cursor,select)=>{if(event.key.toLowerCase()==='x'){window.location.href='/';return true;}if(event.key.startsWith('Arrow')&&cursor){event.preventDefault();const rect=cursor.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,horizontal=['ArrowLeft','ArrowRight'].includes(event.key),positive=['ArrowRight','ArrowDown'].includes(event.key);const next=Array.from(document.querySelectorAll<HTMLButtonElement>('.permanent-shop button:not(:disabled)')).filter(b=>b!==cursor&&b.getClientRects().length).map(button=>{const r=button.getBoundingClientRect(),dx=r.x+r.width/2-x,dy=r.y+r.height/2-y;return {button,along:horizontal?dx:dy,cost:Math.abs(horizontal?dx:dy)+3*Math.abs(horizontal?dy:dx)};}).filter(b=>positive?b.along>2:b.along< -2).sort((a,b)=>a.cost-b.cost)[0];if(next){select(next.button);next.button.scrollIntoView({block:'nearest'});}return true;}return false;});
 useEffect(()=>{let alive=true;fetch('/api/battle?view=collection',{cache:'no-store'}).then(async r=>{const data:BattleResponse=await r.json();if(!r.ok)throw Error(data.error);if(alive){setTower(data.tower);setTraining(data.training??[]);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;if(timer.current)clearTimeout(timer.current);};},[]);
 const permanent=tower?.permanent??{rerollLevel:0,rerollLimit:1,shinyTickets:0,eggTickets:0};
 async function send(action:string,product:PermanentProduct,count=1,species?:string,retry=false){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setResult(null);
  const body=retry&&pending.current?pending.current:{requestId:crypto.randomUUID(),action,product,count,...(species?{species}:{})};pending.current=body;
  if(body.action==='hatch')setSpinning(true);
  try{
   const response=await fetch('/api/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'permanent',...body})});
   const data:BattleResponse=await response.json();if(!response.ok){if(response.status<500)pending.current=null;throw Error(data.error??'구매하지 못했습니다.');}
   setTower(data.tower);setTraining(data.training??[]);setExchange(false);pending.current=null;
   if(body.action==='hatch'){timer.current=setTimeout(()=>{setSpinning(false);setResult(data.permanentResult??null);setBusy(false);lock.current=false;},2200);}
   else{setResult(data.permanentResult??null);setBusy(false);lock.current=false;}
  }catch(e){setSpinning(false);setError(e instanceof Error?e.message:'연결하지 못했습니다.');setBusy(false);lock.current=false;}
 }
 const blocked=busy||!tower||!!pending.current,points=tower?.growthPoints??0;
 const hatchCost=(count:number)=>Math.max(0,count-permanent.eggTickets)*permanentPrices.egg;
 const hatchLabel=(count:number)=>{const tickets=Math.min(count,permanent.eggTickets),cost=hatchCost(count);return `${count}회 뽑기 · ${[tickets?`${tickets}장`:null,cost?`${cost.toLocaleString()}P`:null].filter(Boolean).join(' + ')}`;};
 const rerollPrice=permanentPrices.reroll[permanent.rerollLevel];
 return <main className="permanent-shop"><nav><Link href="/">← 타이틀</Link><h1>영구 업그레이드</h1><Link href="/pokedex">포켓몬 도감</Link></nav><div className="permanent-wallet"><span>성장 포인트</span><strong data-testid="permanent-wallet">{points.toLocaleString()}P</strong></div>
 {error&&<div role="alert" className="permanent-error">{error}{pending.current?<button disabled={busy} onClick={()=>void send('buy','egg',1,undefined,true)}>같은 요청 다시 확인</button>:!tower?<button onClick={()=>window.location.reload()}>다시 불러오기</button>:null}</div>}
 <div className="permanent-products">
 <section><span className="permanent-ticket reroll-ticket" aria-hidden="true">↻</span><h2>리롤 확장권</h2><p>일반 상점과 기술머신의 무료 리롤 횟수 증가</p><strong>현재 {permanent.rerollLimit}회 / 최대 3회</strong><small>구매 즉시 진행 중인 도전에도 적용</small><button disabled={blocked||permanent.rerollLevel>=2||points<(rerollPrice??Infinity)} onClick={()=>void send('buy','reroll')}>{permanent.rerollLevel>=2?'최대 확장 완료':`${permanent.rerollLimit+1}회로 확장 · ${rerollPrice.toLocaleString()}P`}</button></section>
 <section><span className="permanent-ticket shiny-ticket" aria-hidden="true">✦</span><h2>이로치 교환권</h2><p>보유 포켓몬 1마리의 이로치 외형 해금</p><strong>보유 {permanent.shinyTickets}장</strong><small>능력치는 그대로 · 다음 도전부터 적용</small><button disabled={blocked||points<permanentPrices.shiny} onClick={()=>void send('buy','shiny')}>1장 구매 · {permanentPrices.shiny.toLocaleString()}P</button><button disabled={blocked||!permanent.shinyTickets} onClick={()=>setExchange(true)}>교환권 사용 · 포켓몬 선택</button></section>

 </div>
 <section className={`egg-station ${spinning?'is-spinning':''}`} aria-label="알 뽑기 기계"><div className="egg-machine" aria-hidden="true"><div className="egg-machine-top"><span>EGG STATION</span><div className="egg-globe">{Array.from({length:7},(_,i)=><i key={i}/>)}</div></div><div className="egg-machine-base"><i className="egg-crank"/><div className="egg-chute"><span className="dispensed-egg"/></div></div></div><div className="egg-station-controls"><h2>알 뽑기</h2><p>뽑기권 {permanent.eggTickets}장</p><div><button disabled={blocked||points<hatchCost(1)} onClick={()=>void send('hatch','egg',1)}>{hatchLabel(1)}</button><button disabled={blocked||points<hatchCost(10)} onClick={()=>void send('hatch','egg',10)}>{hatchLabel(10)}</button></div></div></section>

 {result&&<PokedexDialog title={result.eggs?'알 부화 결과':'업그레이드 완료'} className="permanent-dialog" large={!!result.eggs} onClose={()=>setResult(null)}><p role="status">{result.message}</p>{result.eggs&&<div className={`egg-results ${result.eggs.length===1?'single-result':''}`}>{result.eggs.map((egg,i)=>{const entry=entries.find(e=>e.species===egg.species)!,rarity=pokemonRarity(egg.species);return <article key={i} className={egg.shiny?'shiny-result':''} data-rarity={rarity} data-testid="egg-result">{egg.isNew&&<span className="egg-new-badge">NEW!</span>}<div className="hatch-sprite"><PokemonImage id={entry.id} name={entry.name} shiny={egg.shiny} animated width={100} height={100} maxPixelScale={2} fallback={<span>◇</span>}/>{egg.shiny&&<span className="shiny-sparkles" aria-hidden="true">{[0,1,2,3,4].map(n=><i key={n}>✦</i>)}</span>}</div><h3>{entry.name}{egg.shiny?' ✦':''}</h3><div className="egg-gains">{rarity!=='normal'&&<span className="egg-rarity-label">{pokemonRarityNames[rarity]}</span>}{egg.newShiny&&<b>이로치 해금!</b>}</div><dl>{statKeys.map(stat=>{const gain=egg.isNew?undefined:egg.ivGain.changes.find(change=>change.stat===stat);return <div key={stat} className={gain?'egg-stat-improved':''}><dt>{statNames[stat]}</dt><dd>{egg.ivs[stat]}{gain&&<span className="egg-stat-delta" aria-label={`기존 ${gain.from}에서 ${gain.to-gain.from} 상승`}>↑{gain.to-gain.from}</span>}</dd></div>;})}</dl><div className="egg-new-moves">{egg.newMoves.map(move=><span key={move}><b>새 기술</b> {moves[move]?.name??move}</span>)}</div></article>;})}</div>}<button data-initial-focus onClick={()=>setResult(null)}>확인 · Z</button></PokedexDialog>}
 {exchange&&<PokedexDialog title="이로치 교환 · 포켓몬 선택" className="permanent-dialog" large onClose={()=>{if(!busy)setExchange(false);}}><input aria-label="교환할 포켓몬 검색" placeholder="이름 검색" value={query} onChange={e=>setQuery(e.target.value)}/><div className="shiny-targets">{training.filter(t=>!t.profile.shiny).filter(t=>{const entry=entries.find(e=>e.species===t.species);return entry&&(entry.name.includes(query)||entry.species.toLowerCase().includes(query.toLowerCase()));}).map(t=>{const entry=entries.find(e=>e.species===t.species)!;return <button key={t.species} aria-label={entry.name} disabled={busy} onClick={()=>{if(window.confirm(`${entry.name}에게 이로치 교환권 1장을 사용할까요?`))void send('shiny','shiny',1,t.species);}}><PokemonImage id={entry.id} name={entry.name} width={64} height={64} fallback={<span>◇</span>}/>{entry.name}</button>;})}</div>{error&&<p role="alert">{error}</p>}<button onClick={()=>setExchange(false)}>돌아가기 · X</button></PokedexDialog>}
 <footer>방향키 이동 · Enter/Z 결정 · X 뒤로</footer></main>;
}
