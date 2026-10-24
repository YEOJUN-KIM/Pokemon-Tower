import AccountScreen from '../../web/account-screen';
import {redirect} from 'next/navigation';
import {accountDestination,pageAccount} from '../../server/page-account';
import {headers} from 'next/headers';
import {localAccountUsername} from '../../server/local-account';
export default async function Page({searchParams}:{searchParams:Promise<{next?:string;mode?:string}>}) {
  const params=await searchParams,destination=accountDestination(params.next);
  const account=await pageAccount();
  if(!account&&localAccountUsername(await headers()))redirect(`/api/account/local?next=${encodeURIComponent(destination)}`);
  if(account)redirect(destination);
  const mode=params.mode==='register'||params.mode==='reset'?params.mode:'login';
  return <AccountScreen key={mode} mode={mode} destination={destination}/>;
}
