import { Armor } from '../../types/Items'

const armorObject = <T>(et: { [K in keyof T]: (Armor) & { name: K } }) => et

export const items = armorObject({
	paca_armor: {
		type: 'Body Armor',
		name: 'paca_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['paca'],
		sellPrice: 2000,
		durability: 5,
		level: 3,
		slotsUsed: 2
	},
	cloth_armor: {
		type: 'Body Armor',
		name: 'cloth_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['cloth', 'armor'],
		sellPrice: 750,
		durability: 3,
		level: 1,
		slotsUsed: 2
	},
	wooden_armor: {
		type: 'Body Armor',
		name: 'wooden_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['wood_armor'],
		sellPrice: 900,
		durability: 3,
		level: 2,
		slotsUsed: 2
	},
	bone_armor: {
		type: 'Body Armor',
		name: 'bone_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['bone'],
		sellPrice: 2000,
		durability: 8,
		level: 2,
		slotsUsed: 3
	}
})
