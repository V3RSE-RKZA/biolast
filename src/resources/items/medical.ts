import { Medical } from '../../types/Items'

const medicalObject = <T>(et: { [K in keyof T]: Medical & { name: K } }) => et

export const medical = medicalObject({
	bandage: {
		type: 'Medical',
		name: 'bandage',
		icon: '<:U_usable:601366669259964418>',
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
		name: 'ifak_medkit',
		icon: '<:U_usable:601366669259964418>',
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
		name: 'compression_bandage',
		icon: '<:U_usable:601366669259964418>',
		description: 'Elastic bandage designed to reduce the flow of blood to an area in order to restrict swelling.',
		aliases: ['compress_bandage', 'compress'],
		sellPrice: 52,
		healsFor: 17,
		slotsUsed: 1,
		healRate: 19,
		itemLevel: 3,
		durability: 1
	},
	hyfin_chest_seal: {
		type: 'Medical',
		name: 'hyfin_chest_seal',
		icon: '<:U_usable:601366669259964418>',
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
		name: 'corn',
		icon: '<:U_usable:601366669259964418>',
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
		name: 'apple',
		icon: '<:U_usable:601366669259964418>',
		aliases: [],
		sellPrice: 9,
		healsFor: 7,
		slotsUsed: 1,
		healRate: 15,
		itemLevel: 1,
		durability: 2
	}
})
