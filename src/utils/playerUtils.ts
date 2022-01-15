import { icons } from '../config'
import { Affliction } from '../resources/afflictions'
import { StatusEffects, Stimulant } from '../types/Items'

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
 * Adds the effects a user has active
 * @param activeStimulants The users active stimulants
 * @param afflictions Afflictions user has
 * @returns Users active effects
 */
export function addStatusEffects (activeStimulants: Stimulant[], afflictions: Affliction[] = []): StatusEffects {
	const effects: StatusEffects = {
		damageBonus: 0,
		accuracyBonus: 0,
		damageTaken: 0
	}

	for (const item of activeStimulants) {
		for (const effect in item.effects) {
			effects[effect as keyof StatusEffects] += item.effects[effect as keyof StatusEffects]
		}
	}

	for (const affliction of afflictions) {
		for (const effect in affliction.effects) {
			effects[effect as keyof StatusEffects] += affliction.effects[effect as keyof StatusEffects]
		}
	}

	return effects
}

/**
 * Convert an effects object to a array of strings used to display the effects
 * @param effects The effects to get display of
 * @param showAll Whether or not to show all current effects regardless if they are 0%
 */
export function getEffectsDisplay (effects: StatusEffects, showAll = false): string[] {
	const display = []

	for (const effect in effects) {
		const typedEffect = effect as keyof StatusEffects

		if (showAll || effects[typedEffect]) {
			const percentDisplay = `${Math.abs(effects[typedEffect])}%`

			switch (typedEffect) {
				case 'accuracyBonus': {
					display.push(`${effects[typedEffect] <= 0 ? icons.postive_effect_debuff : icons.positive_effect_buff}${percentDisplay} accuracy`)
					break
				}
				case 'damageBonus': {
					display.push(`${effects[typedEffect] <= 0 ? icons.postive_effect_debuff : icons.positive_effect_buff}${percentDisplay} damage`)
					break
				}
				case 'damageTaken': {
					display.push(`${effects[typedEffect] <= 0 ? icons.negative_effect_debuff : icons.negative_effect_buff}${percentDisplay} damage taken`)
					break
				}
			}
		}
	}

	return display
}

/**
 * Convert an effects object to a array of strings that describe the effect (lowers damage, increases accuracy, etc)
 * @param effects The effects to get description of
 */
export function getEffectsDescription (effects: StatusEffects): string[] {
	const display = []

	for (const effect in effects) {
		const typedEffect = effect as keyof StatusEffects

		if (effects[typedEffect]) {
			switch (typedEffect) {
				case 'accuracyBonus': {
					display.push(`${effects[typedEffect] <= 0 ? 'lowers' : 'increases'} accuracy`)
					break
				}
				case 'damageBonus': {
					display.push(`${effects[typedEffect] <= 0 ? 'lowers' : 'increases'} damage`)
					break
				}
				case 'damageTaken': {
					display.push(`${effects[typedEffect] <= 0 ? 'lowers' : 'increases'} damage taken`)
					break
				}
			}
		}
	}

	return display
}

/**
 * Gets the date users discord was created
 * @param userID ID of user to get age of
 */
export function getDiscordUserAge (userID: string): Date {
	return new Date(Math.floor((parseInt(userID) / 4194304) + 1420070400000))
}
