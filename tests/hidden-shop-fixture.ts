import {randomUUID} from 'node:crypto';
import {TowerStore} from '../src/server/tower-store';
import {HiddenShop,hiddenShopProducts} from '../src/server/hidden-shop';
import {starters} from '../src/data/teams';
import type {BattleRule} from '../src/data/run-rules';
import type {HiddenShopSnapshot,HiddenShopCurrency} from '../src/data/hidden-shop';

export function hiddenShopFixture(path=':memory:',owner='owner',rule:BattleRule='chaos'){
 const store=new TowerStore(path,()=>0);store.ensurePlayer(owner);
 const battle=store.start(owner,starters,rule),run=store.battle(battle).run_id;
 store.db.prepare("UPDATE battles SET status='complete' WHERE id=?").run(battle);
 store.db.prepare("UPDATE runs SET state='recruit' WHERE id=?").run(run);
 store.recruit(owner,run,battle,null,null);
 const eventId=randomUUID();
 store.db.prepare("INSERT INTO run_events(id,run_id,after_floor,kind,status) VALUES (?,?,1,'hidden-shop','choice')").run(eventId,run);
 new HiddenShop(store.db).create(eventId,run);
 const products=hiddenShopProducts(store.db,run);
 const pin=(ids:string[],currencies:HiddenShopCurrency[]=[])=>{
  const snapshot:HiddenShopSnapshot={version:1,purchaseLimit:2,offers:ids.map((id,i)=>{
   const p=products.find(p=>p.id===id);if(!p)throw Error(`Missing fixture product ${id}`);
   const {allowedCurrencies:_,prices,...product}=p,currency=currencies[i]??'coins';
   return {...product,currency,price:prices[currency][0],purchased:false};
  })};
  store.db.prepare('UPDATE hidden_shop_events SET snapshot_json=? WHERE event_id=?').run(JSON.stringify(snapshot),eventId);
  return snapshot;
 };
 store.db.prepare('UPDATE players SET coins=50000,growth_points=10000 WHERE id=?').run(owner);
 return {store,run,eventId,owner,products,pin};
}
