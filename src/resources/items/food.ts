import { Food } from '../../types/Items'

const foodObject = <T>(et: { [K in keyof T]: Food & { name: K } }) => et

export const food = foodObject({
	pizza_slice: {
		type: 'Food',
		name: 'pizza_slice',
		description: 'A rotting slice of pizza. Maybe it still tastes good.',
		icon: '<:pizza_food:931430476940472330>',
		aliases: [],
		sellPrice: 19,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 2,
		reducesHunger: 15,
		artist: '719365897458024558'
	},
	pretzel: {
		type: 'Food',
		name: 'pretzel',
		description: 'A delicious pretzel.',
		icon: '<:pretzel_food:931430476843999262>',
		aliases: [],
		sellPrice: 18,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 2,
		reducesHunger: 15,
		artist: '719365897458024558'
	},
	corn: {
		type: 'Food',
		name: 'corn',
		icon: '<:corn_food:931425274720051231>',
		aliases: [],
		sellPrice: 18,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 3,
		reducesHunger: 13,
		artist: '719365897458024558'
	},
	apple: {
		type: 'Food',
		name: 'apple',
		icon: '<:apple_food:931425255761793054>',
		aliases: [],
		sellPrice: 19,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 2,
		reducesHunger: 17,
		artist: '719365897458024558'
	},
	donut: {
		type: 'Food',
		name: 'donut',
		icon: '<:food:886561670447652886>',
		aliases: [],
		sellPrice: 100,
		slotsUsed: 1,
		itemLevel: 7,
		durability: 1,
		reducesHunger: 60
	}
})
