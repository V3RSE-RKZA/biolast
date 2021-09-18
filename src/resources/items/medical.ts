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
		sellPrice: 102,
		healsFor: 25,
		slotsUsed: 2,
		healRate: 30,
		itemLevel: 3,
		durability: 2
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
		sellPrice: 27,
		healsFor: 15,
		slotsUsed: 1,
		healRate: 30,
		itemLevel: 3,
		durability: 3
	},
	apple: {
		type: 'Medical',
		name: 'apple',
		icon: '<:U_usable:601366669259964418>',
		aliases: [],
		sellPrice: 77,
		healsFor: 15,
		slotsUsed: 1,
		healRate: 20,
		itemLevel: 3,
		durability: 2
	}
})
