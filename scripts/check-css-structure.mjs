import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';

// Use Next's installed parser; this check adds no runtime styling dependency.
const postcss=createRequire(import.meta.resolve('next/package.json'))('postcss');
const folder='src/web/styles';
const failures=[];
let rules=0;
for(const file of readdirSync(folder).filter(name=>name.endsWith('.module.css'))) {
  const root=postcss.parse(readFileSync(`${folder}/${file}`,'utf8'),{from:`${folder}/${file}`});
  root.walkRules(rule=>{
    if(/keyframes$/.test(rule.parent.name??''))return;
    rules++;
    for(const selector of rule.selectors) {
      if(!selector.trim()||selector.includes(':global()'))failures.push(`${file}: empty selector`);
      if(selector.includes(':global(')&&!selector.includes(':where(.scope'))failures.push(`${file}: unbounded global selector ${selector}`);
      if(/:where\(.*\)\s+:global\((?:body|html)(?=[\s\[:.)])/.test(selector))failures.push(`${file}: document ancestors must precede the screen boundary (${selector})`);
    }
    if(rule.selector===':root'||rule.selector==='body'||rule.selector==='html body')failures.push(`${file}: document defaults belong in globals.css`);
  });
}
function walk(path) {
  for(const entry of readdirSync(path,{withFileTypes:true})) {
    const file=`${path}/${entry.name}`;
    if(entry.isDirectory())walk(file);
    else if(/\.(tsx?|jsx?)$/.test(file)) {
      const source=readFileSync(file,'utf8');
      for(const match of source.matchAll(/import\s+(?:[^;\n]*?from\s+)?['"]([^'"]+\.css)['"]/g))if(!match[1].endsWith('.module.css')&&!(file==='src/app/layout.tsx'&&match[1]==='./globals.css'))failures.push(`${file}: feature CSS must be a module (${match[1]})`);
    }
  }
}
walk('src');
const tokens=postcss.parse(readFileSync(`${folder}/tokens.css`,'utf8'));
const names=new Set();tokens.walkDecls(decl=>{if(names.has(decl.prop))failures.push(`tokens.css: duplicate token ${decl.prop}`);names.add(decl.prop);});
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`CSS structure OK: ${rules} bounded rules; ${names.size} unique design tokens.`);
