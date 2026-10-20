import {cookies,headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {Accounts,authCookie} from './accounts';
import {getTowerService} from './tower-service';
import {localAccountUsername} from './local-account';

export function accountDestination(value:unknown) {
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return '/';
  const url=new URL(value,'http://internal');
  if(url.origin!=='http://internal'||!['/','/battle','/pokedex','/upgrades','/eggs','/settings'].includes(url.pathname))return '/';
  return url.pathname+url.search;
}
export async function pageAccount() {
  const cookie=(await cookies()).get(authCookie)?.value??null;
  return new Accounts(getTowerService().store.db).session(cookie);
}
export async function requirePageAccount(destination='/') {
  const account=await pageAccount();
  if(!account){
    const next=encodeURIComponent(accountDestination(destination));
    if(localAccountUsername(await headers()))redirect(`/api/account/local?next=${next}`);
    redirect(`/account?next=${next}`);
  }
  return account;
}
