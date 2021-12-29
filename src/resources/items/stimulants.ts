import { Stimulant } from '../../types/Items'

const stimulantsObject = <T>(et: { [K in keyof T]: Stimulant & { name: K } }) => et

export const stimulants = stimulantsObject({
	adrenaline: {
		type: 'Stimulant',
		name: 'adrenaline',
		icon: '<:syringe:886561670812549130>',
		aliases: ['adrena_stim', 'adrena'],
		sellPrice: 561,
		slotsUsed: 1,
		itemLevel: 8,
		durability: 1,
		effects: {
			damageBonus: 25,
			accuracyBonus: 0,
			damageTaken: 20
		},
		speed: 30
	},
	hypo_stim: {
		type: 'Stimulant',
		name: 'hypo_stim',
		icon: '<:syringe:886561670812549130>',
		aliases: ['hypo'],
		sellPrice: 571,
		slotsUsed: 1,
		itemLevel: 8,
		durability: 1,
		effects: {
			damageBonus: 0,
			accuracyBonus: -15,
			damageTaken: 0
		},
		speed: 30
	},
	adderall: {
		type: 'Stimulant',
		name: 'adderall',
		icon: '<:syringe:886561670812549130>',
		aliases: ['addy'],
		sellPrice: 581,
		slotsUsed: 1,
		itemLevel: 8,
		durability: 1,
		effects: {
			damageBonus: 0,
			accuracyBonus: 15,
			damageTaken: 0
		},
		speed: 30
	},
	morphine: {
		type: 'Stimulant',
		name: 'morphine',
		icon: '<:syringe:886561670812549130>',
		aliases: [],
		sellPrice: 565,
		slotsUsed: 1,
		itemLevel: 8,
		durability: 1,
		effects: {
			damageBonus: -20,
			accuracyBonus: 0,
			damageTaken: -20
		},
		speed: 30
	},
	daves_concoction: {
		type: 'Stimulant',
		name: 'daves_concoction',
		icon: '<:syringe:886561670812549130>',
		description: 'Dave must have made this stimulant himself, who knows what chemicals it contains.',
		aliases: ['concoction'],
		sellPrice: 1253,
		slotsUsed: 1,
		itemLevel: 10,
		durability: 2,
		effects: {
			damageBonus: 0,
			accuracyBonus: 0,
			damageTaken: 0
		},
		speed: 30
	}
})
