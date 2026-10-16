import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {findQuickTunnelOrigin, describeQuickTunnelFailure} from './lib/preview-origin.mjs';

const args=['compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml'];
async function compose(...command) {
  return docker(...args,...command);
}
async function docker(...command) {
  const child=spawn('docker',command,{windowsHide:true,stdio:'pipe'});
  let output='';
  child.stdout.on('data',chunk=>output+=chunk);
  child.stderr.on('data',chunk=>output+=chunk);
  const [code]=await once(child,'exit');
  if(code!==0)throw new Error(output);
  return output;
}
await mkdir('.data',{recursive:true});
try {await readFile('.data/preview.env');}
catch(error) {
  if(error.code!=='ENOENT')throw error;
  await writeFile('.data/preview.env','TOWER_PORT=3004\nTOWER_ORIGIN=https://preview.invalid\n');
}
const action=process.argv[2] || 'start';
if(action==='stop') {
  console.log(await compose('down'));
  console.log('Preview stopped. Its saved database volume is retained.');
} else if(action==='status') {
  console.log(await compose('ps'));
  console.log(await readFile('.data/preview.env','utf8'));
} else if(action==='start') {
  console.log('Starting preview server and temporary HTTPS tunnel...');
  if(!process.argv.includes('--no-build'))await compose('build','game');
  // Back up the volume before the new server can migrate its saved database.
  const backup=`/data/backups/before-launch-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`;
  console.log(await compose('run','--rm','--no-deps','--entrypoint','node','game','-e',
    `const {existsSync}=require('node:fs');const {spawnSync}=require('node:child_process');if(existsSync('/data/tower.sqlite'))process.exit(spawnSync(process.execPath,['scripts/backup-db.mjs',${JSON.stringify(backup)}],{stdio:'inherit'}).status??1);else console.log('New save volume: no existing database to back up.');`));
  await compose('up','-d','--no-build');
  console.log('SERVER_STATE=running');
  const tunnelId=(await compose('ps','-q','tunnel')).trim();
  if(!tunnelId)throw new Error('Tunnel container did not start.');
  const startedAt=(await docker('inspect','--format','{{.State.StartedAt}}',tunnelId)).trim();
  const deadline=Date.now()+45000;
  let origin;
  let lastTunnelLogs='';
  while(Date.now()<deadline) {
    lastTunnelLogs=await compose('logs','--since',startedAt,'--tail=100','tunnel');
    const state=(await docker('inspect','--format','{{.State.Status}}',tunnelId)).trim();
    if(state==='exited'||state==='dead')break;
    origin=findQuickTunnelOrigin(lastTunnelLogs);
    if(origin)break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!origin)throw new Error(`${describeQuickTunnelFailure(lastTunnelLogs)}\n\n[Cloudflare tunnel logs]\n${lastTunnelLogs}`);
  const settings=await readFile('.data/preview.env','utf8');
  await writeFile('.data/preview.env',settings.replace(/^TOWER_ORIGIN=.*$/m,`TOWER_ORIGIN=${origin}`));
  // Keep the tunnel running so its hostname does not change while configuring the game.
  await compose('up','-d','--no-deps','--no-build','game');
  console.log(`Preview URL: ${origin}\nKeep the PC and Docker running. Stop with: node scripts/preview.mjs stop`);
} else throw new Error('Use start, status, or stop.');
