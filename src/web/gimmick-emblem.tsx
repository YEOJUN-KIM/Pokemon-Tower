import {useId} from 'react';

// Original vector emblems for the battle command dock.
export function GimmickEmblem({kind}:{kind:'mega'|'dynamax'}){
 const gradient=useId();
 return <svg className="gimmick-emblem" viewBox="0 0 72 72" aria-hidden="true">
  {kind==='mega' ? <>
   <defs>
    <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffbed8"/><stop offset=".2" stopColor="#cba5df"/><stop offset=".43" stopColor="#19b8d8"/><stop offset=".67" stopColor="#00b872"/><stop offset=".87" stopColor="#97d734"/><stop offset="1" stopColor="#eff589"/></linearGradient>
    <radialGradient id={`${gradient}-shine`} cx=".35" cy=".23" r=".76"><stop stopColor="#fff" stopOpacity=".35"/><stop offset=".55" stopColor="#fff" stopOpacity="0"/><stop offset=".88" stopColor="#fff" stopOpacity=".05"/><stop offset="1" stopColor="#fff" stopOpacity=".65"/></radialGradient>
   </defs>
   <circle cx="36" cy="36" r="33" fill={`url(#${gradient})`}/>
   <circle cx="36" cy="36" r="33" fill={`url(#${gradient}-shine)`} stroke="#f6ecff" strokeOpacity=".6" strokeWidth="1"/>
   <path fill="#072c2c" fillRule="evenodd" d="M45 7C40 24 56 30 57 43C59 55 44 62 29 66C34 53 22 50 16 42C5 27 22 15 45 7ZM39 16L30 20L42 27ZM24 24L21 28C28 34 42 38 51 39L45 32ZM19 34L22 40C30 44 40 47 49 49L52 44C39 42 29 38 19 34ZM29 47L35 58L43 54Z"/>
  </> : <>
   <path d="M19 13C-1 28 8 58 32 63M53 13C73 28 64 58 40 63" fill="none" stroke="#fa3481" strokeWidth="4" strokeLinecap="round"/>
   <path d="m36 13 21 19-5 21-16 10-16-10-5-21Z" fill="#6b124c" stroke="#ff70ae" strokeWidth="2"/>
   <path d="m20 25 12 11-9 13 13-6 13 6-9-13 12-11-16 6Z" fill="#ff428c" stroke="#ffd3ee" strokeWidth="1.5"/>
   <path d="m26 8 10 9L46 8M36 3v13" fill="none" stroke="#fff0fa" strokeWidth="3" strokeLinecap="round"/>
   <path d="M14 12c4-7 10-7 14-3M43 9c6-7 12-5 15 0" fill="none" stroke="#ff89bc" strokeWidth="3" strokeLinecap="round"/>
  </>}
 </svg>;
}
