import { StatusEffects } from '../types/Items'

export interface Affliction {
	name: string
	effects: StatusEffects
}

const afflictionsObject = <T>(et: { [K in keyof T]: Affliction & { name: K } }) => et

export const afflictions = afflictionsObject({
	'Burning': {
		name: 'Burning',
		effects: {
			damageBonus: 0,
			accuracyBonus: 0,
			damageTaken: 25
		}
	},
	'Broken Arm': {
		name: 'Broken Arm',
		effects: {
			damageBonus: -10,
			accuracyBonus: -35,
			damageTaken: 0
		}
	},
	'Bitten': {
		name: 'Bitten',
		effects: {
			damageBonus: -20,
			accuracyBonus: 0,
			damageTaken: 20
		}
	}
})

export type AfflictionName = keyof typeof afflictions

export const allAfflictions = Object.values(afflictions)
