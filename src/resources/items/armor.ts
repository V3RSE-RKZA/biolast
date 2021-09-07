import { Armor } from '../../types/Items'

const armorObject = <T>(et: { [K in keyof T]: (Armor) & { name: K } }) => et

export const items = armorObject({
	paca_armor: {
		type: 'Body Armor',
		name: 'paca_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['paca'],
		sellPrice: 2000,
		durability: 3,
		level: 3,
		slotsUsed: 2
	},
	cloth_armor: {
		type: 'Body Armor',
		name: 'cloth_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['cloth', 'armor'],
		sellPrice: 1000,
		durability: 3,
		level: 1,
		slotsUsed: 2
	},
	wooden_armor: {
		type: 'Body Armor',
		name: 'wooden_armor',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['wood_armor'],
		sellPrice: 1500,
		durability: 3,
		level: 2,
		slotsUsed: 2
	},
	metal_chestplate: {
		type: 'Body Armor',
		name: 'metal_chestplate',
		icon: '<:U_shield:601366669474136074>',
		aliases: ['chestplate'],
		sellPrice: 3000,
		durability: 5,
		level: 5,
		slotsUsed: 3
	}
})
