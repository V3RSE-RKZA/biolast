import { Backpack } from '../../types/Items'

const backpackObject = <T>(et: { [K in keyof T]: Backpack & { name: K } }) => et

export const backpacks = backpackObject({
	small_pouch: {
		type: 'Backpack',
		name: 'small_pouch',
		icon: '<:small_pouch:931797105369042955>',
		aliases: ['pouch'],
		sellPrice: 47,
		slots: 4,
		slotsUsed: 1,
		itemLevel: 5,
		artist: '719365897458024558'
	},
	cloth_backpack: {
		type: 'Backpack',
		name: 'cloth_backpack',
		icon: '<:cloth_backpack:933852769364877322>',
		aliases: ['backpack'],
		sellPrice: 262,
		slots: 7,
		slotsUsed: 1,
		itemLevel: 5,
		artist: '719365897458024558'
	},
	duffle_bag: {
		type: 'Backpack',
		name: 'duffle_bag',
		icon: '<:duffle_bag:933852647394537573>',
		aliases: ['duffle', 'bag'],
		sellPrice: 945,
		slots: 14,
		slotsUsed: 2,
		itemLevel: 8,
		artist: '719365897458024558'
	}
})
