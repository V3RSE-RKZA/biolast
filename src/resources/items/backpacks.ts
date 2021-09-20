import { Backpack } from '../../types/Items'

const backpackObject = <T>(et: { [K in keyof T]: Backpack & { name: K } }) => et

export const backpacks = backpackObject({
	small_pouch: {
		type: 'Backpack',
		name: 'small_pouch',
		icon: '<:U_backpack:601366669595508736>',
		aliases: ['pouch'],
		sellPrice: 21,
		slots: 4,
		slotsUsed: 1,
		itemLevel: 5
	}
})
