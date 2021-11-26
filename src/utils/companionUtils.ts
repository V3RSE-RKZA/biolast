import { CompanionRow } from '../types/mysql'

/**
 * Calculates the XP required to level up given a level. IF YOU PLAN ON CHANGING THIS YOU SHOULD ALSO CHANGE THE AMOUNT OF XP QUESTS GIVE (src/slash-commands/quests)
 * @param level The level to get XP required for
 * @returns The XP required for specified level
 */
const LEVEL_FORMULA = (level: number) => 100 * level

/**
 *
 * @param companionXp The companions XP
 * @param level The companions current level
 * @returns How much XP companion needs to level up, how much XP companion has relative to their current level
 */
export function getCompanionXp (companionXp: number, level: number): { relativeLevelXp: number, xpUntilLevelUp: number, levelTotalXpNeeded: number } {
	let levelXP = 0
	let totalNeeded = 0

	for (let i = 1; i <= level; i++) {
		totalNeeded += LEVEL_FORMULA(i)

		if (i !== level) {
			levelXP += LEVEL_FORMULA(i)
		}
	}

	return {
		relativeLevelXp: companionXp - levelXP,
		xpUntilLevelUp: totalNeeded - companionXp,
		levelTotalXpNeeded: LEVEL_FORMULA(level)
	}
}

/**
 * @param companionRow The sql row of the companion
 * @param nameOnly Whether to only show the companions name if they have one
 */
export function getCompanionDisplay (companionRow: CompanionRow, nameOnly = false): string {
	return nameOnly && companionRow.name ? `${companionRow.name}` : `${companionRow.type}${companionRow.name ? ` "**${companionRow.name}**"` : ''}`
}
