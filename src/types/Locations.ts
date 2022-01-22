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
	 * Cooldown in seconds user won't be able to scavenge this area after a successful scavenge
	 */
	scavengeCooldown: number

	/**
	 * NPC that can spawns in this channel
	 */
	npc?: NPC

	/**
	 * Key/item's user must have in order to scavenge this area. If you specify multiple items, the user must have at least 1 of them to scavenge.
	 */
	requiresKey?: Item[]

	/**
	 * Whether or not the required key to scavenge this area is optional.
	 *
	 * If set to true and the user scavenges with the key, they will receive an
	 * item from the special loot pool
	 */
	keyIsOptional?: boolean
}
interface KeyArea extends AreaBase {
	requiresKey: Item[]
	keyIsOptional: boolean
}
interface RequiredKeyArea extends KeyArea {
	keyIsOptional: false
	requiresKey: Item[]
}
interface OptionalKeyArea extends KeyArea {
	keyIsOptional: true
	requiresKey: Item[]

	/**
	 * Loot pool if user scavenges with the special key
	 */
	specialLoot: {
		items: Item[]

		/**
		 * The amount of xp for rolling this loot drop
		 */
		xp: number
	}
}

interface FreeLootArea extends AreaBase {
	requiresKey?: undefined
}

export type LocationLevel = 1 | 2 | 3 | 4

export type Area = RequiredKeyArea | OptionalKeyArea | FreeLootArea

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
	boss: NPC

	areas: Area[]

	/**
	 * Quests user can get if they have unlocked this region
	 */
	quests: RegionQuest[]
}
