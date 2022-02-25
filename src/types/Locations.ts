import { Item } from './Items'
import { NPC } from './NPCs'
import { RegionQuest } from './Quests'

interface Loot {
	/**
	 * Array of item names, one name is picked random
	 * 55% - 60% chance of rolling this loot pool
	 */
	common: {
		items: Item[]

		/**
		 * The amount of xp for rolling this loot drop
		 */
		xp: number
	}

	/**
	 * 25% chance of rolling this loot pool
	 */
	uncommon: {
		items: Item[]

		/**
		 * The amount of xp for rolling this loot drop
		 */
		xp: number
	}

	/**
	 * 15% chance of rolling this loot pool
	 */
	rare: {
		items: Item[]

		/**
		 * The amount of xp for rolling this loot drop
		 */
		xp: number
	}

	/**
	 * 5% chance of rolling this loot pool
	 */
	rarest?: {
		items: Item[]

		/**
		 * The amount of xp for rolling this loot drop
		 */
		xp: number
	}

	/**
	 * How many times to roll a random item
	 */
	rolls: number
}


interface AreaBase {
	display: string
	loot: Loot

	/**
	 * Key/item's user must have in order to scavenge this area. If you specify multiple items, the user must have at least 1 of them to scavenge.
	 */
	requiresKey?: Item

	/**
	 * Quote when user is viewing the area (description of the area from the players perspective)
	 */
	quote?: string
}
interface KeyArea extends AreaBase {
	requiresKey: Item
}

interface FreeLootArea extends AreaBase {
	requiresKey?: undefined
}

export type LocationLevel = 1 | 2 | 3 | 4 | 5

export type Area = KeyArea | FreeLootArea

export interface Location {
	display: string

	/**
	 * The minimum locationLevel user must have in order to travel to this location
	 */
	locationLevel: LocationLevel

	/**
	 * Icon to display in select menu on travel command for this location
	 */
	icon: string

	/**
	 * The boss user must beat in order to advance their locationLevel (if they haven't beaten the boss already)
	 */
	boss: {
		/**
		 * Cooldown in seconds player will have to wait before they can fight this boss again
		 */
		cooldown: number
		npc: NPC
	}

	/**
	 * Like the boss except not as strong
	 */
	miniboss?: {
		/**
		 * Cooldown in seconds player will have to wait before they can fight this boss again
		 */
		cooldown: number
		npc: NPC
	}

	huntMobs: NPC[]

	areas: Area[]

	/**
	 * Quests user can get if they have unlocked this region
	 */
	quests: RegionQuest[]
}
