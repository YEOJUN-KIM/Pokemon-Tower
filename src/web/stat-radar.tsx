import {natures,statNames,trainedStat,type StatKey,type TrainingView,type TrainingProfile} from '../data/training';

const axes:StatKey[]=['hp','atk','def','spe','spd','spa'];
function point(index:number,radius:number){const angle=(-90+index*60)*Math.PI/180;return [200+Math.cos(angle)*radius,164+Math.sin(angle)*radius];}
export function StatRadar({entry,profile}:{entry:TrainingView;profile:TrainingProfile}) {
  const nature=natures.find(value=>value.id===profile.nature);
  const values=axes.map(key=>trainedStat(entry.baseStats[key],profile.ivs[key],profile.evs[key],key,profile.nature));
  const maximum=Math.max(200,...values);
  return <figure className="stat-radar"><figcaption>실제 능력치 · Lv.50 <span>성격 보정 포함</span></figcaption><svg viewBox="0 0 400 330" role="img" aria-label="6가지 실제 능력치 그래프">
    <title>{axes.map((key,i)=>`${statNames[key]} ${values[i]}`).join(', ')}</title>
    {[.25,.5,.75,1].map(scale=><polygon key={scale} className="radar-ring" points={axes.map((_,i)=>point(i,104*scale).join(',')).join(' ')}/>)}
    {axes.map((key,i)=>{const [x,y]=point(i,104);return <line key={key} x1={200} y1={164} x2={x} y2={y} className="radar-axis"/>;})}
    <polygon className="radar-shape" points={values.map((value,i)=>point(i,104*value/maximum).join(',')).join(' ')}/>
    {axes.map((key,i)=>{if(profile.evs[key]!==32)return null;const [x,y]=point(i,104*values[i]/maximum);return <circle key={key} className="radar-max-point" cx={x} cy={y} r={5}><title>{statNames[key]} 노력치 최대</title></circle>;})}
    {axes.map((key,i)=>{const [x,y]=point(i,139),mark=nature?.plus===key ? ' ↑' : nature?.minus===key ? ' ↓' : '';return <g key={key} data-maxed={profile.evs[key]===32 || undefined} className={nature?.plus===key ? 'radar-up' : nature?.minus===key ? 'radar-down' : ''}><text x={x} y={y-8} textAnchor="middle" className="radar-label">{statNames[key]}{mark}{profile.evs[key]===32 && <tspan className="radar-max-star"> ★</tspan>}</text><text x={x} y={y+15} textAnchor="middle" className="radar-value">{values[i]}</text></g>;})}
  </svg><div className="radar-legend"><span>↑ 상승 ×1.1</span><span>↓ 하락 ×0.9</span></div></figure>;
}
