import {main} from './player-launcher.mjs';
// Diagnostic fallback. Production source install and the player EXE share one engine.
process.exitCode=await main(['--repair',...process.argv.slice(2)]);
