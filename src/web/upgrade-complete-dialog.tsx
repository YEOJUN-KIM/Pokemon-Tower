'use client';
import type {PermanentProduct,PermanentResult,PermanentView} from '../data/permanent-upgrades';
import {PokedexDialog} from './pokedex-dialog';
import styles from './styles/upgrade-complete.module.css';

export type UpgradeCompletion={product:PermanentProduct;before:PermanentView;after:PermanentView;spent:number;points:number};

function UpgradeIcon({product}:{product:PermanentProduct}){
 return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 3 29 7 36 7 40 13 45 17 44 24 45 31 40 35 36 41 29 41 24 45 19 41 12 41 8 35 3 31 4 24 3 17 8 13 12 7 19 7Z" fill="currentColor" opacity=".12"/>{product==='allowance'?<><circle cx="24" cy="24" r="13"/><path d="M20 31V17h6a4 4 0 0 1 0 8h-6m-3 4h12"/></>:product==='eggFocus'?<><path d="M34 28c0 8-5 12-10 12s-10-4-10-12S20 9 24 9s10 11 10 19Z"/><path d="m24 18 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></>:product==='retry'?<><path d="M13 22a12 12 0 1 1 1 11M12 12v11h11"/><path d="m24 17 1 7 5 3"/></>:<><path d="M13 22a12 12 0 0 1 20-7l4 4m0-10v10H27M35 26a12 12 0 0 1-20 7l-4-4m0 10V29h10"/></>}</svg>;
}

export function UpgradeCompleteDialog({result,completion,onClose}:{result:PermanentResult;completion:UpgradeCompletion|null;onClose:()=>void}){
 const product=completion?.product;
 const info=completion&&product==='allowance'?{title:'출발 지원금',label:'도전 시작 자금',before:`${completion.before.startingCoins??0}`,after:`${completion.after.startingCoins??0}`,unit:'코인',level:completion.after.allowanceLevel??0,max:3,timing:'다음 도전부터 적용',description:'첫 구매를 위한 여유가 생겼어요. 새 도전을 시작할 때 자동으로 지급됩니다.'}
 :completion&&product==='eggFocus'?{title:'알 탐색 연구',label:'지정 대상 선택 비중',before:`${completion.before.eggFocusWeight??50}`,after:`${completion.after.eggFocusWeight??50}`,unit:'%',level:completion.after.eggFocusLevel??0,max:3,timing:'지금부터 적용',description:'원하는 파트너에게 한 걸음 더! 지역·타입 지정 뽑기에 적용됩니다.'}
 :completion&&product==='retry'?{title:'다시하기 확장',label:'도전당 다시하기',before:`${completion.before.retryLimit}`,after:`${completion.after.retryLimit}`,unit:'회',level:completion.after.retryLimit,max:3,timing:'다음 도전부터 적용',description:'한 번의 패배로 끝나지 않아요. 팀을 다시 준비하고 도전을 이어가세요.'}
 :completion&&product==='reroll'?{title:'리롤 확장권',label:'상점 종류별 무료 리롤',before:`${completion.before.rerollLimit}`,after:`${completion.after.rerollLimit}`,unit:'회',level:completion.after.rerollLevel,max:2,timing:'진행 중인 도전에도 즉시 적용',description:'더 넓어진 선택지에서 팀에 필요한 도구와 기술머신을 찾아보세요.'}:null;
 return <PokedexDialog title="업그레이드 완료" className={`${styles.scope} ${styles.dialog}`} onClose={onClose} returnFocus={product?`[data-permanent-product="${product}"]`:undefined} controls={[{key:'Enter / Z',label:'확인'},{key:'Esc / X',label:'닫기'}]}>
  <div className={styles.content} role="status">
   <div className={styles.emblem}><UpgradeIcon product={product??'egg'}/><span>✓</span></div>
   <div className={styles.identity}><span className={styles.kicker}>PERMANENT UPGRADE</span><h3>{info?.title??'구매 완료'}</h3><p>{info?.description??result.message}</p></div>
   {info&&<><div className={styles.effect}><span>{info.label}</span><div className={styles.values}><span>{info.before}<small>{info.unit}</small></span><span className={styles.arrow} aria-label="에서">→</span><strong>{info.after}<small>{info.unit}</small></strong></div></div>
   <div className={styles.progress} aria-label={`업그레이드 ${info.level} / ${info.max}단계`}><div>{Array.from({length:info.max},(_,index)=><i key={index} data-filled={index<info.level}/>)}</div><span>{info.level===info.max?'최대 단계 달성':`${info.level} / ${info.max}단계`}</span></div>
   <p className={styles.timing}><span aria-hidden="true">✓</span>{info.timing}</p></>}
  </div>
  {completion&&<dl className={styles.receipt}><div><dt>사용한 성장 포인트</dt><dd>−{completion.spent.toLocaleString()}P</dd></div><div><dt>남은 성장 포인트</dt><dd>{completion.points.toLocaleString()}P</dd></div></dl>}
  <button className={styles.confirm} data-initial-focus onClick={onClose}>확인</button>
 </PokedexDialog>;
}
