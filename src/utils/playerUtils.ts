import { allItems } from '../resources/items'
import { StimulantMedical } from '../types/Items'
import { Query } from '../types/mysql'
import { getCooldown } from './db/cooldowns'

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

/**
 * Get the stimulants a user has active (and their time until expiration)
 * @param query The query to use
 * @param userID The ID of user to get stimulants for
 * @param types Types of stimulants to check for, reduces the number of queries on database
 * @param forUpdate Whether this is part of an sql transaction or not
 * @returns Stimulants active and their time until expiration
 */
export async function getActiveStimulants (query: Query, userID: string, types?: ('maxHealth' | 'damage' | 'accuracy' | 'weight')[], forUpdate = false): Promise<{ cooldown: string, stimulant: StimulantMedical }[]> {
	const stimulantItems = allItems.filter(itm => itm.type === 'Medical' && itm.subtype === 'Stimulant') as StimulantMedical[]
	const activeStimulants: { cooldown: string, stimulant: StimulantMedical }[] = []

	for (const item of stimulantItems) {
		if (
			!types ||
			(item.effects.accuracyBonus && types.includes('accuracy')) ||
			(item.effects.damageBonus && types.includes('damage')) ||
			(item.effects.weightBonus && types.includes('weight'))
		) {
			const active = await getCooldown(query, userID, item.name, forUpdate)

			if (active) {
				activeStimulants.push({
					cooldown: active,
					stimulant: item
				})
			}
		}
	}

	return activeStimulants
}

/**
 * Adds the effects a user has active
 * @param activeStimulants The users active stimulants
 * @returns Users active effects
 */
export function addStatusEffects (activeStimulants: StimulantMedical[]): {
	/**
	 * Damage percent bonus (10 would be 10% bonus damage)
	 */
	damageBonus: number
	/**
	 * Accuracy percent bonus (10 would be 10% bonus accuracy)
	 */
	accuracyBonus: number
	/**
	 * Weight added (10 would be 10 extra slots)
	 */
	weightBonus: number
} {
	const effects = {
		damageBonus: 0,
		accuracyBonus: 0,
		weightBonus: 0
	}

	for (const item of activeStimulants) {
		effects.accuracyBonus += item.effects.accuracyBonus
		effects.damageBonus += item.effects.damageBonus
		effects.weightBonus += item.effects.weightBonus
	}

	return effects
}
