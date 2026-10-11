import {natures,statKeys,statNames,trainedStat,type StatBlock,type TrainingProfile} from '../data/training';
import type {CSSProperties} from 'react';

export function ivSummary(profile:TrainingProfile){
  const perfect=statKeys.filter(key=>profile.ivs[key]===31).length;
  const zero=statKeys.filter(key=>profile.ivs[key]===0).length;
  return `${perfect}V · ${zero}Z`;
}

export function StatDetails({baseStats,profile}:{baseStats:StatBlock;profile:TrainingProfile}){
  const nature=natures.find(value=>value.id===profile.nature);
  return <section className="stat-details" aria-label="내 포켓몬 능력치 구성">
    <header><h3>내 포켓몬 능력치</h3><strong>개체값 {ivSummary(profile)}</strong><span>Lv.50</span></header>
    <table><thead><tr><th scope="col">능력치</th><th scope="col">종족값</th><th scope="col">개체값</th><th scope="col">노력치<small>능력 포인트</small></th><th scope="col">최종값</th></tr></thead><tbody>{statKeys.map(key=><tr key={key} data-stat-detail={key}>
      <th scope="row">{statNames[key]}</th><td>{baseStats[key]}</td><td style={{'--iv-fill':`${profile.ivs[key]/31*100}%`} as CSSProperties} className={['stat-iv-value',profile.ivs[key]===31?'iv-perfect':profile.ivs[key]===0?'iv-zero':''].join(' ')}>{profile.ivs[key]}<small> / 31{profile.ivs[key]===31?' · V':profile.ivs[key]===0?' · Z':''}</small></td><td className={profile.evs[key]===32?'stat-points-maxed':undefined}>{profile.evs[key]}<small> / 32</small></td><td className={nature?.plus===key?'stat-up':nature?.minus===key?'stat-down':''}><strong>{trainedStat(baseStats[key],profile.ivs[key],profile.evs[key],key,profile.nature)}</strong>{nature?.plus===key?' ↑':nature?.minus===key?' ↓':''}</td>
    </tr>)}</tbody></table>
    <small className="stat-details-note">V = 개체값 31 · Z = 개체값 0 · 최종값은 성격 보정 포함</small>
  </section>;
}
