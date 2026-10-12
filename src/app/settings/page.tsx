import SettingsScreen from '../../web/settings-screen';
import {requirePageAccount} from '../../server/page-account';
export default async function Page() {const account=await requirePageAccount('/settings');return <SettingsScreen username={account.username} />;}
