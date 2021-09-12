/**
 * Calculates the XP required to level up given a level
 * @param level The level to get XP required for
 * @returns The XP required for specified level
 */
const LEVEL_FORMULA = (level: number) => Math.floor(200 * (level ** 1.7))

/**
 *
 * @param playerXp The players XP
 * @param level The players current level
 * @returns How much XP player needs to level up, how much XP player has relative to their current level
 */
export function getPlayerXp (playerXp: number, level: number): { relativeLevelXp: number, xpUntilLevelUp: number, levelTotalXpNeeded: number } {
	let levelXP = 0
	let totalNeeded = 0

	for (let i = 1; i <= level; i++) {
		totalNeeded += LEVEL_FORMULA(i)

		if (i !== level) {
			levelXP += LEVEL_FORMULA(i)
		}
	}

	return {
		relativeLevelXp: playerXp - levelXP,
		xpUntilLevelUp: totalNeeded - playerXp,
		levelTotalXpNeeded: LEVEL_FORMULA(level)
	}
}
