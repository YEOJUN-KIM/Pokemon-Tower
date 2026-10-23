import {main} from './player-launcher.mjs';
// Legacy local CMD now launches the installed production package.
process.exitCode=await main();
