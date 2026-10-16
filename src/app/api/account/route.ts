import {NextRequest,NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {Accounts,authCookie,guestCookie,sessionSeconds} from '../../../server/accounts';
import {getTowerService,playerKey} from '../../../server/tower-service';
import {BattleRequestError} from '../../../server/request-error';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export function GET(request:NextRequest) {
  const db=getTowerService().store.db;
  const account=new Accounts(db).session(request.cookies.get(authCookie)?.value??null);
  const saved=account?db.prepare('SELECT audio FROM player_settings WHERE player_id=?').get(account.player_id) as {audio:string}|undefined:undefined;
  return NextResponse.json({username:account?.username??null,audio:saved?JSON.parse(saved.audio):null},{headers});
}
export async function POST(request:NextRequest) {
  try {
    const origin=process.env.TOWER_ORIGIN||`${request.nextUrl.protocol}//${request.headers.get('host')}`;
    if(request.headers.get('origin')!==origin)throw new BattleRequestError('허용되지 않은 요청 출처입니다.',403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new BattleRequestError('JSON 요청이 필요합니다.',400);
    const text=await request.text();
    if(text.length>4096)throw new BattleRequestError('요청이 너무 큽니다.',413);
    let body;
    try {body=JSON.parse(text);}catch {throw new BattleRequestError('잘못된 요청입니다.',400);}
    if(!body||typeof body!=='object')throw new BattleRequestError('잘못된 요청입니다.',400);
    const store=getTowerService().store,accounts=new Accounts(store.db);
    const current=request.cookies.get(authCookie)?.value??null;
    if(body.action==='settings') {
      const account=accounts.session(current);
      if(!account)throw new BattleRequestError('로그인이 필요합니다.',401);
      const audio=body.audio;
      if(!audio||typeof audio.muted!=='boolean'||![audio.musicVolume,audio.effectsVolume].every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100))throw new BattleRequestError('소리 설정을 확인하세요.',400);
      const value={muted:audio.muted,musicVolume:audio.musicVolume,effectsVolume:audio.effectsVolume};
      store.db.prepare('INSERT INTO player_settings VALUES (?,?) ON CONFLICT(player_id) DO UPDATE SET audio=excluded.audio').run(account.player_id,JSON.stringify(value));
      return NextResponse.json({audio:value},{headers});
    }
    let result:{username:string;token:string;recoveryKey?:string}|null=null;
    if(body.action==='logout')accounts.logout(current);
    else if(body.action==='login')result=await accounts.login(body.username,body.password);
    else if(body.action==='reset')result=await accounts.reset(body.username,body.password,body.recoveryKey);
    else if(body.action==='register') {
      if(accounts.session(current))throw new BattleRequestError('로그아웃한 뒤 새 계정을 만드세요.',409);
      const guest=request.cookies.get(guestCookie)?.value;
      const owner=playerKey(guest&&/^[a-f0-9]{64}$/.test(guest)?guest:randomBytes(32).toString('hex'));
      result=await accounts.register(body.username,body.password,owner,body.claimCode);
    } else throw new BattleRequestError('요청을 확인하세요.',400);
    const response=NextResponse.json({username:result?.username??null,...(result?.recoveryKey?{recoveryKey:result.recoveryKey}:{})},{headers});
    response.cookies.set(authCookie,result?.token??'',{httpOnly:true,sameSite:'strict',secure:new URL(origin).protocol==='https:',path:'/',maxAge:result?sessionSeconds:0});
    response.cookies.set(guestCookie,randomBytes(32).toString('hex'),{httpOnly:true,sameSite:'strict',secure:new URL(origin).protocol==='https:',path:'/',maxAge:365*86400});
    return response;
  }catch(error) {
    if(error instanceof BattleRequestError)return NextResponse.json({error:error.message},{status:error.status,headers});
    console.error('Account request failed');
    return NextResponse.json({error:'계정 요청을 처리하지 못했습니다.'},{status:500,headers});
  }
}
