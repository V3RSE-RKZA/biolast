import { Helmet } from '../../types/Items'

const helmetObject = <T>(et: { [K in keyof T]: (Helmet) & { name: K } }) => et

export const helmets = helmetObject({
	polyethylene_helmet: {
		type: 'Helmet',
		name: 'polyethylene_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['poly_helm', 'polyeth_helm', 'polyethylene_helm', 'level_5_helm'],
		description: 'Polyethylene (UHMWPE) armor is designed to have better stopping power and weigh less than steel armor.',
		sellPrice: 8261,
		durability: 5,
		level: 5,
		slotsUsed: 2,
		itemLevel: 12
	},
	steel_helmet: {
		type: 'Helmet',
		name: 'steel_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: [],
		sellPrice: 1120,
		durability: 5,
		level: 4,
		slotsUsed: 2,
		itemLevel: 12
	},
	aramid_helmet: {
		type: 'Helmet',
		name: 'aramid_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: [],
		sellPrice: 372,
		durability: 4,
		level: 3,
		slotsUsed: 2,
		itemLevel: 9
	},
	cloth_helmet: {
		type: 'Helmet',
		name: 'cloth_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['helmet'],
		sellPrice: 42,
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
		sellPrice: 152,
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
		sellPrice: 235,
		durability: 9,
		level: 2,
		slotsUsed: 2,
		itemLevel: 3
	},
	sauce_pan: {
		type: 'Helmet',
		name: 'sauce_pan',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['pan'],
		sellPrice: 50,
		durability: 6,
		level: 1,
		slotsUsed: 2,
		itemLevel: 1
	},
	psycho_mask: {
		type: 'Helmet',
		name: 'psycho_mask',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['psycho', 'mask'],
		sellPrice: 50,
		durability: 1,
		level: 3,
		slotsUsed: 1,
		itemLevel: 8
	},
	swat_helmet: {
		type: 'Helmet',
		name: 'swat_helmet',
		icon: '<:U_helmet:874671013181415434>',
		aliases: ['swat'],
		sellPrice: 50,
		durability: 1,
		level: 3,
		slotsUsed: 1,
		itemLevel: 8
	}
})
