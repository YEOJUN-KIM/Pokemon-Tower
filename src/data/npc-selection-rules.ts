export type SelectionRules={required?:string[];atLeastOneOf?:string[];preferredLead?:string[];preferredLast?:string[]};

// Shared by the reviewed-source exporter and live template validation.
export function validateSelectionRules(pool:readonly string[],rules:SelectionRules|undefined,mandatory:readonly string[]=[]):void{
 const fail=(message:string):never=>{throw Error(`Invalid NPC selection rules: ${message}`);};
 if(rules!==undefined&&(!rules||typeof rules!=='object'||Array.isArray(rules)))fail('expected an object');
 for(const [key,value] of Object.entries(rules??{})){
  if(!['required','atLeastOneOf','preferredLead','preferredLast'].includes(key))fail(`unknown field ${key}`);
  if(!Array.isArray(value)||!value.length||value.some(name=>typeof name!=='string'||!pool.includes(name))||new Set(value).size!==value.length)fail(`${key} must contain distinct candidate species`);
 }
 const required=[...new Set([...mandatory,...(rules?.required??[])])];
 if(required.some(name=>!pool.includes(name))||required.length>3)fail('required/ace/carrier cannot fit a three-Pokémon team');
 if(required.length===3&&rules?.atLeastOneOf&&!rules.atLeastOneOf.some(name=>required.includes(name)))fail('atLeastOneOf cannot fit alongside required/ace/carrier');
 if(rules?.preferredLead?.some(name=>rules.preferredLast?.includes(name)))fail('a species cannot prefer both lead and last');
}

export function satisfiesSelectionRules(names:readonly string[],rules?:SelectionRules):boolean{
 return (rules?.required??[]).every(name=>names.includes(name))&&(!rules?.atLeastOneOf||rules.atLeastOneOf.some(name=>names.includes(name)));
}

// Lists express priority, not another selection requirement. Unchosen species stay unchosen.
export function orderSelectedTeam<T>(team:T[],species:(member:T)=>string,rules?:SelectionRules):T[]{
 if(!rules?.preferredLead&&!rules?.preferredLast)return team;
 const result=[...team];
 const lead=rules.preferredLead?.find(name=>result.some(p=>species(p)===name));
 const last=rules.preferredLast?.find(name=>result.some(p=>species(p)===name));
 if(lead){const index=result.findIndex(p=>species(p)===lead);result.unshift(...result.splice(index,1));}
 if(last){const index=result.findIndex(p=>species(p)===last);result.push(...result.splice(index,1));}
 return result;
}
