import {mkdirSync,appendFileSync} from 'node:fs';
import path from 'node:path';
import {createInterface} from 'node:readline';
import {spawn} from 'node:child_process';
const secrets=Object.entries(process.env).filter(([k,v])=>/TOKEN|PASSWORD|SECRET|CREDENTIAL|API_KEY|AUTH/i.test(k)&&v&&v.length>=4).map(([,v])=>v);
export function redact(value){let text=String(value);for(const secret of secrets)text=text.split(secret).join('[REDACTED]');return text.replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi,'$1[REDACTED]@').replace(/((?:token|password|authorization)\s*[=:]\s*)(?:Bearer\s+)?[^\s]+/gi,'$1[REDACTED]');}
export function logger(home,kind){const directory=path.join(home,'logs');mkdirSync(directory,{recursive:true});const file=path.join(directory,`${kind}-${new Date().toISOString().replace(/[:.]/g,'-')}-${process.pid}.log`);return {file,write:value=>appendFileSync(file,redact(value)+'\n')};}
export function execute(file,args,{cwd,env=process.env,log}={}){return new Promise((resolve,reject)=>{
 log?.write('Command: '+JSON.stringify([file,...args]));const child=spawn(file,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])createInterface({input:stream}).on('line',line=>log?.write(line));
 child.once('error',reject);child.once('exit',code=>{log?.write('Exit code: '+code);code===0?resolve():reject(Object.assign(Error('작업을 완료하지 못했습니다. 표시된 단계와 로그를 확인해 주세요.'),{exitCode:code??1}));});
 });}
