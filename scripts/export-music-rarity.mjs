import showdown from 'pokemon-showdown';
import {writeFileSync} from 'node:fs';
const {Dex}=showdown;

const rarity={};
for(const species of Dex.species.all()) {
  if(!species.exists || species.num<=0)continue;
  const tags=species.tags ?? [];
  const category=tags.includes('Mythical') ? 'mythical' : tags.includes('Restricted Legendary') ? 'legendary' : tags.includes('Sub-Legendary') ? 'sublegendary' : null;
  if(category)rarity[species.name]=category;
}
writeFileSync('src/data/music-rarity.json',JSON.stringify(rarity,null,2)+'\n');
console.log(`Exported ${Object.keys(rarity).length} rare species and forms for public encounter music.`);
