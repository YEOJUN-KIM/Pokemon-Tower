import {parseEggMachineTuning,resolveEggMachineTuning,selectTunedEggSpecies} from './egg-machine-tuning';
import {selectEggCandidate} from '../game/egg-machine-tuning';
import {eggMachineTuningRules} from '../data/egg-machine-tuning';
import type {DatabaseSync} from 'node:sqlite';
import {pokemonRarity,eggRarity} from '../data/pokemon-rarity';
import {eggGradeWeights,superRareSpeciesCategory,type EggGrade} from '../data/egg-grades';
import {isEggKind,rareEggCategory,machinePokemonKind,machineShiny} from '../data/egg-kinds';
import {rareEggSpeciesCategory,eggSpeciesGrade} from './egg-pool';
import {permanentPrices,EGG_SHINY_ODDS,type PermanentView,type PermanentResult,type EggResult} from '../data/permanent-upgrades';
import {statKeys,type StatBlock,type IVGain,type TrainingProfile} from '../data/training';
import {trainingOptions} from './training';
import {pokedexEntries} from './pokedex-entries';
import {BattleRequestError} from './request-error';
import {transaction} from './storage/transaction';

// Collection access stays with TowerStore; this module owns permanent purchases,
// hatch rules and their idempotent receipts. All grants remain in one transaction.
export class PermanentShop {
  constructor(
    private readonly db:DatabaseSync,
    private readonly roll:(max:number)=>number,
    private readonly savedTraining:(owner:string,species:string)=>{profile:TrainingProfile;revision:number},
    private readonly unlockedMoves:(owner:string,species:string)=>string[],
  ){}
  view(owner:string):PermanentView {
    const row=this.db.prepare('SELECT reroll_level,shiny_tickets,egg_tickets FROM permanent_upgrades WHERE player_id=?').get(owner) as {reroll_level:number;shiny_tickets:number;egg_tickets:number}|undefined;
    return {...(this.db.prepare('SELECT 1 FROM reward_egg_tickets WHERE player_id=? AND quantity>0').get(owner)?{rewardEggTickets:Object.fromEntries((this.db.prepare('SELECT kind,quantity FROM reward_egg_tickets WHERE player_id=? AND quantity>0').all(owner) as {kind:string;quantity:number}[]).map(r=>[r.kind,r.quantity]))}:{}),retryLimit:(this.db.prepare('SELECT level FROM permanent_retry_upgrades WHERE player_id=?').get(owner) as {level:number}|undefined)?.level??0,rerollLevel:row?.reroll_level??0,rerollLimit:1+(row?.reroll_level??0),shinyTickets:row?.shiny_tickets??0,eggTickets:row?.egg_tickets??0};
  }
  action(owner:string,requestId:unknown,action:unknown,product:unknown,count:unknown,species:unknown,eggKind:unknown='normal',tuningInput:unknown=undefined,rewardTicket=false):PermanentResult {
    if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new BattleRequestError('구매 요청 번호가 올바르지 않습니다.',400);
    if(!['buy','hatch','shiny'].includes(String(action)) || !['reroll','retry','shiny','egg'].includes(String(product)) || (count!==1&&count!==10) || (action!=='hatch' && product!=='egg' && count!==1))throw new BattleRequestError('상품 요청이 올바르지 않습니다.',400);
    if((eggKind!=='machine'&&!isEggKind(eggKind))||(action!=='hatch'&&eggKind!=='normal'))throw new BattleRequestError('알 종류가 올바르지 않습니다.',400);
    if(rewardTicket&&(action!=='hatch'||count!==1||!['superRare','shiny'].includes(String(eggKind))))throw new BattleRequestError('보상 알 티켓 요청이 올바르지 않습니다.',400);
    const tuning=parseEggMachineTuning(tuningInput);
    if(tuning.kind!=='none'&&(action!=='hatch'||product!=='egg'||eggKind!=='machine'))throw new BattleRequestError('조정은 공통 알 뽑기에서만 사용할 수 있습니다.',400);
    // Keep ordinary legacy receipt payloads identical so old retries remain idempotent.
    const payload=JSON.stringify({...(rewardTicket?{rewardTicket:true}:{}),action,product,count,species:species??null,...(eggKind!=='normal'?{eggKind}:{}),...(tuning.kind!=='none'?{tuning}:{})});
    return transaction(this.db,()=>{
      const old=this.db.prepare('SELECT payload,result FROM permanent_receipts WHERE player_id=? AND request_id=?').get(owner,requestId) as {payload:string;result:string}|undefined;
      if(old){
        const previous=JSON.parse(old.payload);
        const legacyHatch=!rewardTicket&&!previous.rewardTicket&&tuning.kind==='none'&&previous.tuning===undefined&&eggKind==='machine'&&action==='hatch'&&previous.eggKind!=='machine'&&previous.action===action&&previous.product===product&&previous.count===count&&previous.species===(species??null);
        if(old.payload!==payload&&!legacyHatch)throw new BattleRequestError('같은 요청 번호에 다른 구매를 보낼 수 없습니다.',409);
        return JSON.parse(old.result) as PermanentResult;
      }
      // Already-paid event receipts remain replayable even when that event is
      // no longer registered. New purchases must resolve a current definition.
      const {matches}=resolveEggMachineTuning(tuning);
      this.db.prepare('INSERT OR IGNORE INTO permanent_upgrades(player_id) VALUES (?)').run(owner);
      const before=this.view(owner);let result:PermanentResult;
      if(action==='buy'){
        if(product==='retry'&&before.retryLimit>=3)throw new BattleRequestError('다시하기는 최대 3회까지 확장할 수 있습니다.',409);
        if(product==='reroll'&&before.rerollLevel>=2)throw new BattleRequestError('리롤은 최대 3회까지 확장할 수 있습니다.',409);
        const price=product==='retry'?permanentPrices.retry[before.retryLimit]:product==='reroll'?permanentPrices.reroll[before.rerollLevel]:product==='shiny'?permanentPrices.shiny:permanentPrices.egg;
        const cost=price*count;
        if(!this.db.prepare('UPDATE players SET growth_points=growth_points-? WHERE id=? AND growth_points>=?').run(cost,owner,cost).changes)throw new BattleRequestError('성장 포인트가 부족합니다.',400);
        const column=product==='reroll'?'reroll_level':product==='shiny'?'shiny_tickets':'egg_tickets';
        if(product==='retry')this.db.prepare('INSERT INTO permanent_retry_upgrades VALUES (?,1) ON CONFLICT(player_id) DO UPDATE SET level=level+1').run(owner);
        else this.db.prepare(`UPDATE permanent_upgrades SET ${column}=${column}+? WHERE player_id=?`).run(count,owner);
        result={message:product==='retry'?`다음 도전부터 다시하기를 ${before.retryLimit+1}회 사용할 수 있어요!`:product==='reroll'?`무료 리롤이 종류별 ${before.rerollLimit+1}회로 확장됐어요!`:`${product==='shiny'?'이로치 교환권':'알 뽑기권'} ${count}장을 받았어요!`};
      }else if(action==='shiny'&&product==='shiny'){
        if(typeof species!=='string'||!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,species))throw new BattleRequestError('보유한 포켓몬을 선택하세요.',400);
        const saved=this.savedTraining(owner,species);
        if(saved.profile.shiny)throw new BattleRequestError('이미 이로치 외형을 해금한 포켓몬입니다.',409);
        if(!this.db.prepare('UPDATE permanent_upgrades SET shiny_tickets=shiny_tickets-1 WHERE player_id=? AND shiny_tickets>0').run(owner).changes)throw new BattleRequestError('이로치 교환권이 없습니다.',400);
        this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,species,JSON.stringify({...saved.profile,shiny:true}),saved.revision+1);
        result={message:'이로치 외형을 해금했어요! 다음 도전부터 적용됩니다.'};
      }else if(action==='hatch'&&product==='egg'){
        const unitPrice=tuning.kind==='none'?permanentPrices.egg:eggMachineTuningRules.focusedPrice;
        const tickets=rewardTicket?0:Math.min(count,before.eggTickets),cost=rewardTicket?0:(count-tickets)*unitPrice;
        if(rewardTicket&&!this.db.prepare('UPDATE reward_egg_tickets SET quantity=quantity-1 WHERE player_id=? AND kind=? AND quantity>0').run(owner,String(eggKind)).changes)throw new BattleRequestError('해당 보상 알 티켓이 없습니다.',409);
        if(!this.db.prepare('UPDATE players SET growth_points=growth_points-? WHERE id=? AND growth_points>=?').run(cost,owner,cost).changes)throw new BattleRequestError('티켓을 사용하고 남은 뽑기에 필요한 성장 포인트가 부족합니다.',400);
        this.db.prepare('UPDATE permanent_upgrades SET egg_tickets=egg_tickets-? WHERE player_id=?').run(tickets,owner);
        const pool=pokedexEntries().filter(entry=>entry.battleReady!==false).map(entry=>entry.species),eggs:EggResult[]=[];
        const tuned=tuning.kind!=='none';
        for(let i=0;i<count;i++){
          const kind=eggKind==='machine'?machinePokemonKind(this.roll(10000)):eggKind;
          const normalMachine=eggKind==='machine'&&kind==='normal';
          const rarity=tuned?null:kind==='superRare'?superRareSpeciesCategory(this.roll(eggGradeWeights.superRare)):kind==='rare'?rareEggCategory(this.roll(eggKind==='machine'?8500:10000)):normalMachine?'normal':eggRarity(this.roll(10000));
          const candidates=pool.filter(name=>tuned?eggSpeciesGrade(name)===kind:kind==='rare'||kind==='superRare'?rareEggSpeciesCategory(name)===rarity:normalMachine?eggSpeciesGrade(name)==='normal':pokemonRarity(name)===rarity);
          if(!candidates.length)throw new BattleRequestError('뽑기 대상 데이터를 확인해야 합니다.',500);
          // Active tuning is validated above to be a machine draw (EggGrade).
          const name=tuned?selectTunedEggSpecies(candidates,kind as EggGrade,matches!,this.roll):selectEggCandidate(candidates,null,this.roll);
          const saved=this.savedTraining(owner,name),isNew=!this.db.prepare('SELECT 1 FROM unlocks WHERE player_id=? AND species=?').get(owner,name);
          const ivs=Object.fromEntries(statKeys.map(stat=>[stat,this.roll(32)])) as StatBlock;
          const improved=Object.fromEntries(statKeys.map(stat=>[stat,Math.max(saved.profile.ivs[stat],ivs[stat])])) as StatBlock;
          const ivGain:IVGain={species:name,changes:statKeys.filter(stat=>improved[stat]>saved.profile.ivs[stat]).map(stat=>({stat,from:saved.profile.ivs[stat],to:improved[stat]}))};
          const legal=trainingOptions(name).learnableMoves,known=this.unlockedMoves(owner,name),move=legal.length?legal[this.roll(legal.length)]:null,newMoves=move&&!known.includes(move)?[move]:[];
          const shiny=eggKind==='machine'?machineShiny(this.roll(10000)):kind==='shiny'||this.roll(EGG_SHINY_ODDS)===0,newShiny=shiny&&!saved.profile.shiny;
          this.db.prepare('INSERT OR IGNORE INTO unlocks VALUES (?,?)').run(owner,name);
          if(isNew||ivGain.changes.length||newShiny)this.db.prepare('INSERT INTO pokemon_training VALUES (?,?,?,?) ON CONFLICT(player_id,species) DO UPDATE SET profile=excluded.profile,revision=excluded.revision').run(owner,name,JSON.stringify({...saved.profile,ivs:improved,shiny:!!saved.profile.shiny||shiny}),saved.revision+1);
          for(const move of newMoves)this.db.prepare('INSERT OR IGNORE INTO move_unlocks VALUES (?,?,?)').run(owner,name,move);
          const rareCategory=rareEggSpeciesCategory(name);
          eggs.push({eggKind:shiny?'shiny':eggSpeciesGrade(name),...(rareCategory?{rareCategory}:{}),species:name,ivs,isNew,ivGain,newMoves,shiny,newShiny});
        }
        result={message:`${count}개의 알이 부화했어요!`,eggs,...(eggKind!=='machine'?{eggKind}:{})};
      }else throw new BattleRequestError('교환 요청이 올바르지 않습니다.',400);
      this.db.prepare('INSERT INTO permanent_receipts VALUES (?,?,?,?)').run(owner,requestId,payload,JSON.stringify(result));
      return result;
    });
  }
}
