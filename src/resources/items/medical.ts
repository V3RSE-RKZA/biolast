import { Medical } from '../../types/Items'

const medicalObject = <T>(et: { [K in keyof T]: Medical }) => et

export const items = medicalObject({
	'ai-2_medkit': {
		type: 'Medical',
		name: 'ai-2_medkit',
		icon: '<:U_usable:601366669259964418>',
		aliases: ['ai-2', 'medkit'],
		sellPrice: 1000,
		healsFor: 20,
		slotsUsed: 1,
		healRate: 30
	}
})
