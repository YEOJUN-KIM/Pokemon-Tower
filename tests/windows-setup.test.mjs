import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve,sep} from 'node:path';

// Run the real CMD parser, but replace package tools and the game entry point.
// These tests never install global packages, download dependencies or start a server.
const windows=process.platform==='win32';
const cases=[
  {name:'missing Node',node:false,error:'Node.js 24 이상이 필요합니다.'},
  {name:'old Node',version:'22.0.0',error:'현재 Node.js 버전은 지원되지 않습니다.'},
  {name:'missing npm',npm:false,error:'npm을 찾을 수 없거나 실행할 수 없습니다.'},
  {name:'missing npx',npx:false,error:'npx를 찾을 수 없거나 실행할 수 없습니다.'},
  {name:'unusable npx',npxFailure:true,code:9,error:'npx를 찾을 수 없거나 실행할 수 없습니다.'},
  {name:'pnpm not installed',pnpm:false},
  {name:'matching global pnpm is ignored',pnpm:'11.19.0'},
  {name:'different global pnpm is ignored',pnpm:'10.0.0'},
  {name:'network/install failure preserves exit code',dependencyFailure:true,code:17,error:'프로젝트 설치에 실패했습니다.'},
  {name:'repeat setup with node_modules preserves saves',repeat:true},
  {name:'launch failure preserves exit code',launchFailure:true,code:23,error:'게임 실행에 실패했습니다.'},
];

for(const scenario of cases)test(`Windows setup: ${scenario.name}`,{skip:!windows},()=>{
  const temporary=resolve('artifacts/temporary');
  mkdirSync(temporary,{recursive:true});
  const fixture=mkdtempSync(join(temporary,'windows-setup-'));
  const root=join(fixture,'한글 공백 & 괄호 (설치)');
  const tools=join(fixture,'도구 공백');
  mkdirSync(root);mkdirSync(tools);
  const log=join(fixture,'calls.txt');
  const cmd=(path,text)=>writeFileSync(path,text.replace(/\r?\n/g,'\r\n'),'utf8');
  try{
    copyFileSync('포켓몬타워 설치.cmd',join(root,'포켓몬타워 설치.cmd'));
    cmd(join(root,'포켓몬타워 로컬 실행.cmd'),'@echo off\n>>"%SETUP_TEST_LOG%" echo launch\n>"launch-root.txt" cd\nexit /b %SETUP_TEST_LAUNCH_EXIT%\n');
    mkdirSync(join(root,'.data'));
    mkdirSync(join(root,'node_modules'));
    writeFileSync(join(root,'node_modules','sentinel.txt'),'existing dependencies');
    writeFileSync(join(root,'.data','tower.sqlite'),'save sentinel');
    writeFileSync(join(root,'.env.local'),'env sentinel');
    const preload=join(fixture,'node-version.cjs');
    writeFileSync(preload,`Object.defineProperty(process.versions,'node',{value:${JSON.stringify(scenario.version??'24.20.0')}});`);
    cmd(join(tools,'where.cmd'),`@echo off
>>"%SETUP_TEST_LOG%" echo where %~1
if "%~1"=="node.exe" goto node
if "%~1"=="npm.cmd" goto npm
if "%~1"=="npx.cmd" goto npx
exit /b 1
:node
if "%SETUP_TEST_NODE%"=="missing" exit /b 1
echo %SETUP_TEST_REAL_NODE%
exit /b 0
:npm
if "%SETUP_TEST_NPM%"=="missing" exit /b 1
echo %SETUP_TEST_TOOLS%\\npm.cmd
exit /b 0
:npx
if "%SETUP_TEST_NPX%"=="missing" exit /b 1
echo %SETUP_TEST_TOOLS%\\npx.cmd
exit /b 0
`);
    cmd(join(tools,'npm.cmd'),`@echo off
>>"%SETUP_TEST_LOG%" echo npm %*
if "%~1"=="--version" echo 11.0.0
if "%~1"=="--version" exit /b 0
exit /b 99
`);
    cmd(join(tools,'npx.cmd'),`@echo off
>>"%SETUP_TEST_LOG%" echo npx %*
if "%~1"=="--version" echo 11.0.0
if "%~1"=="--version" exit /b %SETUP_TEST_NPX_EXIT%
>"install-root.txt" cd
exit /b %SETUP_TEST_DEP_EXIT%
`);
    if(scenario.pnpm!==false)cmd(join(tools,'pnpm.cmd'),`@echo off
>>"%SETUP_TEST_LOG%" echo GLOBAL PNPM CALLED
exit /b 99
`);
    const run=()=>spawnSync(process.env.ComSpec??'cmd.exe',['/d','/c',`call "${join(root,'포켓몬타워 설치.cmd')}"`],{
      cwd:fixture,encoding:'utf8',input:'\r\n',timeout:15000,windowsVerbatimArguments:true,
      env:{...process.env,PATH:`${tools};${join(process.env.SystemRoot,'System32')}`,NODE_OPTIONS:`--require="${preload.replaceAll('\\','/')}"`,SETUP_TEST_TOOLS:tools,
        SETUP_TEST_REAL_NODE:process.execPath,SETUP_TEST_LOG:log,
        SETUP_TEST_NODE:scenario.node===false?'missing':'present',SETUP_TEST_NPM:scenario.npm===false?'missing':'present',
        SETUP_TEST_NPX:scenario.npx===false?'missing':'present',SETUP_TEST_NPX_EXIT:scenario.npxFailure?'9':'0',
        SETUP_TEST_DEP_EXIT:scenario.dependencyFailure?'17':'0',SETUP_TEST_LAUNCH_EXIT:scenario.launchFailure?'23':'0'},
    });
    const result=run();
    const output=result.stdout+result.stderr;
    assert.equal(result.error,undefined,output);
    assert.equal(result.status,scenario.error?(scenario.code??1):0,output);
    const calls=existsSync(log)?readFileSync(log,'utf8'):'';
    assert.ok(!/GLOBAL PNPM|where pnpm|npm install|prefix|--global/.test(calls),calls);
    if(scenario.error){
      assert.ok(output.includes(scenario.error),output);
      if(!scenario.launchFailure)assert.ok(!calls.includes('launch'),calls);
      assert.match(output,/Press any key|계속하려면/);
      assert.ok(output.includes(`오류 코드: ${scenario.code??1}`),output);
      assert.ok(output.includes('실패 단계:'),output);
      if(!scenario.dependencyFailure&&!scenario.launchFailure)assert.ok(!calls.includes('npx --yes pnpm@11.19.0 install'),calls);
    }else{
      assert.ok(output.includes('[3/3]'),output);
      assert.ok(calls.includes('npx --yes pnpm@11.19.0 install --frozen-lockfile'),calls);
      assert.ok(calls.includes('launch'),calls);
      assert.equal(readFileSync(join(root,'install-root.txt'),'utf8').trim(),root);
      assert.equal(readFileSync(join(root,'launch-root.txt'),'utf8').trim(),root);
    }
    if(scenario.version)assert.ok(output.includes(scenario.version),output);
    if(scenario.repeat){assert.equal(run().status,0);assert.equal(readFileSync(log,'utf8').split('launch').length-1,2);}
    assert.equal(readFileSync(join(root,'node_modules','sentinel.txt'),'utf8'),'existing dependencies');
    assert.equal(readFileSync(join(root,'.env.local'),'utf8'),'env sentinel');
    assert.equal(readFileSync(join(root,'.data','tower.sqlite'),'utf8'),'save sentinel');
  }finally{
    assert.ok(resolve(fixture).startsWith(temporary+sep));
    rmSync(fixture,{recursive:true,force:true});
  }
});
