import {NextRequest,NextResponse} from 'next/server';
import {Accounts,authCookie,guestCookie,sessionSeconds} from '../../../../server/accounts';
import {getTowerService} from '../../../../server/tower-service';
import {localAccountUsername} from '../../../../server/local-account';
import {accountDestination} from '../../../../server/page-account';
import {randomBytes} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request:NextRequest) {
 const username=localAccountUsername(request.headers);
 if(!username)return new NextResponse(null,{status:404});
 const accounts=new Accounts(getTowerService().store.db);
 const current=accounts.session(request.cookies.get(authCookie)?.value??null);
 const result=current?null:accounts.loginLocal(username);
 if(!current&&!result)return new NextResponse('Local account not found',{status:404});
 const destination=accountDestination(request.nextUrl.searchParams.get('next'));
 const response=NextResponse.redirect(new URL(destination,`http://${request.headers.get('host')}`));
 response.headers.set('Cache-Control','no-store');
 if(result){
  response.cookies.set(authCookie,result.token,{httpOnly:true,sameSite:'strict',secure:false,path:'/',maxAge:sessionSeconds});
  response.cookies.set(guestCookie,randomBytes(32).toString('hex'),{httpOnly:true,sameSite:'strict',secure:false,path:'/',maxAge:365*86400});
 }
 return response;
}
