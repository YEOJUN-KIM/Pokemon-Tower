// Battle recordings: CC0 sources are documented in public/audio/music-sources.json.
export type MusicTrack='trainer'|'elite'|'gym'|'villain'|'champion'|'rare'|'reward'|'clear'|'defeat';
export const musicNames:Record<MusicTrack,string>={trainer:'일반 트레이너 · RPG 배틀',elite:'엘리트 · 라이벌 배틀',gym:'관장 · 브라스 / 현악 배틀',villain:'빌런 · 록',champion:'챔피언 · 관장 공통 배틀',rare:'희귀 포켓몬 · 준전설 / 전설 / 환상',reward:'승리 · 보상 축하',clear:'타워 정복',defeat:'패배'};
export const musicFiles:Partial<Record<MusicTrack,string>>={trainer:'/audio/bgm/gym-rpg.mp3',elite:'/audio/bgm/villain-rpg-v2.mp3',gym:'/audio/bgm/gym-battle-a.mp3',villain:'/audio/bgm/elite-rock.wav',champion:'/audio/bgm/gym-battle-a.mp3',rare:'/audio/bgm/rare-epic.ogg',reward:'/audio/bgm/reward-victory-v2.mp3'};
// Whole-file/whole-loop weighted RMS calibration against the accepted original gym recording (now trainer).
// See scripts/measure-music-levels.mjs and artifacts/qa/audio/music-levels-before.json.
export const musicTrackLevels:Record<MusicTrack,number>={trainer:1,elite:1.001,gym:.87,villain:.928,champion:.87,rare:1.365,reward:.936,clear:4.578,defeat:4.951};
type Score={bpm:number;root:number;melody:number[];chords:number[];drums:boolean;wave:OscillatorType};
// Original non-battle cues. -99 means rest; one step is an eighth note.
export const musicScores:Partial<Record<MusicTrack,Score>>={
  clear:{bpm:116,root:62,chords:[0,5,7,0],drums:true,wave:'triangle',melody:[12,12,16,19,24,24,-99,-99,17,17,21,24,29,29,28,-99,26,26,23,-99,19,21,23,26,24,24,19,16,12,12,-99,-99,24,24,28,31,36,36,-99,-99,29,29,33,36,41,41,40,-99,26,26,23,-99,19,21,23,26,24,24,19,16,12,12,-99,-99]},
  defeat:{bpm:68,root:57,chords:[0,8,5,7],drums:false,wave:'triangle',melody:[15,15,15,-99,14,14,12,-99,12,12,-99,-99,10,10,8,-99,8,8,-99,-99,7,7,5,-99,7,7,11,-99,12,12,-99,-99,15,15,15,-99,14,14,12,-99,12,12,-99,-99,10,10,8,-99,8,8,-99,-99,7,7,5,-99,7,7,11,-99,12,12,-99,-99]},
};
