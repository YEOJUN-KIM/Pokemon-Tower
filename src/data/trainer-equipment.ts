export const trainerEquipmentKeys=['Dynamax Band','Tera Orb'] as const;
export type TrainerEquipment=typeof trainerEquipmentKeys[number];
export function isTrainerEquipment(value:unknown):value is TrainerEquipment{return typeof value==='string'&&(trainerEquipmentKeys as readonly string[]).includes(value);}
