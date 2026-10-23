import {NextRequest,NextResponse} from 'next/server';
import {Accounts,authCookie} from '../../../server/accounts';
import {getTowerService} from '../../../server/tower-service';
import {TutorialService} from '../../../server/tutorial-service';
import {transaction} from '../../../server/storage/transaction';
import {BattleRequestError} from '../../../server/request-error';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function context(request:NextRequest){
  const store=getTowerService().store;
  const account=new Accounts(store.db).session(request.cookies.get(authCookie)?.value??null);
  if(!account)throw new BattleRequestError('로그인이 필요합니다.',401);
  store.ensurePlayer(account.player_id);
  return {db:store.db,owner:account.player_id,tutorial:new TutorialService(store.db)};
}
const failure=(error:unknown)=>NextResponse.json({error:error instanceof BattleRequestError?error.message:'튜토리얼 상태를 저장하지 못했습니다.'},{status:error instanceof BattleRequestError?error.status:500,headers});
export function GET(request:NextRequest){try{const {owner,tutorial}=context(request);return NextResponse.json(tutorial.view(owner),{headers});}catch(error){return failure(error);}}
export async function POST(request:NextRequest){try{
  const origin=process.env.TOWER_ORIGIN||`${request.nextUrl.protocol}//${request.headers.get('host')}`;
  if(request.headers.get('origin')!==origin)throw new BattleRequestError('허용되지 않은 요청 출처입니다.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new BattleRequestError('JSON 요청이 필요합니다.',400);
  const text=await request.text();if(text.length>2048)throw new BattleRequestError('요청이 너무 큽니다.',413);
  const body=JSON.parse(text),{db,owner,tutorial}=context(request);
  const state=transaction(db,()=>{tutorial.action(owner,body.event,body.expected,body.party,body.species);return tutorial.view(owner);});
  return NextResponse.json(state,{headers});
}catch(error){return failure(error);}}
