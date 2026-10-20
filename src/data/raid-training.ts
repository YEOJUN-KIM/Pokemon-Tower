import type {StatKey} from './training';

// Raid-only profiles. HP mechanics and ordinary NPC ranks are independent.
export const raidBattleTrainingProfiles={
 'raid-top':{eliteRatio:.57},
 'raid-very-strong':{eliteRatio:.63},
 'raid-strong':{eliteRatio:.68},
 'raid-mewtwo-2':{eliteRatio:.43},
 'raid-zacian-2':{eliteRatio:.43},
 'raid-rayquaza-2':{eliteRatio:.48},
 'raid-kyogre-2':{eliteRatio:.50},
 'raid-groudon-2':{eliteRatio:.54},
} as const;
export type RaidBattleTraining='elite'|keyof typeof raidBattleTrainingProfiles;
export type RaidIVRule={perfect:number;protected:readonly StatKey[];protectedIv?:number};
export const raidBattleTuning:Record<string,{battleTraining:Exclude<RaidBattleTraining,'elite'>;ivRule:RaidIVRule}>={
 mewtwo:{battleTraining:'raid-mewtwo-2',ivRule:{perfect:3,protected:['spa','spe'],protectedIv:23}},
 arceus:{battleTraining:'raid-top',ivRule:{perfect:3,protected:['spa']}},
 rayquaza:{battleTraining:'raid-rayquaza-2',ivRule:{perfect:3,protected:['atk','spe'],protectedIv:24}},
 zacian:{battleTraining:'raid-zacian-2',ivRule:{perfect:3,protected:['atk','spe'],protectedIv:21}},
 kyogre:{battleTraining:'raid-kyogre-2',ivRule:{perfect:3,protected:['spa'],protectedIv:24}},
 groudon:{battleTraining:'raid-groudon-2',ivRule:{perfect:3,protected:['atk'],protectedIv:25}},
 terapagos:{battleTraining:'raid-very-strong',ivRule:{perfect:3,protected:['spa']}},
 shaymin:{battleTraining:'raid-strong',ivRule:{perfect:4,protected:['spa','spe']}},
};
