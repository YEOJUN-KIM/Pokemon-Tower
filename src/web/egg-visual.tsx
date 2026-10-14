import {eggKindInfo,type EggKind} from '../data/egg-kinds';

export function EggVisual({kind,cracking=false}:{kind:EggKind;cracking?:boolean}){
 return <span className={`egg-visual egg-visual-${kind}${cracking?' is-cracking':''}`} data-egg-kind={kind}>
  {kind==='rare'&&<span className="egg-energy" aria-hidden="true"><i/><i/><i/></span>}
  {kind==='superRare'&&<><span className="egg-celestial-halo" aria-hidden="true"><i/><i/></span><span className="egg-celestial-stars" aria-hidden="true">{Array.from({length:5},(_,i)=><i key={i}>✧</i>)}</span></>}
  <img src={eggKindInfo[kind].image} alt={eggKindInfo[kind].name} width={128} height={128}/>
  {kind==='shiny'&&<span className="egg-gold-sparkles" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i}>✦</i>)}</span>}
  {cracking&&<span className="egg-crack" aria-hidden="true"/>}
 </span>;
}
