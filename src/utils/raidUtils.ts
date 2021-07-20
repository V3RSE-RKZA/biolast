import { Location, RaidChannel, allLocations } from '../resources/raids'
import { Armor, Helmet, Item } from '../types/Items'

export type BodyPart = 'arm' | 'leg' | 'chest' | 'head'

/**
 * Check if guild ID is a raid server
 * @param guildID The guild ID to check
 * @returns Whether or not guild is a raid server
 */
export function isRaidGuild (guildID?: string): boolean {
	return !!getRaidType(guildID || 'false')
}

export function getRaidType (guildID: string): Location | undefined {
	for (const location of allLocations) {
		if (location.guilds.includes(guildID)) {
			return location
		}
	}
}

/**
 * Gets a random scavenged item from a raid channel
 * @param raidChannel The channel to get scavenge loot for
 * @returns An item
 */
export function getRandomItem (raidChannel: RaidChannel): Item | undefined {
	const rand = Math.random()
	let randomItem

	if (raidChannel.scavange.rarest && rand < 0.05) {
		randomItem = raidChannel.scavange.rarest[Math.floor(Math.random() * raidChannel.scavange.rarest.length)]
	}
	else if (rand < 0.60) {
		randomItem = raidChannel.scavange.common[Math.floor(Math.random() * raidChannel.scavange.common.length)]
	}
	else if (rand < 0.85) {
		randomItem = raidChannel.scavange.uncommon[Math.floor(Math.random() * raidChannel.scavange.uncommon.length)]
	}
	else {
		randomItem = raidChannel.scavange.rare[Math.floor(Math.random() * raidChannel.scavange.rare.length)]
	}

	return randomItem
}

/**
 * Gets a random body part:
 *
 * head - 10%
 *
 * arms/legs - 15%
 *
 * chest - 60%
 *
 * @param weaponAccuracy The weapons accuracy
 * @param choice The body part user is trying to taget
 * @returns a random body part and whether or not the weapons accuracy influenced the result
 */
export function getBodyPartHit (weaponAccuracy: number, choice?: BodyPart): { result: BodyPart, accurate: boolean } {
	const random = Math.random()

	// if head was targeted, the chance of successful hit is divided by half
	if (choice === 'head' && random <= (weaponAccuracy / 100) / 2) {
		return {
			result: 'head',
			accurate: true
		}
	}
	else if (choice && random <= (weaponAccuracy / 100)) {
		return {
			result: choice,
			accurate: true
		}
	}

	if (random <= 0.1) {
		return {
			result: 'head',
			accurate: false
		}
	}
	else if (random <= 0.25) {
		return {
			result: 'arm',
			accurate: false
		}
	}
	else if (random <= 0.4) {
		return {
			result: 'leg',
			accurate: false
		}
	}

	return {
		result: 'chest',
		accurate: false
	}
}

/**
 *
 * @param damage Raw damage to deal
 * @param penetration Weapon/ammo penetration
 * @param bodyPartHit The body part hit
 * @param victimArmor The armor victim is wearing
 * @param victimHelmet The helmet victim is wearing
 * @returns The damage after taking account the victims armor
 */
export function getAttackDamage (damage: number, penetration: number, bodyPartHit: BodyPart, victimArmor?: Armor, victimHelmet?: Helmet): { total: number, reduced: number } {
	if (bodyPartHit === 'chest') {
		// user penetrated armor, deal full damage
		if (!victimArmor || penetration >= victimArmor.level) {
			return {
				total: damage,
				reduced: 0
			}
		}

		// minimum 1 damage
		// armor level has the armor penetration difference added to it so theres a drastic damage adjustment the higher armor level victim is wearing
		const adjusted = Math.max(1, Math.round((penetration / (victimArmor.level + (victimArmor.level - penetration))) * damage))

		return {
			total: adjusted,
			reduced: damage - adjusted
		}
	}
	else if (bodyPartHit === 'head') {
		// head shots deal 1.5x damage
		damage = Math.round(damage * 1.5)

		if (!victimHelmet || penetration >= victimHelmet.level) {
			return {
				total: damage,
				reduced: 0
			}
		}

		const adjusted = Math.max(1, Math.round((penetration / (victimHelmet.level + (victimHelmet.level - penetration))) * damage))

		return {
			total: adjusted,
			reduced: damage - adjusted
		}
	}

	// arm or leg hits deal 0.5x damage
	const adjusted = Math.max(1, Math.round(damage * 0.5))
	return {
		total: adjusted,
		reduced: damage - adjusted
	}
}
