import type {StatKey} from './training';

// One first-pass adjustment only. HP mechanics and ordinary NPC ranks are independent.
export const raidBattleTrainingProfiles={
 'raid-top':{eliteRatio:.57},
 'raid-very-strong':{eliteRatio:.63},
 'raid-strong':{eliteRatio:.68},
} as const;
export type RaidBattleTraining='elite'|keyof typeof raidBattleTrainingProfiles;
export const raidBattleTuning:Record<string,{battleTraining:Exclude<RaidBattleTraining,'elite'>;ivRule:{perfect:number;protected:readonly StatKey[]}}>={
 mewtwo:{battleTraining:'raid-top',ivRule:{perfect:3,protected:['spa','spe']}},
 arceus:{battleTraining:'raid-top',ivRule:{perfect:3,protected:['spa']}},
 rayquaza:{battleTraining:'raid-top',ivRule:{perfect:3,protected:['atk','spe']}},
 zacian:{battleTraining:'raid-very-strong',ivRule:{perfect:3,protected:['atk','spe']}},
 kyogre:{battleTraining:'raid-very-strong',ivRule:{perfect:3,protected:['spa']}},
 groudon:{battleTraining:'raid-very-strong',ivRule:{perfect:3,protected:['atk']}},
 terapagos:{battleTraining:'raid-very-strong',ivRule:{perfect:3,protected:['spa']}},
 shaymin:{battleTraining:'raid-strong',ivRule:{perfect:4,protected:['spa','spe']}},
};
