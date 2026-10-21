import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve,sep} from 'node:path';

const cases=[
  {name:'no global pnpm, fresh dependencies'},
  {name:'other global pnpm is ignored',globalPnpm:true},
  {name:'Node missing',node:false,stage:'bootstrap'},
  {name:'Node 22',version:'22.0.0',stage:'environment check'},
  {name:'npm missing',npm:false,stage:'environment check'},
  {name:'npx missing uses npm exec',npx:false},
  {name:'network install failure',code:17,stage:'dependency install'},
  {name:'lockfile mismatch',code:42,stage:'dependency install'},
  {name:'existing node_modules, repeated install',repeat:true},
  {name:'launcher error',launchCode:23,stage:'launch'},
  {name:'npm wrapper exits entire child shell',bareExit:true,stage:'dependency install',code:31},
  {name:'script exception',exception:'caught',stage:'environment check'},
  {name:'uncaught exception',exception:'uncaught',stage:'environment check'},
  {name:'unhandled rejection',exception:'rejection',stage:'environment check'},
  {name:'Node loader failure',exception:'syntax',stage:'bootstrap'},
  {name:'project log folder unavailable, TEMP fallback',fallback:true},
  {name:'ZIP LF bootstrap',lf:true},
  {name:'stderr and secret redaction',redaction:true},
];
const paths=['Pokemon-Tower','Downloads/Pokemon-Tower','Pokemon Tower','포켓몬 타워 & 괄호 (설치)'];
const logFiles=directory=>existsSync(directory)&&statSync(directory).isDirectory()?readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?logFiles(join(directory,entry.name)):entry.name.endsWith('.log')?[join(directory,entry.name)]:[]):[];
for(const folder of paths)for(const scenario of cases)test(`Windows setup ${folder}: ${scenario.name}`,{skip:process.platform!=='win32'},()=>{
  const temporary=resolve('artifacts/temporary');mkdirSync(temporary,{recursive:true});
  const fixture=mkdtempSync(join(temporary,'setup-diagnostics-'));
  const root=join(fixture,folder),tools=join(fixture,'tool space'),temp=join(fixture,'temp');
  for(const directory of [root,tools,temp,join(root,'scripts'),join(root,'.data')])mkdirSync(directory,{recursive:true});
  const callsFile=join(fixture,'calls.txt');
  const cmd=(path,text)=>writeFileSync(path,text.replace(/\r?\n/g,'\r\n'));
  try{
    let bootstrap=readFileSync('포켓몬타워 설치.cmd','utf8');
    if(scenario.lf)bootstrap=bootstrap.replace(/\r\n/g,'\n');
    writeFileSync(join(root,'포켓몬타워 설치.cmd'),bootstrap);
    let setup=readFileSync('scripts/setup-windows.mjs','utf8');
    if(scenario.exception==='caught')setup=setup.replace('async function main(){',"async function main(){throw Error('fixture exception');");
    if(scenario.exception==='uncaught')setup=setup.replace('async function main(){',"async function main(){setImmediate(()=>{throw Error('fixture uncaught exception');});await new Promise(()=>{});");
    if(scenario.exception==='rejection')setup=setup.replace('async function main(){',"async function main(){Promise.reject(Error('fixture rejection'));await new Promise(()=>{});");
    if(scenario.exception==='syntax')setup+='\ninvalid syntax here {\n';
    writeFileSync(join(root,'scripts','setup-windows.mjs'),setup);
    copyFileSync('scripts/setup-node-required.txt',join(root,'scripts','setup-node-required.txt'));
    cmd(join(root,'포켓몬타워 로컬 실행.cmd'),'@echo off\n>>"%SETUP_TEST_CALLS%" echo launch\nexit /b %SETUP_TEST_LAUNCH_CODE%\n');
    writeFileSync(join(root,'.data','tower.sqlite'),'save sentinel');
    writeFileSync(join(root,'.env.local'),'env sentinel');
    if(scenario.fallback)writeFileSync(join(root,'.data','setup-logs'),'blocked log directory');
    if(scenario.repeat){mkdirSync(join(root,'node_modules'));writeFileSync(join(root,'node_modules','sentinel'),'keep dependencies');}
    const preload=join(fixture,'preload.cjs');
    writeFileSync(preload,`Object.defineProperty(process.versions,'node',{value:${JSON.stringify(scenario.version??'24.20.0')}});`);
    cmd(join(tools,'where.cmd'),`@echo off
if "%SETUP_TEST_NODE%"=="missing" exit /b 1
echo %SETUP_TEST_REAL_NODE%
exit /b 0
`);
    if(scenario.npm!==false)cmd(join(tools,'npm.cmd'),`@echo off
>>"%SETUP_TEST_CALLS%" echo npm %*
if "%~1"=="--version" echo 11.0.0
if "%~1"=="--version" exit /b 0
echo fixture install stdout
echo fixture install stderr 1>&2
echo %SETUP_TEST_SECRET_TOKEN%
if "%SETUP_TEST_BARE_EXIT%"=="1" exit 31
exit /b %SETUP_TEST_INSTALL_CODE%
`);
    if(scenario.npx!==false)cmd(join(tools,'npx.cmd'),'@echo off\necho 11.0.0\nexit /b 0\n');
    if(scenario.globalPnpm)cmd(join(tools,'pnpm.cmd'),'@echo off\n>>"%SETUP_TEST_CALLS%" echo GLOBAL PNPM CALLED\nexit /b 99\n');
    const run=()=>spawnSync(process.env.ComSpec??'cmd.exe',['/d','/c',`call "${join(root,'포켓몬타워 설치.cmd')}"`],{
      cwd:fixture,encoding:'utf8',input:'\r\n',timeout:20000,windowsVerbatimArguments:true,
      env:{...process.env,PATH:`${tools};${join(process.env.SystemRoot,'System32')}`,TEMP:temp,TMP:temp,
        NODE_OPTIONS:`--require="${preload.replaceAll('\\','/')}"`,SETUP_TEST_REAL_NODE:process.execPath,
        SETUP_TEST_CALLS:callsFile,SETUP_TEST_NODE:scenario.node===false?'missing':'present',
        SETUP_TEST_INSTALL_CODE:String(scenario.code??0),SETUP_TEST_LAUNCH_CODE:String(scenario.launchCode??0),
        SETUP_TEST_BARE_EXIT:scenario.bareExit?'1':'0',SETUP_TEST_SECRET_TOKEN:'fixture-secret-not-for-log'},
    });
    const result=run(),output=result.stdout+result.stderr;
    assert.equal(result.error,undefined,output);
    const expected=scenario.stage?(scenario.code??scenario.launchCode??1):0;
    assert.equal(result.status,expected,output);
    assert.match(output,/Press any key|계속하려면/);
    let logs=[...logFiles(join(root,'.data','setup-logs')),...logFiles(temp)];
    assert.equal(logs.length,1,output);
    const log=readFileSync(logs[0],'utf8');
    assert.ok(output.includes(logs[0]),output);
    assert.ok(log.includes('[STEP] bootstrap'),log);
    assert.ok(!log.includes('fixture-secret-not-for-log'),log);
    assert.ok(!log.includes(process.env.PATH),log);
    if(scenario.stage){
      assert.ok(log.includes('SETUP RESULT: FAILED'),log);
      assert.ok(log.includes(`Stage: ${scenario.stage}`),log);
      assert.ok(log.includes(`Exit code: ${expected}`),log);
      if(scenario.exception)assert.match(log,/fixture|SyntaxError/);
    }else{
      assert.ok(log.endsWith('SETUP RESULT: SUCCESS\nDependencies installed successfully.\nLauncher started.\n'),log);
      assert.ok(log.includes('[STEP] launch'),log);
    }
    const calls=existsSync(callsFile)?readFileSync(callsFile,'utf8'):'';
    assert.ok(!/GLOBAL PNPM|--global|prefix/.test(calls),calls);
    if(!scenario.stage)assert.ok(calls.includes('npm exec --yes --package=pnpm@11.19.0 -- pnpm install --frozen-lockfile'),calls);
    if(scenario.redaction){assert.ok(log.includes('[REDACTED]'),log);assert.ok(log.includes('[stderr] fixture install stderr'),log);}
    if(scenario.fallback)assert.ok(logs[0].startsWith(temp+sep));
    if(scenario.repeat){assert.equal(run().status,0);assert.equal(logFiles(join(root,'.data','setup-logs')).length,2);assert.equal(readFileSync(join(root,'node_modules','sentinel'),'utf8'),'keep dependencies');}
    assert.equal(readFileSync(join(root,'.env.local'),'utf8'),'env sentinel');
    assert.equal(readFileSync(join(root,'.data','tower.sqlite'),'utf8'),'save sentinel');
  }finally{
    assert.ok(resolve(fixture).startsWith(temporary+sep));
    rmSync(fixture,{recursive:true,force:true});
  }
});
