import {createHash,randomBytes,randomUUID,scrypt,timingSafeEqual} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {BattleRequestError} from './battle-session';

export const authCookie='tower_auth';
export const guestCookie='tower_session';
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const sessionSeconds=30*86400;
type Account={id:string;username:string;player_id:string;password_hash:string;recovery_hash:string};
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,{N:16384,r:8,p:1},(error,key)=>error?reject(error):resolve(key)));
async function passwordHash(password:string) {const salt=randomBytes(16).toString('hex');return `${salt}:${(await derive(password,salt)).toString('hex')}`;}
async function passwordMatches(password:string,encoded:string) {
  const [salt,hex]=encoded.split(':');
  const actual=await derive(password,salt);
  const expected=Buffer.from(hex,'hex');
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
const validPassword=(value:unknown):string=> {
  if(typeof value!=='string'||value.length<8||value.length>128)throw new BattleRequestError('비밀번호는 8~128자로 입력하세요.',400);
  return value;
};
const validUsername=(value:unknown):string=> {
  if(typeof value!=='string'||!/^[a-zA-Z0-9_]{3,24}$/.test(value))throw new BattleRequestError('아이디는 영문·숫자·밑줄 3~24자로 입력하세요.',400);
  return value.toLowerCase();
};
export class Accounts {
  constructor(private db:DatabaseSync) {}
  private transaction<T>(work:()=>T):T {
    this.db.exec('BEGIN IMMEDIATE');
    try {const result=work();this.db.exec('COMMIT');return result;}
    catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  private limit(key:string,max:number,seconds:number) {
    const now=Date.now();
    this.transaction(()=>{
      this.db.prepare('DELETE FROM auth_limits WHERE expires_at<?').run(now);
      this.db.prepare('INSERT INTO auth_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+seconds*1000);
    });
    const row=this.db.prepare('SELECT count FROM auth_limits WHERE key=?').get(key) as {count:number};
    if(row.count>max)throw new BattleRequestError('시도가 너무 많습니다. 잠시 후 다시 시도하세요.',429);
  }
  session(token:string|null) {
    if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
    return this.db.prepare('SELECT accounts.id,username,player_id FROM account_sessions JOIN accounts ON accounts.id=account_sessions.account_id WHERE token_hash=? AND expires_at>?').get(hashToken(token),Date.now()) as {id:string;username:string;player_id:string}|undefined ?? null;
  }
  private createSession(id:string) {
    const token=randomBytes(32).toString('hex');
    this.db.prepare('DELETE FROM account_sessions WHERE expires_at<?').run(Date.now());
    this.db.prepare('INSERT INTO account_sessions VALUES (?,?,?)').run(hashToken(token),id,Date.now()+sessionSeconds*1000);
    return token;
  }
  async register(username:unknown,password:unknown,guest:string,claim:unknown) {
    const name=validUsername(username),secret=validPassword(password);
    this.limit('signup',20,60);
    const encoded=await passwordHash(secret);
    const recoveryKey=randomBytes(24).toString('base64url');
    return this.transaction(()=>{
      if(this.db.prepare('SELECT 1 FROM accounts WHERE username=?').get(name))throw new BattleRequestError('이미 사용 중인 아이디입니다.',409);
      let player=guest;
      if(claim!==undefined && claim!=='') {
        if(typeof claim!=='string'||claim.length>128)throw new BattleRequestError('저장 복구 코드를 확인하세요.',400);
        const row=this.db.prepare('SELECT player_id FROM save_claims WHERE token_hash=? AND expires_at>?').get(hashToken(claim.trim()),Date.now()) as {player_id:string}|undefined;
        if(!row)throw new BattleRequestError('저장 복구 코드가 올바르지 않거나 만료됐습니다.',400);
        player=row.player_id;
      }
      if(this.db.prepare('SELECT 1 FROM accounts WHERE player_id=?').get(player))throw new BattleRequestError('이미 계정에 연결된 저장입니다. 기존 계정으로 로그인하세요.',409);
      this.db.prepare('INSERT OR IGNORE INTO players(id) VALUES (?)').run(player);
      const id=randomUUID();
      this.db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?,?)').run(id,name,player,encoded,hashToken(recoveryKey),Date.now());
      this.db.prepare('DELETE FROM save_claims WHERE player_id=?').run(player);
      return {username:name,token:this.createSession(id),recoveryKey};
    });
  }
  async login(username:unknown,password:unknown) {
    const name=validUsername(username),secret=validPassword(password);
    this.limit(`login:${name}`,10,900);
    this.limit('login-global',100,60);
    const account=this.db.prepare('SELECT * FROM accounts WHERE username=?').get(name) as Account|undefined;
    // Spend the same password derivation work even for an unknown account.
    const valid=await passwordMatches(secret,account?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(64)}`);
    if(!account||!valid)throw new BattleRequestError('아이디 또는 비밀번호를 확인하세요.',401);
    this.db.prepare('DELETE FROM auth_limits WHERE key=?').run(`login:${name}`);
    return {username:name,token:this.createSession(account.id)};
  }
  logout(token:string|null) {if(token)this.db.prepare('DELETE FROM account_sessions WHERE token_hash=?').run(hashToken(token));}
  loginLocal(username:string) {
    if(process.env.NODE_ENV!=='development'||username!==process.env.TOWER_LOCAL_ACCOUNT)return null;
    const account=this.db.prepare('SELECT id,username FROM accounts WHERE username=?').get(username) as {id:string;username:string}|undefined;
    return account?{username:account.username,token:this.createSession(account.id)}:null;
  }
  async reset(username:unknown,password:unknown,key:unknown) {
    const name=validUsername(username),secret=validPassword(password);
    this.limit(`reset:${name}`,5,900);
    const account=this.db.prepare('SELECT * FROM accounts WHERE username=?').get(name) as Account|undefined;
    if(!account||typeof key!=='string'||key.length>128||!timingSafeEqual(Buffer.from(account.recovery_hash,'hex'),Buffer.from(hashToken(key.trim()),'hex')))throw new BattleRequestError('아이디 또는 계정 복구 키를 확인하세요.',401);
    const encoded=await passwordHash(secret),recoveryKey=randomBytes(24).toString('base64url');
    return this.transaction(()=>{
      const result=this.db.prepare('UPDATE accounts SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?').run(encoded,hashToken(recoveryKey),account.id,account.recovery_hash);
      if(!result.changes)throw new BattleRequestError('이미 사용한 계정 복구 키입니다.',409);
      this.db.prepare('DELETE FROM account_sessions WHERE account_id=?').run(account.id);
      return {username:name,token:this.createSession(account.id),recoveryKey};
    });
  }
}
