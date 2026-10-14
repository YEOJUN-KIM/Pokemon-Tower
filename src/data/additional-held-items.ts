export const additionalHeldItems={
 'Booster Energy':{name:'부스트에너지',description:'고대활성·쿼크차지를 발동해 가장 높은 능력을 강화합니다.',price:1350,consumable:false},
 'Toxic Orb':{name:'맹독구슬',description:'턴 종료 시 자신을 맹독 상태로 만듭니다.',price:900,consumable:false},
 'Flame Orb':{name:'화염구슬',description:'턴 종료 시 자신을 화상 상태로 만듭니다.',price:900,consumable:false},
 'Air Balloon':{name:'풍선',description:'떠 있는 동안 땅타입 기술을 받지 않습니다. 공격에 맞으면 터집니다.',price:900,consumable:false},
 'Loaded Dice':{name:'속임수주사위',description:'2~5회 공격하는 연속기가 4~5회 명중합니다. 일부 다른 연속기의 명중 방식도 강화합니다.',price:1350,consumable:false},
 'White Herb':{name:'하양허브',description:'능력 단계가 내려가면 내려간 단계를 모두 원래대로 되돌립니다.',price:900,consumable:false},
 'Power Herb':{name:'파워풀허브',description:'프리폴을 제외한 충전 기술을 한 턴에 사용합니다.',price:1350,consumable:false},
 'Weakness Policy':{name:'약점보험',description:'효과가 굉장한 공격에 맞으면 공격·특수공격이 2단계 올라갑니다.',price:1350,consumable:false},
 'Mental Herb':{name:'멘탈허브',description:'도발·앵콜·헤롱헤롱·사슬묶기·회복봉인·트집의 효과를 해제합니다.',price:600,consumable:false},
 'Eject Button':{name:'탈출버튼',description:'공격에 맞고 살아남으면 다른 아군으로 교체합니다.',price:900,consumable:false},
 'Eject Pack':{name:'탈출팩',description:'능력 단계가 내려가면 다른 아군으로 교체합니다.',price:900,consumable:false},
 'Red Card':{name:'레드카드',description:'공격에 맞고 살아남으면 공격한 상대를 강제로 교체합니다.',price:900,consumable:false},
 'Black Sludge':{name:'검은진흙',description:'독타입은 턴 종료 시 최대 HP의 1/16을 회복하지만 다른 타입은 최대 HP의 1/8만큼 피해를 받습니다.',price:600,consumable:false},
 'Lum Berry':{name:'리샘열매',description:'상태이상이나 혼란을 한 번 회복합니다.',price:600,consumable:false},
 'Chesto Berry':{name:'유루열매',description:'잠듦 상태를 한 번 회복합니다.',price:300,consumable:false},
 'Heat Rock':{name:'뜨거운바위',description:'자신이 만드는 쾌청 날씨의 지속 시간을 5턴에서 8턴으로 늘립니다.',price:600,consumable:false},
 'Damp Rock':{name:'축축한바위',description:'자신이 만드는 비 날씨의 지속 시간을 5턴에서 8턴으로 늘립니다.',price:600,consumable:false},
 'Smooth Rock':{name:'보송보송바위',description:'자신이 만드는 모래바람의 지속 시간을 5턴에서 8턴으로 늘립니다.',price:600,consumable:false},
 'Icy Rock':{name:'차가운바위',description:'자신이 만드는 눈 날씨의 지속 시간을 5턴에서 8턴으로 늘립니다.',price:600,consumable:false},
 'Terrain Extender':{name:'그라운드코트',description:'자신이 만드는 필드의 지속 시간을 5턴에서 8턴으로 늘립니다.',price:600,consumable:false},
} as const;

const reusableActivations=new Set(['Sitrus Berry','Focus Sash','Booster Energy','Air Balloon','White Herb','Power Herb','Weakness Policy','Mental Herb','Eject Button','Eject Pack','Red Card','Lum Berry','Chesto Berry']);
// Natural activation spends the effect for this battle; opponents can still remove it.
export function retainsHeldItemAfterActivation(item:string,tags:string[]){
 return reusableActivations.has(item)&&!tags.some(tag=>tag.startsWith('[from]'));
}
