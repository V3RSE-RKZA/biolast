import { suburbsGuilds } from '../config'
import { Item } from '../types/Items'
import { items } from './items'
import { NPC, npcs } from './npcs'

export interface Location {
	display: string

	/**
	 * How long the raid lasts in seconds
	 */
	raidLength: number

	playerLimit: number

	requirements: {
		level: number
		item?: Item
	}

	/**
	 * IDs of guilds for this location
	 */
	guilds: string[]

	channels: RaidChannel[]
}

export type RaidChannel = LootChannel | EvacChannel

interface RaidChannelBase {
	type: 'EvacChannel' | 'LootChannel'
	name: string
	display: string
	scavange: {
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
	}

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

const locationsObject = <T>(et: { [K in keyof T]: Location }) => et

export const locations = locationsObject({
	suburbs: {
		display: 'The Suburbs',
		guilds: suburbsGuilds,
		requirements: {
			level: 1
		},
		raidLength: 20 * 60,
		playerLimit: 20,
		channels: [
			{
				type: 'LootChannel',
				name: 'red-house',
				display: 'Red House',
				scavange: {
					common: {
						items: [items.ak47, items['7.62x51']],
						xp: 10
					},
					uncommon: {
						items: [items.ak47],
						xp: 15
					},
					rare: {
						items: [items.ak47],
						xp: 20
					},
					rolls: 4,
					cooldown: 1 * 10
				},
				npcSpawns: {
					npcs: [npcs.walker_weak],
					cooldownMin: 60,
					cooldownMax: 120
				}
			},
			{
				type: 'LootChannel',
				name: 'apartments',
				display: 'Apartments',
				scavange: {
					common: {
						items: [items['ai-2_medkit'], items['7.62x54r_lps']],
						xp: 10
					},
					uncommon: {
						items: [items['ai-2_medkit'], items['7.62x54r_lps']],
						xp: 15
					},
					rare: {
						items: [items['ai-2_medkit'], items['7.62x54r_lps']],
						xp: 20
					},
					rolls: 3,
					cooldown: 1 * 10
				}
			},
			{
				type: 'EvacChannel',
				name: 'backwoods-evac',
				display: 'Backwoods',
				scavange: {
					common: {
						items: [items.paca_armor],
						xp: 10
					},
					uncommon: {
						items: [items.paca_armor],
						xp: 15
					},
					rare: {
						items: [items.paca_armor],
						xp: 20
					},
					rolls: 2,
					cooldown: 1 * 10,
					requiresKey: items.ak47
				},
				evac: {
					time: 30,
					requiresKey: items.paca_armor
				}
			}
		]
	}
})

export const allLocations = Object.values(locations)
