// Preserve packed rules for old battles; new battles opt into tower gimmicks.
export const LEGACY_FORMAT='gen9ou@@@Terastal Clause,Max Team Size = 3,Adjust Level = 50';
export const PRE_GIMMICK_FORMAT='gen9nationaldexag@@@Terastal Clause,Dynamax Clause,Max Team Size = 3,Adjust Level = 50';
export const PRE_TERA_FORMAT='gen9nationaldexag@@@Terastal Clause,Max Team Size = 3,Adjust Level = 50';
export const PRE_NPC_FORMAT='gen9nationaldexag@@@Max Team Size = 3,Adjust Level = 50';
// Opt in to the installed engine's Z-A Dragonite form without changing old logs.
export const FORMAT=PRE_NPC_FORMAT+',+Dragonite-Mega,+Dragoninite';
export const supportedFormats=[LEGACY_FORMAT,PRE_GIMMICK_FORMAT,PRE_TERA_FORMAT,PRE_NPC_FORMAT,FORMAT];
