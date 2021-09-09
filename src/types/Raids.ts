import { NPC } from '../resources/npcs'
import { Item } from './Items'

interface ScavengeBase {
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

	/**
	 * How often this channel can be scavenged in seconds
	 */
	cooldown: number

	/**
	 * Key/item user must have in order to scavenge this channel
	 */
	requiresKey?: Item

	/**
	 * Whether or not the required key to scavenge this channel is optional.
	 *
	 * If set to true and the user scavenges with the key, they will receive an
	 * item from the special loot pool
	 */
	keyIsOptional?: boolean
}

interface FreeScavenge extends ScavengeBase {
	requiresKey?: undefined
}

interface KeyScavenge extends ScavengeBase {
	keyIsOptional: boolean
	requiresKey: Item
}

interface RequiredKeyScavenge extends KeyScavenge {
	keyIsOptional: false
	requiresKey: Item
}

interface OptionalKeyScavenge extends KeyScavenge {
	keyIsOptional: true
	requiresKey: Item

	/**
	 * Loot pool if user scavenges with the special key
	 */
	special: {
		items: Item[]

		/**
		 * The amount of xp for rolling this loot drop
		 */
		xp: number
	}
}

type ScavengeOptions = RequiredKeyScavenge | OptionalKeyScavenge | FreeScavenge

interface RaidChannelBase {
	type: 'EvacChannel' | 'LootChannel'
	name: string
	display: string
	scavange?: ScavengeOptions

	/**
	 * Whether or not NPCs spawn in this channel
	 */
	npcSpawns?: {
		/**
		 * The minimum cooldown in seconds for an NPC to spawn after a previous NPC dies
		 */
		cooldownMin: number

		/**
		 * The maximum cooldown in seconds for an NPC to spawn after a previous NPC dies
		 */
		cooldownMax: number

		/**
		 * NPCs that can spawn in this channel
		 */
		npcs: NPC[]
	}
}

interface LootChannel extends RaidChannelBase {
	type: 'LootChannel'
}

interface EvacChannel extends RaidChannelBase {
	type: 'EvacChannel'
	evac: {
		/**
		 * How long in seconds it takes for user to evac
		 */
		time: number

		/**
		 * The key user must have in order to evac here, escaping here should remove 1 durability from the key
		 */
		requiresKey?: Item
	}
}

export interface Location {
	id: string
	display: string

	/**
	 * How long the raid lasts in seconds
	 */
	raidLength: number

	playerLimit: number

	requirements: {
		/**
		 * The minimum level required to enter this location
		 */
		minLevel: number
		/**
		 * The maximum level a user can be when entering this location
		 */
		maxLevel: number
		item?: Item
	}

	/**
	 * IDs of guilds for this location
	 */
	guilds: string[]

	channels: RaidChannel[]
}

export type RaidChannel = LootChannel | EvacChannel
