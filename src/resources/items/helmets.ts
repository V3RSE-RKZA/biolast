import { Helmet } from '../../types/Items'

const helmetObject = <T>(et: { [K in keyof T]: (Helmet) & { name: K } }) => et

export const helmets = helmetObject({
	paca_helmet: {
		type: 'Helmet',
		name: 'paca_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['helmet'],
		sellPrice: 129,
		durability: 3,
		level: 3,
		slotsUsed: 2,
		itemLevel: 5
	},
	cloth_helmet: {
		type: 'Helmet',
		name: 'cloth_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['helmet'],
		sellPrice: 27,
		durability: 3,
		level: 1,
		slotsUsed: 2,
		itemLevel: 1
	},
	wooden_helmet: {
		type: 'Helmet',
		name: 'wooden_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['wood_helmet'],
		sellPrice: 52,
		durability: 3,
		level: 2,
		slotsUsed: 2,
		itemLevel: 3
	},
	bone_helmet: {
		type: 'Helmet',
		name: 'bone_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['bone_helm'],
		sellPrice: 135,
		durability: 9,
		level: 2,
		slotsUsed: 2,
		itemLevel: 3
	},
	sauce_pan: {
		type: 'Helmet',
		name: 'sauce_pan',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['helmet'],
		sellPrice: 35,
		durability: 6,
		level: 1,
		slotsUsed: 2,
		itemLevel: 1
	}
})
