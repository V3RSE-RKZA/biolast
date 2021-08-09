import { Medical } from '../../types/Items'

const medicalObject = <T>(et: { [K in keyof T]: Medical & { name: K } }) => et

export const items = medicalObject({
	bandage: {
		type: 'Medical',
		name: 'bandage',
		icon: '<:U_usable:601366669259964418>',
		aliases: ['bandage'],
		sellPrice: 1000,
		healsFor: 20,
		slotsUsed: 1,
		healRate: 25
	},
	ifak_medkit: {
		type: 'Medical',
		name: 'ifak_medkit',
		icon: '<:U_usable:601366669259964418>',
		aliases: ['ifak', 'medkit'],
		sellPrice: 1700,
		healsFor: 35,
		slotsUsed: 1,
		healRate: 30
	},
	paracetamol: {
		type: 'Medical',
		name: 'paracetamol',
		icon: '<:U_usable:601366669259964418>',
		aliases: ['paracet'],
		sellPrice: 1300,
		healsFor: 25,
		slotsUsed: 1,
		healRate: 25
	}
})
