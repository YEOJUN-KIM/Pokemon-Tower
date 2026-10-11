import {moveCategoryNames} from '../data/move-info';
export function MoveCategoryBadge({category}:{category:string}){
 const label=moveCategoryNames[category]??category;
 return <span className="move-category-badge" data-category={category} role="img" aria-label={label} title={category==='Physical'?'물리 · 공격 능력치 사용':category==='Special'?'특수 · 특수공격 능력치 사용':'변화 · 상태나 능력치 등에 영향을 주는 기술'}><svg viewBox="0 0 32 20" aria-hidden="true">{category==='Physical'?<path fill="#ffe34c" d="m16 1 3 5 8-3-3 6 7 1-7 3 2 6-7-3-3 3-3-5-8 3 3-6-7-1 7-3-2-6 7 3Z"/>:category==='Special'?<g fill="none" stroke="#d8eeff" strokeWidth="1.7"><ellipse cx="16" cy="10" rx="14" ry="8"/><ellipse cx="16" cy="10" rx="9" ry="5"/><ellipse cx="16" cy="10" rx="3" ry="2"/></g>:<><circle cx="16" cy="10" r="8" fill="#fff"/><path d="M16 2a4 4 0 0 1 0 8 4 4 0 0 0 0 8 8 8 0 0 0 0-16Z" fill="#92989e"/></>}</svg></span>;
}
