import { Medical } from '../../types/Items'

const medicalObject = <T>(et: { [K in keyof T]: Medical & { name: K } }) => et

export const medical = medicalObject({
	bandage: {
		type: 'Medical',
		subtype: 'Healing',
		name: 'bandage',
		icon: '<:medical:886561670745452554>',
		aliases: ['bandage'],
		sellPrice: 37,
		healsFor: 20,
		slotsUsed: 1,
		healRate: 25,
		itemLevel: 1,
		durability: 1
	},
	ifak_medkit: {
		type: 'Medical',
		subtype: 'Healing',
		name: 'ifak_medkit',
		icon: '<:medical:886561670745452554>',
		aliases: ['ifak', 'medkit'],
		description: 'An individual first aid kit which contains supplies for immediate minor injuries.',
		sellPrice: 102,
		healsFor: 25,
		slotsUsed: 2,
		healRate: 30,
		itemLevel: 3,
		durability: 2
	},
	compression_bandage: {
		type: 'Medical',
		subtype: 'Healing',
		name: 'compression_bandage',
		icon: '<:medical:886561670745452554>',
		description: 'Elastic bandage designed to reduce the flow of blood to an area in order to restrict swelling.',
		aliases: ['compress_bandage', 'compress'],
		sellPrice: 52,
		healsFor: 17,
		slotsUsed: 1,
		healRate: 19,
		itemLevel: 3,
		durability: 1
	},
	adrenaline_stimulant: {
		type: 'Medical',
		subtype: 'Stimulant',
		name: 'adrenaline_stimulant',
		icon: '<:syringe:886561670812549130>',
		aliases: ['adrenaline', 'adrena_stim'],
		sellPrice: 52,
		slotsUsed: 1,
		itemLevel: 10,
		durability: 1,
		effects: {
			damageBonus: 15,
			accuracyBonus: 0,
			weightBonus: 0,
			length: 300
		}
	},
	hyfin_chest_seal: {
		type: 'Medical',
		subtype: 'Healing',
		name: 'hyfin_chest_seal',
		icon: '<:medical:886561670745452554>',
		aliases: ['chest_seal', 'hyfin', 'hyfin_seal', 'seal'],
		description: 'Compact chest seal designed to seal penetrative wounds to the chest.',
		sellPrice: 202,
		healsFor: 42,
		slotsUsed: 1,
		healRate: 55,
		itemLevel: 6,
		durability: 1
	},
	paracetamol: {
		type: 'Medical',
		subtype: 'Healing',
		name: 'paracetamol',
		icon: '<:U_usable:601366669259964418>',
		aliases: ['paracet'],
		sellPrice: 89,
		healsFor: 25,
		slotsUsed: 1,
		healRate: 25,
		itemLevel: 1,
		durability: 1
	},
	corn: {
		type: 'Medical',
		subtype: 'Healing',
		name: 'corn',
		icon: '<:food:886561670447652886>',
		aliases: [],
		sellPrice: 8,
		healsFor: 6,
		slotsUsed: 1,
		healRate: 16,
		itemLevel: 1,
		durability: 3
	},
	apple: {
		type: 'Medical',
		subtype: 'Healing',
		name: 'apple',
		icon: '<:food:886561670447652886>',
		aliases: [],
		sellPrice: 9,
		healsFor: 7,
		slotsUsed: 1,
		healRate: 15,
		itemLevel: 1,
		durability: 2
	}
})
