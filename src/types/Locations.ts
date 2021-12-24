import { NPC } from '../resources/npcs'
import { Item } from './Items'

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
	 * How many times to roll a random item name
	 */
	rolls: number
}


interface AreaBase {
	name: string
	display: string
	loot: Loot

	/**
	 * Whether or not NPCs can be encountered here
	 */
	npcSpawns?: {
		/**
		 * Chance to encounter NPC when scavenging here (0 - 100)
		 */
		chance: number

		/**
		 * NPCs that can spawn in this channel
		 */
		npcs: NPC[]
	}

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

type Area = RequiredKeyArea | OptionalKeyArea | FreeLootArea

export interface Location {
	id: string
	display: string

	requirements: {
		/**
		 * The minimum level required to scavenge areas in this location
		 */
		minLevel: number
	}

	areas: Area[]
}
