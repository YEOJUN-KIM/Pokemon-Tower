import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

const args=['compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml'];
async function compose(...command) {
  const child=spawn('docker',[...args,...command],{windowsHide:true,stdio:'pipe'});
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
  await compose('up','-d',process.argv.includes('--no-build')?'--no-build':'--build');
  const deadline=Date.now()+45000;
  let origin;
  while(Date.now()<deadline) {
    const logs=await compose('logs','--tail=100','tunnel');
    origin=logs.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)?.at(-1);
    if(origin)break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!origin)throw new Error('Tunnel address not available. Check Docker tunnel logs, then retry.');
  const settings=await readFile('.data/preview.env','utf8');
  await writeFile('.data/preview.env',settings.replace(/^TOWER_ORIGIN=.*$/m,`TOWER_ORIGIN=${origin}`));
  // Keep the tunnel running so its hostname does not change while configuring the game.
  await compose('up','-d','--no-deps','--no-build','game');
  console.log(`Preview URL: ${origin}\nKeep the PC and Docker running. Stop with: node scripts/preview.mjs stop`);
} else throw new Error('Use start, status, or stop.');
