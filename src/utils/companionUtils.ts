import { Companion } from '../resources/companions'
import { CompanionRow } from '../types/mysql'

/**
 * Calculates the XP required to level up given a level. IF YOU PLAN ON CHANGING THIS YOU SHOULD ALSO CHANGE THE AMOUNT OF XP QUESTS GIVE (src/slash-commands/quests)
 * @param level The level to get XP required for
 * @returns The XP required for specified level
 */
const LEVEL_FORMULA = (level: number) => 100 * level

/**
 *
 * @param agility The companions agility level
 * @returns The time in seconds it takes companion to complete fetch mission
 */
export function getFetchTime (agility: number): number {
	// 2 hours if companion has no agility
	const defaultTime = 7200

	// decrease by 20% with each point of agility
	const decayFactor = 0.2

	return Math.floor(defaultTime * ((1 - decayFactor) ** agility))
}

/**
 * @param courage The companions courage level
 * @returns The chance 0 - 100 this companion will protect player from dying
 */
export function getProtectionChance (courage: number): number {
	return 10 * Math.log(courage + 1)
}

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
 * @param companion Companion object
 * @param companionRow The sql row of the companion
 * @param nameOnly Whether to only show the companions name if they have one
 */
export function getCompanionDisplay (companion: Companion, companionRow?: CompanionRow, nameOnly = false): string {
	if (nameOnly && companionRow?.name) {
		return companionRow.name
	}
	else if (companionRow) {
		return `${companion.name}${companionRow.name ? ` "${companionRow.name}"` : ''}`
	}

	return companion.name
}
