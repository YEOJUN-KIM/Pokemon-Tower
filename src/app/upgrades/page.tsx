import PermanentShop from '../../web/permanent-shop';
import {requirePageAccount} from '../../server/page-account';
export default async function Page(){await requirePageAccount('/upgrades');return <PermanentShop page="upgrades"/>;}
