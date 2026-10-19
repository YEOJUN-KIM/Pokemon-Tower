import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { BattleRequestError } from '../../../server/request-error';
import { getTowerService, playerKey } from '../../../server/tower-service';
import {Accounts,authCookie} from '../../../server/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const COOKIE = 'tower_session';
const headers = {'Cache-Control': 'no-store'};
const token = (request: NextRequest) => {
  const value = request.cookies.get(COOKIE)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
};
const failure = (error: unknown) => {
  if (error instanceof BattleRequestError) return NextResponse.json({error: error.message}, {status: error.status, headers});
  console.error('Battle API error', error);
  return NextResponse.json({error: '요청을 처리하지 못했습니다. 다시 시도해 주세요.'}, {status: 500, headers});
};

export async function GET(request: NextRequest) {
  try {
    const existing = token(request);
    let owner = existing ?? randomBytes(32).toString('hex');
    const service = getTowerService();
    if(service.store.db.prepare('SELECT 1 FROM accounts WHERE player_id=?').get(playerKey(owner)))owner=randomBytes(32).toString('hex');
    const player=new Accounts(service.store.db).session(request.cookies.get(authCookie)?.value??null)?.player_id??playerKey(owner);
    service.store.ensurePlayer(player);
    const response = NextResponse.json(request.nextUrl.searchParams.get('view') === 'collection'
      ? {battle:null,tower:service.store.view(player),training:service.store.trainingCollection(player)}
      : await service.state(player), {headers});
    response.cookies.set(COOKIE, owner, {
      httpOnly: true, sameSite: 'strict', secure: process.env.TOWER_ORIGIN ? new URL(process.env.TOWER_ORIGIN).protocol === 'https:' : request.nextUrl.protocol === 'https:', path: '/', maxAge: 365 * 86400,
    });
    return response;
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    // NextURL normalizes 127.0.0.1 to localhost; compare the browser's actual Host.
    // Do not trust arbitrary forwarded-host headers. A reverse proxy can set TOWER_ORIGIN explicitly.
    const expectedOrigin = process.env.TOWER_ORIGIN || `${request.nextUrl.protocol}//${request.headers.get('host')}`;
    if (request.headers.get('origin') !== expectedOrigin) throw new BattleRequestError('허용되지 않은 요청 출처입니다.', 403);
    const owner = token(request);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new BattleRequestError('JSON 요청이 필요합니다.', 400);
    const text = await request.text();
    if (text.length > 4096) throw new BattleRequestError('요청이 너무 큽니다.', 413);
    let body;
    try { body = JSON.parse(text); } catch { throw new BattleRequestError('잘못된 JSON 요청입니다.', 400); }
    if (!body || typeof body !== 'object') throw new BattleRequestError('잘못된 요청입니다.', 400);
    const service = getTowerService();
    const account=new Accounts(service.store.db).session(request.cookies.get(authCookie)?.value??null);
    if(!owner&&!account)throw new BattleRequestError('화면을 새로고침한 뒤 다시 시도해 주세요.',401);
    if(!account&&owner&&service.store.db.prepare('SELECT 1 FROM accounts WHERE player_id=?').get(playerKey(owner)))throw new BattleRequestError('이 저장은 계정에 연결됐습니다. 로그인하세요.',401);
    const player = account?.player_id??playerKey(owner!);
    service.store.ensurePlayer(player);
    if(body.type==='permanent'){
      const permanentResult=service.store.permanentAction(player,body.requestId,body.action==='hatch-reward'?'hatch':body.action,body.product,body.count,body.species,body.action==='hatch-reward'?body.eggKind:body.action==='hatch'?'machine':undefined,body.tuning,body.action==='hatch-reward');
      return NextResponse.json({battle:null,tower:service.store.view(player),training:service.store.trainingCollection(player),permanentResult},{headers});
    }
    if((body.type==='event-choice'||body.type==='event-continue'||body.type==='event-reward-select'||body.type==='hidden-shop-purchase') && typeof body.runId==='string' && typeof body.eventId==='string'){
      if(body.type==='event-choice')service.store.chooseEvent(player,body.runId,body.eventId,body.choice);
      else if(body.type==='event-reward-select')service.store.selectEventReward(player,body.runId,body.eventId,body.selectionId,body.candidateId);
      else if(body.type==='hidden-shop-purchase')service.store.purchaseHiddenShop(player,body.runId,body.eventId,body.productId,body.destination??'bag',body.species??null);
      else service.store.continueEvent(player,body.runId,body.eventId);
      return NextResponse.json(await service.state(player),{headers});
    }
    if(body.type==='reward-use' && typeof body.runId==='string'){service.store.useReward(player,body.runId,body.requestId,body.entryId,body.choiceId);return NextResponse.json(await service.state(player),{headers});}
    if(body.type==='bag-use' && typeof body.runId==='string'){service.store.useBag(player,body.runId,body.requestId,body.entryId,body.target??null,body.slot??null);return NextResponse.json(await service.state(player),{headers});}
    if(body.type==='favorite') {
      service.store.setFavorite(player,body.species,body.enabled);
      return NextResponse.json({tower:service.store.view(player)},{headers});
    }
    if(body.type==='adjust-run' && typeof body.runId==='string' && Number.isSafeInteger(body.floor) && typeof body.snapshot==='string' && typeof body.species==='string' && Number.isSafeInteger(body.revision)){service.store.train(player,body.species,body.revision,body.profile,{id:body.runId,floor:body.floor,snapshot:body.snapshot});return NextResponse.json(await service.state(player),{headers});}
    if(body.type==='train' && typeof body.species==='string' && Number.isSafeInteger(body.revision)) {
      service.store.train(player,body.species,body.revision,body.profile);
      return NextResponse.json({battle:null,tower:service.store.view(player),training:service.store.trainingCollection(player)},{headers});
    }
    if(body.type==='reroll-shop' && typeof body.runId==='string' && Number.isSafeInteger(body.floor)) {service.store.rerollShop(player,body.runId,body.floor,body.kind,body.revision);return NextResponse.json(await service.state(player),{headers});}
    if(body.type==='purchase-tera' && typeof body.runId==='string' && Number.isSafeInteger(body.floor)){service.store.purchaseTera(player,body.runId,body.floor);return NextResponse.json(await service.state(player),{headers});}
    if(body.type==='purchase-vitamin' && typeof body.runId==='string' && Number.isSafeInteger(body.floor)) {service.store.purchaseVitamin(player,body.runId,body.floor,body.stat,body.species);return NextResponse.json(await service.state(player),{headers});}
    if(body.type==='purchase' && typeof body.runId==='string' && Number.isSafeInteger(body.floor)) {
      service.store.purchase(player,body.runId,body.floor,body.kind);
      return NextResponse.json(await service.state(player),{headers});
    }
    if(body.type==='purchase-machine' && typeof body.runId==='string' && Number.isSafeInteger(body.floor)) {
      service.store.purchaseMachine(player,body.runId,body.floor,body.move,body.species,body.slot,body.revision??0);
      return NextResponse.json(await service.state(player),{headers});
    }
    if(body.type==='purchase-item' && typeof body.runId==='string' && Number.isSafeInteger(body.floor)) {
      service.store.purchaseItem(player,body.runId,body.floor,body.item,body.species,body.revision??0,body.product);
      return NextResponse.json(await service.state(player),{headers});
    }
    if(body.type==='equip-item' && typeof body.runId==='string' && Number.isSafeInteger(body.floor)) {
      service.store.equipItem(player,body.runId,body.floor,body.species,body.item,body.swapFrom);
      return NextResponse.json(await service.state(player),{headers});
    }
    if (body.type === 'start') {
      service.store.start(player, body.selected,body.rule ?? 'basic',{events:true});
      return NextResponse.json(await service.state(player), {headers});
    }
    if(body.type==='retry'&&typeof body.runId==='string'&&typeof body.battleId==='string'){
      service.store.retry(player,body.runId,body.battleId);
      return NextResponse.json(await service.state(player),{headers});
    }
    if(body.type==='finish-loss'&&typeof body.runId==='string'){
      service.store.finishLoss(player,body.runId);
      return NextResponse.json(await service.state(player),{headers});
    }
    if (body.type === 'enter' && typeof body.runId === 'string' && Number.isSafeInteger(body.floor)) {
      service.store.enter(player, body.runId, body.floor, body.selected);
      return NextResponse.json(await service.state(player), {headers});
    }
    if (body.type === 'recruit' && typeof body.runId === 'string' && typeof body.battleId === 'string' &&
      (body.chosen === null || typeof body.chosen === 'string') && (body.replaced === null || typeof body.replaced === 'string')) {
      service.store.recruit(player, body.runId, body.battleId, body.chosen, body.replaced, body.moveSwap, body.collectOnly ?? false);
      return NextResponse.json(await service.state(player), {headers});
    }
    if (body.type === 'abandon' && typeof body.runId === 'string') {
      return NextResponse.json(await service.abandon(player, body.runId), {headers});
    }
    if (body.type !== 'action' || typeof body.battleId !== 'string' || !Number.isSafeInteger(body.requestId) || typeof body.action !== 'string') {
      throw new BattleRequestError('행동 요청 형식이 올바르지 않습니다.', 400);
    }
    return NextResponse.json(await service.action(player, body.battleId, body.requestId, body.action), {headers});
  } catch (error) { return failure(error); }
}
