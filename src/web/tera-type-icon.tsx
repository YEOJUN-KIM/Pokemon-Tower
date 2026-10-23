import {isTeraType} from '../data/tera';
import {assetRegistry} from '../assets/registry';
import {AssetImage} from './asset-image';

export function TeraTypeIcon({type,size=48}:{type:string;size?:number}){
 const symbol=isTeraType(type)?type:'Normal';
 return <AssetImage className="tera-type-icon" data-tera-symbol={symbol} src={assetRegistry.tera(symbol)} fallbackSrc={assetRegistry.placeholders.gimmick} width={size} height={size} alt="" aria-hidden="true"/>;
}
