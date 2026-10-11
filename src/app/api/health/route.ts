import {getTowerService} from '../../../server/tower-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    getTowerService().store.db.prepare('SELECT 1').get();
    return Response.json({status:'ok'}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({status:'unavailable'}, {status:503, headers:{'Cache-Control':'no-store'}});
  }
}
