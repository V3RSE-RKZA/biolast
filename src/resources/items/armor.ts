import { Armor } from '../../types/Items'

const armorObject = <T>(et: { [K in keyof T]: (Armor) & { name: K } }) => et

export const armor = armorObject({
	polyethylene_armor: {
		type: 'Body Armor',
		name: 'polyethylene_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['poly_armor', 'polyeth', 'polyethylene', 'level_5_armor'],
		description: 'Polyethylene (UHMWPE) armor is designed to have better stopping power and weigh less than steel armor.',
		sellPrice: 11061,
		durability: 7,
		level: 6,
		slotsUsed: 2,
		itemLevel: 18
	},
	steel_armor: {
		type: 'Body Armor',
		name: 'steel_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['steel'],
		sellPrice: 3972,
		durability: 10,
		level: 5,
		slotsUsed: 4,
		itemLevel: 16
	},
	aramid_armor: {
		type: 'Body Armor',
		name: 'aramid_armor',
		icon: '<:aramid_armor:931433099705860107>',
		aliases: ['aramid'],
		sellPrice: 959,
		durability: 5,
		level: 3,
		slotsUsed: 2,
		itemLevel: 9,
		artist: '719365897458024558'
	},
	cloth_armor: {
		type: 'Body Armor',
		name: 'cloth_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['cloth', 'armor'],
		sellPrice: 38,
		durability: 3,
		level: 1,
		slotsUsed: 2,
		itemLevel: 1
	},
	wooden_armor: {
		type: 'Body Armor',
		name: 'wooden_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['wood_armor'],
		sellPrice: 124,
		durability: 3,
		level: 2,
		slotsUsed: 2,
		itemLevel: 3
	},
	bone_armor: {
		type: 'Body Armor',
		name: 'bone_armor',
		icon: '<:U_shield:601366669474136074>',
		description: 'Rare drop from Cain, The Gravekeeper',
		aliases: ['bone'],
		sellPrice: 241,
		durability: 9,
		level: 2,
		slotsUsed: 2,
		itemLevel: 4
	},
	swat_armor: {
		type: 'Body Armor',
		name: 'swat_armor',
		icon: '<:U_shield:601366669474136074>',
		description: 'Body armor that looks like it can stop a couple of bullets',
		aliases: ['swat'],
		sellPrice: 2100,
		durability: 4,
		level: 4,
		slotsUsed: 3,
		itemLevel: 13
	}
})
