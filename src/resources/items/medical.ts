import { Medical } from '../../types/Items'

const medicalObject = <T>(et: { [K in keyof T]: Medical & { name: K } }) => et

export const medical = medicalObject({
	'bandage': {
		type: 'Medical',
		subtype: 'Healing',
		name: 'bandage',
		icon: '<:medical:886561670745452554>',
		aliases: ['bandage'],
		sellPrice: 37,
		healsFor: 20,
		slotsUsed: 1,
		speed: 25,
		itemLevel: 1,
		durability: 1,
		curesBitten: false,
		curesBrokenArm: false,
		curesBurning: false
	},
	'ifak_medkit': {
		type: 'Medical',
		subtype: 'Healing',
		name: 'ifak_medkit',
		icon: '<:medical:886561670745452554>',
		aliases: ['ifak', 'medkit'],
		description: 'An individual first aid kit which contains supplies for immediate minor injuries.',
		sellPrice: 102,
		healsFor: 25,
		slotsUsed: 2,
		speed: 6,
		itemLevel: 3,
		durability: 2,
		curesBitten: false,
		curesBrokenArm: false,
		curesBurning: false
	},
	'compression_bandage': {
		type: 'Medical',
		subtype: 'Healing',
		name: 'compression_bandage',
		icon: '<:medical:886561670745452554>',
		description: 'Elastic bandage designed to reduce the flow of blood to an area in order to restrict swelling.',
		aliases: ['compress_bandage', 'compress'],
		sellPrice: 152,
		healsFor: 20,
		slotsUsed: 1,
		speed: 20,
		itemLevel: 3,
		durability: 1,
		curesBitten: false,
		curesBrokenArm: false,
		curesBurning: false
	},
	'adrenaline': {
		type: 'Medical',
		subtype: 'Stimulant',
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
			damageReduction: -20
		},
		speed: 30
	},
	'hypo_stim': {
		type: 'Medical',
		subtype: 'Stimulant',
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
			damageReduction: 0
		},
		speed: 30
	},
	'adderall': {
		type: 'Medical',
		subtype: 'Stimulant',
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
			damageReduction: 0
		},
		speed: 30
	},
	'morphine': {
		type: 'Medical',
		subtype: 'Stimulant',
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
			damageReduction: 20
		},
		speed: 30
	},
	'daves_concoction': {
		type: 'Medical',
		subtype: 'Stimulant',
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
			damageReduction: 0
		},
		speed: 30
	},
	'hyfin_chest_seal': {
		type: 'Medical',
		subtype: 'Healing',
		name: 'hyfin_chest_seal',
		icon: '<:medical:886561670745452554>',
		aliases: ['chest_seal', 'hyfin', 'hyfin_seal', 'seal'],
		description: 'Compact chest seal designed to seal penetrative wounds to the chest.',
		sellPrice: 1202,
		healsFor: 62,
		slotsUsed: 1,
		itemLevel: 9,
		durability: 2,
		curesBitten: false,
		curesBrokenArm: false,
		curesBurning: false,
		speed: 3
	},
	'paracetamol': {
		type: 'Medical',
		subtype: 'Healing',
		name: 'paracetamol',
		icon: '<:U_usable:601366669259964418>',
		aliases: ['paracet'],
		sellPrice: 429,
		healsFor: 35,
		slotsUsed: 1,
		itemLevel: 4,
		durability: 2,
		curesBitten: false,
		curesBrokenArm: false,
		curesBurning: false,
		speed: 10
	},
	'splint': {
		type: 'Medical',
		subtype: 'Healing',
		name: 'splint',
		icon: '<:U_usable:601366669259964418>',
		description: 'Use this to fix broken limbs.',
		aliases: [],
		sellPrice: 146,
		healsFor: 10,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 1,
		curesBitten: false,
		curesBrokenArm: true,
		curesBurning: false,
		speed: 15
	},
	'anti-biotics': {
		type: 'Medical',
		subtype: 'Healing',
		name: 'anti-biotics',
		icon: '<:U_usable:601366669259964418>',
		description: 'Cures various infections, such as those from walker bites.',
		aliases: ['antibiotics'],
		sellPrice: 307,
		healsFor: 20,
		slotsUsed: 1,
		itemLevel: 3,
		durability: 1,
		curesBitten: true,
		curesBrokenArm: false,
		curesBurning: false,
		speed: 20
	}
})
