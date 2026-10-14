import {HeldItemLabel} from './held-item-label';
import {itemName} from '../data/held-items';
import type {TrainerEquipment as Equipment} from '../data/trainer-equipment';
export function TrainerEquipment({items}:{items:readonly Equipment[]}){
 if(!items.length)return null;
 return <div className="trainer-equipment" role="group" aria-label="보유 트레이너 장비" data-testid="trainer-equipment">{items.map(item=><span className="trainer-equipment-slot" role="img" aria-label={itemName(item)} key={item} data-equipment={item} title={itemName(item)}><HeldItemLabel item={item}/></span>)}</div>;
}
