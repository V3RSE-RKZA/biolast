import { suburbsGuilds } from '../config'

export interface Location {
	display: string

	/**
	 * How long the raid lasts in seconds
	 */
	raidLength: number

	playerLimit: number

	requirements: {
		level: number
		item?: string
	}

	/**
	 * IDs of guilds for this location
	 */
	guilds: string[]

	channels: RaidChannel[]
}

export type RaidChannel = LootChannel | EvacChannel

export interface RaidChannelBase {
	type: 'EvacChannel' | 'LootChannel'
	name: string
	display: string
	scavange: {
		/**
		 * Array of item names, one name is picked random
		 * 55% - 60% chance of rolling this loot pool
		 */
		common: string[]

		/**
		 * 25% chance of rolling this loot pool
		 */
		uncommon: string[]

		/**
		 * 15% chance of rolling this loot pool
		 */
		rare: string[]

		/**
		 * 5% chance of rolling this loot pool
		 */
		rarest?: string[]

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
		requiresKey?: string
	}
}

export interface LootChannel extends RaidChannelBase {
	type: 'LootChannel'
}

export interface EvacChannel extends RaidChannelBase {
	type: 'EvacChannel'
	evac: {
		/**
		 * How long in seconds it takes for user to evac
		 */
		time: number

		/**
		 * The key user must have in order to evac here, escaping here should remove 1 durability from the key
		 */
		requiresKey?: string
	}
}

export const suburbs: Location = {
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
			name: 'red-building',
			display: 'Red Building',
			scavange: {
				common: ['ak47', '7.62x51'],
				uncommon: ['ak47'],
				rare: ['ak47'],
				rolls: 4,
				cooldown: 1 * 10
			}
		},
		{
			type: 'LootChannel',
			name: 'customs-office',
			display: 'Customs Office',
			scavange: {
				common: ['ai-2_medkit', '7.62x54r_lps'],
				uncommon: ['ai-2_medkit'],
				rare: ['ai-2_medkit'],
				rolls: 3,
				cooldown: 1 * 10
			}
		},
		{
			type: 'EvacChannel',
			name: 'trailer-park-evac',
			display: 'Trailer Park',
			scavange: {
				common: ['paca_armor'],
				uncommon: ['paca_armor'],
				rare: ['paca_armor'],
				rolls: 2,
				cooldown: 1 * 10,
				requiresKey: 'ak47'
			},
			evac: {
				time: 30,
				requiresKey: 'paca_armor'
			}
		}
	]
}

export const allLocations = [suburbs]
