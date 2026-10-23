import {assetRegistry} from '../assets/registry';
import {AssetImage} from './asset-image';
import {isHeldItem,itemName,itemIcon,itemIconExtension} from '../data/held-items';
import {itemShopRule,rarityColors} from '../data/held-item-shop';

export function HeldItemLabel({item,colored=false}:{item?:string|null;colored?:boolean}){
  return <span className="held-item-label">{isHeldItem(item) && <AssetImage className="held-item-icon" src={assetRegistry.item(itemIcon(item),itemIconExtension(item))} width={24} height={24} alt="" aria-hidden="true"/>}<span style={colored && isHeldItem(item) ? {color:rarityColors[itemShopRule(item).rarity]} : undefined}>{itemName(item)}</span></span>;
}
