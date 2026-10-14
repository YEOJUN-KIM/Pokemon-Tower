import {isHeldItem,itemName,itemIcon,itemIconExtension} from '../data/held-items';
import {itemShopRule,rarityColors} from '../data/held-item-shop';

export function HeldItemLabel({item,colored=false}:{item?:string|null;colored?:boolean}){
  return <span className="held-item-label">{isHeldItem(item) && <img className="held-item-icon" src={`/sprites/items/${itemIcon(item)}.${itemIconExtension(item)}`} width={24} height={24} alt="" aria-hidden="true" onError={event=>{event.currentTarget.style.visibility='hidden';}}/>}<span style={colored && isHeldItem(item) ? {color:rarityColors[itemShopRule(item).rarity]} : undefined}>{itemName(item)}</span></span>;
}
