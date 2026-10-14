import {isTeraType} from '../data/tera';

export function TeraTypeIcon({type,size=48}:{type:string;size?:number}){
 const symbol=isTeraType(type)?type:'Normal';
 return <img className="tera-type-icon" data-tera-symbol={symbol} src={`/sprites/gimmicks/tera/Tera${symbol}.png`} width={size} height={size} alt="" aria-hidden="true"/>;
}
