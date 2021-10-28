import { Backpack } from '../../types/Items'

const backpackObject = <T>(et: { [K in keyof T]: Backpack & { name: K } }) => et

export const backpacks = backpackObject({
	small_pouch: {
		type: 'Backpack',
		name: 'small_pouch',
		icon: '<:U_backpack:601366669595508736>',
		aliases: ['pouch'],
		sellPrice: 47,
		slots: 4,
		slotsUsed: 1,
		itemLevel: 5
	},
	cloth_backpack: {
		type: 'Backpack',
		name: 'cloth_backpack',
		icon: '<:U_backpack:601366669595508736>',
		aliases: ['backpack'],
		sellPrice: 262,
		slots: 7,
		slotsUsed: 1,
		itemLevel: 5
	},
	duffle_bag: {
		type: 'Backpack',
		name: 'duffle_bag',
		icon: '<:U_backpack:601366669595508736>',
		aliases: ['duffle', 'bag'],
		sellPrice: 945,
		slots: 14,
		slotsUsed: 2,
		itemLevel: 8
	}
})
