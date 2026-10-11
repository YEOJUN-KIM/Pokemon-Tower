export const battleStatusNames:Record<string,string>={par:'마비',brn:'화상',psn:'독',tox:'맹독',slp:'잠듦',frz:'얼음'};
export function battleStatus(condition=''){
  const tokens=condition.split(' ');
  if(tokens.includes('fnt'))return '';
  return tokens.find(token=>Object.hasOwn(battleStatusNames,token)) ?? '';
}
