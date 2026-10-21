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
  {name:'missing npm',npm:false,error:'npm을 찾을 수 없습니다.'},
  {name:'missing pnpm',pnpm:false,install:true},
  {name:'matching pnpm',pnpm:'11.19.0'},
  {name:'different pnpm',pnpm:'10.0.0',install:true},
  {name:'pnpm install failure',pnpm:false,npmFailure:true,error:'준비에 실패했습니다.'},
  {name:'incorrect pnpm after install',pnpm:false,installedVersion:'10.0.0',error:'준비에 실패했습니다.'},
  {name:'dependency install failure',dependencyFailure:true,error:'프로젝트 의존성 설치에 실패했습니다.'},
  {name:'repeat setup preserves saves',repeat:true},
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
    cmd(join(root,'포켓몬타워 로컬 실행.cmd'),'@echo off\n>>"%SETUP_TEST_LOG%" echo launch\n>"launch-root.txt" cd\nexit /b 0\n');
    mkdirSync(join(root,'.data'));
    writeFileSync(join(root,'.data','tower.sqlite'),'save sentinel');
    writeFileSync(join(root,'.env.local'),'env sentinel');
    const preload=join(fixture,'node-version.cjs');
    writeFileSync(preload,`Object.defineProperty(process.versions,'node',{value:${JSON.stringify(scenario.version??'24.20.0')}});`);
    cmd(join(tools,'where.cmd'),`@echo off
if "%~1"=="node.exe" goto node
if "%~1"=="npm.cmd" goto npm
if "%~1"=="pnpm.cmd" goto pnpm
exit /b 1
:node
if "%SETUP_TEST_NODE%"=="missing" exit /b 1
echo %SETUP_TEST_REAL_NODE%
exit /b 0
:npm
if "%SETUP_TEST_NPM%"=="missing" exit /b 1
echo %SETUP_TEST_TOOLS%\\npm.cmd
exit /b 0
:pnpm
if not exist "%SETUP_TEST_TOOLS%\\pnpm.cmd" exit /b 1
echo %SETUP_TEST_TOOLS%\\pnpm.cmd
exit /b 0
`);
    cmd(join(tools,'npm.cmd'),`@echo off
if "%~1"=="--version" echo 11.0.0
if "%~1"=="--version" exit /b 0
if "%~1"=="prefix" echo %SETUP_TEST_TOOLS%
if "%~1"=="prefix" exit /b 0
>>"%SETUP_TEST_LOG%" echo npm %*
if "%SETUP_TEST_NPM_FAILURE%"=="1" exit /b 1
copy /y "%SETUP_TEST_TOOLS%\\pnpm-ready.cmd" "%SETUP_TEST_TOOLS%\\pnpm.cmd" >nul
exit /b 0
`);
    const pnpm=version=>`@echo off
if "%~1"=="--version" echo ${version}
if "%~1"=="--version" exit /b 0
>>"%SETUP_TEST_LOG%" echo pnpm %*
if "%SETUP_TEST_DEP_FAILURE%"=="1" exit /b 1
exit /b 0
`;
    cmd(join(tools,'pnpm-ready.cmd'),pnpm(scenario.installedVersion??'11.19.0'));
    if(scenario.pnpm!==false)cmd(join(tools,'pnpm.cmd'),pnpm(scenario.pnpm??'11.19.0'));
    const run=()=>spawnSync(process.env.ComSpec??'cmd.exe',['/d','/c',`call "${join(root,'포켓몬타워 설치.cmd')}"`],{
      cwd:fixture,encoding:'utf8',input:'\r\n',timeout:15000,windowsVerbatimArguments:true,
      env:{...process.env,PATH:`${tools};${join(process.env.SystemRoot,'System32')}`,NODE_OPTIONS:`--require="${preload.replaceAll('\\','/')}"`,SETUP_TEST_TOOLS:tools,
        SETUP_TEST_REAL_NODE:process.execPath,SETUP_TEST_LOG:log,
        SETUP_TEST_NODE:scenario.node===false?'missing':'present',SETUP_TEST_NPM:scenario.npm===false?'missing':'present',
        SETUP_TEST_NPM_FAILURE:scenario.npmFailure?'1':'0',SETUP_TEST_DEP_FAILURE:scenario.dependencyFailure?'1':'0'},
    });
    const result=run();
    const output=result.stdout+result.stderr;
    assert.equal(result.error,undefined,output);
    assert.equal(result.status,scenario.error?1:0,output);
    const calls=existsSync(log)?readFileSync(log,'utf8'):'';
    if(scenario.error){
      assert.ok(output.includes(scenario.error),output);
      assert.ok(!calls.includes('launch'),calls);
      assert.match(output,/Press any key|계속하려면/);
      if(!scenario.dependencyFailure)assert.ok(!calls.includes('pnpm install --frozen-lockfile'),calls);
    }else{
      assert.ok(output.includes('[4/4]'),output);
      assert.ok(calls.includes('pnpm install --frozen-lockfile'),calls);
      assert.ok(calls.includes('launch'),calls);
      assert.equal(readFileSync(join(root,'launch-root.txt'),'utf8').trim(),root);
      assert.equal(calls.includes('npm install --global pnpm@11.19.0'),Boolean(scenario.install),calls);
    }
    if(scenario.version)assert.ok(output.includes(scenario.version),output);
    if(scenario.repeat){assert.equal(run().status,0);assert.equal(readFileSync(log,'utf8').split('launch').length-1,2);}
    assert.equal(readFileSync(join(root,'.env.local'),'utf8'),'env sentinel');
    assert.equal(readFileSync(join(root,'.data','tower.sqlite'),'utf8'),'save sentinel');
  }finally{
    assert.ok(resolve(fixture).startsWith(temporary+sep));
    rmSync(fixture,{recursive:true,force:true});
  }
});
