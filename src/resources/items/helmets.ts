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
		level: 4,
		slotsUsed: 2
	},
	cloth_helmet: {
		type: 'Helmet',
		name: 'cloth_helmet',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['helmet'],
		sellPrice: 1000,
		durability: 3,
		level: 1,
		slotsUsed: 2
	},
	wooden_helmet: {
		type: 'Helmet',
		name: 'wooden_helmet',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['wood_helmet'],
		sellPrice: 1500,
		durability: 3,
		level: 2,
		slotsUsed: 2
	},
	metal_facemask: {
		type: 'Helmet',
		name: 'metal_facemask',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['facemask'],
		sellPrice: 3000,
		durability: 3,
		level: 2,
		slotsUsed: 2
	}

})
