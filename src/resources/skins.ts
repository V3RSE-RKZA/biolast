import { Item } from '../types/Items'
import { items } from './items'

export interface ItemSkin {
	name: string
	aliases: string[]
	icon: string
	rarity: 'Common' | 'Uncommon' | 'Rare' | 'Insanely Rare'

	/**
	 * ID of the discord user the made the skin
	 */
	artist?: string

	skinFor: Item
}

export const skins: ItemSkin[] = [
	{
		name: 'lollichop',
		aliases: [],
		icon: '<:lollichop:928336537823875153>',
		rarity: 'Common',
		artist: '600383557038374913',
		skinFor: items.fire_axe
	}
]
