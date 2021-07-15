export interface Location {
	display: string

	/**
	 * How long the raid lasts in seconds
	 */
	raidLength: number

	playerLimit: number

	channels: RaidChannel[]
}

export type RaidChannel = LootChannel | ExtractChannel

export interface RaidChannelBase {
	type: 'ExtractChannel' | 'LootChannel'
	name: string
	display: string
	scavange: {
		/**
		 * Array of item names, one name is picked random
		 * 50% - 55% chance of rolling this loot pool
		 */
		common: string[]

		/**
		 * 30% chance of rolling this loot pool
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

export interface ExtractChannel extends RaidChannelBase {
	type: 'ExtractChannel'
	extract: {
		/**
		 * How long in seconds it takes for user to extract
		 */
		time: number

		/**
		 * The key user must have in order to extract here, extracting should remove 1 durability from the key
		 */
		requiresKey?: string
	}
}

export const customs: Location = {
	display: 'Customs',
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
				rolls: 1,
				cooldown: 5 * 60
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
				rolls: 1,
				cooldown: 5 * 60
			}
		},
		{
			type: 'ExtractChannel',
			name: 'trailer-park-exfil',
			display: 'Trailer Park',
			scavange: {
				common: ['paca_armor'],
				uncommon: ['paca_armor'],
				rare: ['paca_armor'],
				rolls: 1,
				cooldown: 5 * 60,
				requiresKey: 'paca_armor'
			},
			extract: {
				time: 30,
				requiresKey: 'paca_armor'
			}
		}
	]
}
