import TitleScreen from '../web/title-screen';
import {requirePageAccount} from '../server/page-account';
export default async function Page() {await requirePageAccount();return <TitleScreen />;}
