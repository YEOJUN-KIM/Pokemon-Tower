export const eggGrades=['normal','rare','superRare'] as const;
export type EggGrade=typeof eggGrades[number];
export const eggGradeNames:Record<EggGrade,string>={normal:'일반',rare:'레어',superRare:'슈퍼레어'};
export const eggGradeWeights={normal:8500,rare:1200,superRare:300} as const;
export const superRareCategoryWeights={legendary:250,mythical:50} as const;
export function superRareSpeciesCategory(roll:number):keyof typeof superRareCategoryWeights{
 if(!Number.isInteger(roll)||roll<0||roll>=eggGradeWeights.superRare)throw Error('Invalid super rare roll');
 return roll<superRareCategoryWeights.legendary?'legendary':'mythical';
}
