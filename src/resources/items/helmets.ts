import { Helmet } from '../../types/Items'

const helmetObject = <T>(et: { [K in keyof T]: (Helmet) & { name: K } }) => et

export const items = helmetObject({
	paca_helmet: {
		type: 'Helmet',
		name: 'paca_helmet',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['helmet'],
		sellPrice: 2000,
		durability: 3,
		level: 3,
		slotsUsed: 2,
		itemLevel: 5
	},
	cloth_helmet: {
		type: 'Helmet',
		name: 'cloth_helmet',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['helmet'],
		sellPrice: 1000,
		durability: 3,
		level: 1,
		slotsUsed: 2,
		itemLevel: 1
	},
	wooden_helmet: {
		type: 'Helmet',
		name: 'wooden_helmet',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['wood_helmet'],
		sellPrice: 1500,
		durability: 3,
		level: 2,
		slotsUsed: 2,
		itemLevel: 3
	},
	tincan_helmet: {
		type: 'Helmet',
		name: 'tincan_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['tincan'],
		sellPrice: 350,
		durability: 5,
		level: 1,
		slotsUsed: 1,
		itemLevel: 1
	}
})
