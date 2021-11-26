import { Food } from '../../types/Items'

const foodObject = <T>(et: { [K in keyof T]: Food & { name: K } }) => et

export const food = foodObject({
	pizza_slice: {
		type: 'Food',
		name: 'pizza_slice',
		description: 'A rotting slice of pizza. Maybe it still tastes good.',
		icon: '<:food:886561670447652886>',
		aliases: [],
		sellPrice: 19,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 2,
		reducesHunger: 15
	},
	pretzel: {
		type: 'Food',
		name: 'pretzel',
		description: 'A delicious pretzel.',
		icon: '<:food:886561670447652886>',
		aliases: [],
		sellPrice: 18,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 2,
		reducesHunger: 15
	},
	corn: {
		type: 'Food',
		name: 'corn',
		icon: '<:food:886561670447652886>',
		aliases: [],
		sellPrice: 18,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 3,
		reducesHunger: 13
	},
	apple: {
		type: 'Food',
		name: 'apple',
		icon: '<:food:886561670447652886>',
		aliases: [],
		sellPrice: 19,
		slotsUsed: 1,
		itemLevel: 1,
		durability: 2,
		reducesHunger: 17
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
