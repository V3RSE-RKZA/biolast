import { Ammunition, Armor, Helmet, MeleeWeapon, RangedWeapon, ThrowableWeapon, Weapon } from '../types/Items'
import { getItemDisplay } from './itemUtils'
import { combineArrayWithAnd, getBodyPartEmoji } from './stringUtils'

export type BodyPart = 'arm' | 'leg' | 'chest' | 'head'

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
 * @param choice The body part user is trying to target
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
	if (damage < 1 || !Number.isInteger(damage)) {
		damage = Math.max(1, Math.round(damage))
	}

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

export function getAttackString (weapon: MeleeWeapon | ThrowableWeapon, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number): string
export function getAttackString (weapon: RangedWeapon, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, ammo: Ammunition): string
export function getAttackString (weapon: Weapon, attackerName: string, victimName: string, limbsHit: { damage: { total: number, reduced: number }, limb: BodyPart }[], totalDamage: number, ammo?: Ammunition): string {
	if (weapon.type === 'Ranged Weapon') {
		if (limbsHit.length > 1) {
			const limbsHitStrings = []

			for (const limbHit of limbsHit) {
				limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
			}

			return `${attackerName} shot ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)} with their ${getItemDisplay(weapon)} (ammo: ${getItemDisplay(ammo!)}). **${totalDamage}** total damage dealt.\n`
		}

		return `${attackerName} shot ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}** with their ${getItemDisplay(weapon)} (ammo: ${getItemDisplay(ammo!)}). **${totalDamage}** damage dealt.\n`
	}
	else if (weapon.type === 'Throwable Weapon' && weapon.subtype === 'Fragmentation Grenade') {
		if (limbsHit.length > 1) {
			const limbsHitStrings = []

			for (const limbHit of limbsHit) {
				limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
			}

			return `${attackerName} throws a ${getItemDisplay(weapon)} that explodes and hits ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)}. **${totalDamage}** total damage dealt.\n`
		}

		return `${attackerName} throws a ${getItemDisplay(weapon)} that explodes and hits ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}**. **${totalDamage}** damage dealt.\n`
	}
	else if (weapon.type === 'Throwable Weapon' && weapon.subtype === 'Incendiary Grenade') {
		if (limbsHit.length > 1) {
			const limbsHitStrings = []

			for (const limbHit of limbsHit) {
				limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
			}

			return `${attackerName} throws a ${getItemDisplay(weapon)} that bursts into flames and hits ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)}. **${totalDamage}** total damage dealt.\n`
		}

		return `${attackerName} throws a ${getItemDisplay(weapon)} that bursts into flames and hits ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}**. **${totalDamage}** damage dealt.\n`
	}

	// melee weapon
	if (limbsHit.length > 1) {
		const limbsHitStrings = []

		for (const limbHit of limbsHit) {
			limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
		}

		return `${attackerName} hit ${victimName} in the ${combineArrayWithAnd(limbsHitStrings)} with their ${getItemDisplay(weapon)}. **${totalDamage}** damage dealt.\n`
	}

	return `${attackerName} hit ${victimName} in the ${getBodyPartEmoji(limbsHit[0].limb)} **${limbsHit[0].limb === 'head' ? '*HEAD*' : limbsHit[0].limb}** with their ${getItemDisplay(weapon)}. **${totalDamage}** damage dealt.\n`
}
