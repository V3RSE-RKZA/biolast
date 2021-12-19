import { icons } from '../config'
import { allItems } from '../resources/items'
import { StimulantMedical } from '../types/Items'
import { Query } from '../types/mysql'
import { getCooldown } from './db/cooldowns'

export type Affliction = 'Bitten' | 'Broken Arm' | 'Burning'

/**
 * Calculates the XP required to level up given a level. IF YOU PLAN ON CHANGING THIS YOU SHOULD ALSO CHANGE THE AMOUNT OF XP QUESTS GIVE (src/slash-commands/quests)
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
export async function getActiveStimulants (query: Query, userID: string, types?: ('damage' | 'accuracy' | 'weight' | 'fireRate')[], forUpdate = false): Promise<{ cooldown: string, stimulant: StimulantMedical }[]> {
	const stimulantItems = allItems.filter(itm => itm.type === 'Medical' && itm.subtype === 'Stimulant') as StimulantMedical[]
	const activeStimulants: { cooldown: string, stimulant: StimulantMedical }[] = []

	for (const item of stimulantItems) {
		if (
			!types ||
			(item.effects.accuracyBonus && types.includes('accuracy')) ||
			(item.effects.damageBonus && types.includes('damage')) ||
			(item.effects.fireRate && types.includes('fireRate')) ||
			(item.effects.weightBonus && types.includes('weight')) ||
			(item.effects.damageReduction && types.includes('damage'))
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
 * Get the afflictions (debuffs) a user has active (and their time until expiration)
 * @param query The query to use
 * @param userID The ID of user to get afflictions for
 * @param forUpdate Whether this is part of an sql transaction or not
 * @returns Stimulants active and their time until expiration
 */
export async function getAfflictions (query: Query, userID: string, forUpdate = false): Promise<{ cooldown: string, type: Affliction }[]> {
	const afflictions: { cooldown: string, type: Affliction }[] = []
	const bitten = await getCooldown(query, userID, 'bitten', forUpdate)
	const broken = await getCooldown(query, userID, 'broken-arm', forUpdate)
	const burning = await getCooldown(query, userID, 'burning', forUpdate)

	if (bitten) {
		afflictions.push({
			cooldown: bitten,
			type: 'Bitten'
		})
	}
	if (broken) {
		afflictions.push({
			cooldown: broken,
			type: 'Broken Arm'
		})
	}
	if (burning) {
		afflictions.push({
			cooldown: burning,
			type: 'Burning'
		})
	}

	return afflictions
}

/**
 * Adds the effects a user has active
 * @param activeStimulants The users active stimulants
 * @returns Users active effects
 */
export function addStatusEffects (activeStimulants: StimulantMedical[], afflictions?: Affliction[]): {
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
	/**
	 * Percent firerate cooldown reduction (10 would be 10% time reduction)
	 */
	fireRate: number
	/**
	 * Percent damage reduction from attacks (10 would be 10% reduction)
	 */
	damageReduction: number
} {
	const effects = {
		damageBonus: 0,
		accuracyBonus: 0,
		weightBonus: 0,
		fireRate: 0,
		damageReduction: 0
	}

	for (const item of activeStimulants) {
		effects.accuracyBonus += item.effects.accuracyBonus
		effects.damageBonus += item.effects.damageBonus
		effects.weightBonus += item.effects.weightBonus
		effects.fireRate += item.effects.fireRate
		effects.damageReduction += item.effects.damageReduction
	}

	for (const type of afflictions || []) {
		if (type === 'Bitten') {
			effects.damageBonus += -20
			effects.damageReduction += -20
		}
		else if (type === 'Broken Arm') {
			effects.fireRate += -15
		}
		else if (type === 'Burning') {
			effects.damageReduction += -25
		}
	}

	return effects
}

/**
 * @param activeAfflictions Array of afflictions, can be obtained from getAfflictions
 * @returns String display of the afflictions
 */
export function getAfflictionsDisplay (activeAfflictions: { cooldown: string, type: Affliction }[]): string {
	const effectsDisplay = []

	for (const affliction of activeAfflictions) {
		if (affliction.type === 'Bitten') {
			effectsDisplay.push(`${icons.biohazard} Bitten (-20% damage dealt, +20% damage taken) **${affliction.cooldown}** left`)
		}
		if (affliction.type === 'Broken Arm') {
			effectsDisplay.push(`🦴 Broken Arm (+15% attack cooldown) **${affliction.cooldown}** left`)
		}
		if (affliction.type === 'Burning') {
			effectsDisplay.push(`${icons.burning} Burning (+25% damage taken) **${affliction.cooldown}** left`)
		}
	}

	return effectsDisplay.join('\n')
}
