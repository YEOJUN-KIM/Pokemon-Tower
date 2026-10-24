import {readFile,mkdir,writeFile,lstat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../../',import.meta.url));
export const sourceDirectory=path.join(root,'external/third-party/devwizard-pixel-art-spells');
export const generatedDirectory=path.join(root,'public/assets/external-generated/devwizard-pixel-art-spells');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=async file=>{try{return await lstat(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}};
async function safePath(base,relative){
 const result=path.resolve(base,relative),within=path.relative(path.resolve(base),result);
 if(!within||within.startsWith('..')||path.isAbsolute(within))throw Error(`Unsafe asset path: ${relative}`);
 let current=path.resolve(base);
 for(const segment of ['',...within.split(path.sep)]){
  current=path.join(current,segment);
  if((await exists(current))?.isSymbolicLink())throw Error(`Symlink asset path: ${current}`);
 }
 return result;
}
export async function loadDefinition(){return JSON.parse(await readFile(path.join(sourceDirectory,'sources.json'),'utf8'));}

export async function inspectSources(){
 const definition=await loadDefinition(),assets=[];
 if(definition.selected.length!==8)throw Error('Expected exactly eight selected projectiles');
 for(const asset of definition.selected){
  const filename=path.basename(asset.sourcePng),file=await safePath(sourceDirectory,asset.sourcePng);
  const bytes=await readFile(file);
  if(bytes.length!==asset.pngBytes||hash(bytes)!==asset.pngSha256)throw Error(`Source hash mismatch: ${filename}`);
  const s=asset.sheet;
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==s.width||bytes.readUInt32BE(20)!==s.height)throw Error(`PNG sheet mismatch: ${filename}`);
  if(s.width!==s.columns*s.frameWidth||s.height!==s.rows*s.frameHeight||s.frameCount!==s.columns*s.rows)throw Error(`Frame grid mismatch: ${filename}`);
  if(asset.sourceAse){
   const ase=await readFile(await safePath(sourceDirectory,asset.sourceAse));
   if(hash(ase)!==asset.aseSha256||ase.readUInt16LE(4)!==0xa5e0||ase.readUInt16LE(6)!==s.frameCount||ase.readUInt16LE(8)!==s.frameWidth||ase.readUInt16LE(10)!==s.frameHeight)throw Error(`ASE mismatch: ${filename}`);
   let offset=128;
   for(const duration of asset.sourceFrameDurationsMs){if(ase.readUInt16LE(offset+4)!==0xf1fa||ase.readUInt16LE(offset+8)!==duration)throw Error(`ASE duration mismatch: ${filename}`);offset+=ase.readUInt32LE(offset);}
   if(offset!==ase.length)throw Error(`ASE length mismatch: ${filename}`);
  }
  assets.push({asset,filename,bytes});
 }
 const pngNames=(await readdir(await safePath(sourceDirectory,'pack/PNG Files'))).sort();
 const aseNames=(await readdir(await safePath(sourceDirectory,'pack/Asprite Files'))).sort();
 if(JSON.stringify(pngNames)!==JSON.stringify(assets.map(a=>a.filename).sort())||JSON.stringify(aseNames)!==JSON.stringify(definition.selected.filter(a=>a.sourceAse).map(a=>path.basename(a.sourceAse)).sort()))throw Error('Unexpected source files; selected pack must remain eight PNG and seven ASE');
 return assets;
}

export async function verify({output=generatedDirectory}={}){
 const assets=await inspectSources(),missing=[],mismatched=[];
 for(const {asset,filename} of assets){
  const file=await safePath(output,filename);
  if(!await exists(file)){missing.push(filename);continue;}
  if(hash(await readFile(file))!==asset.pngSha256)mismatched.push(filename);
 }
 const actual=await exists(output)?await readdir(output):[];
 const extra=actual.filter(filename=>!assets.some(asset=>asset.filename===filename));
 return {ok:!missing.length&&!mismatched.length&&!extra.length,matching:8-missing.length-mismatched.length,missing,mismatched,extra};
}

export async function prepare({output=generatedDirectory}={}){
 const assets=await inspectSources();
 // Preflight the complete source/destination set before writing any file.
 for(const {asset,filename} of assets){const file=await safePath(output,filename);if(await exists(file)&&hash(await readFile(file))!==asset.pngSha256)throw Error(`Existing generated asset differs; refusing overwrite: ${filename}`);}
 const before=await verify({output});if(before.extra.length)throw Error(`Unexpected generated assets: ${before.extra.join(', ')}`);
 await mkdir(output,{recursive:true});
 for(const {filename,bytes} of assets){const file=await safePath(output,filename);if(!await exists(file))await writeFile(file,bytes,{flag:'wx'});}
 return verify({output});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  const [mode,...extra]=process.argv.slice(2);if(extra.length||!['prepare','verify'].includes(mode))throw Error('Expected prepare or verify, without extra arguments');
  const result=await (mode==='prepare'?prepare():verify());console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
