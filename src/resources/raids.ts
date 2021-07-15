export interface Location {
	display: string

	/**
	 * How long the raid lasts in seconds
	 */
	raidLength: number

	playerLimit: number

	channels: (RaidChannel | ExtractChannel)[]
}

export interface RaidChannel {
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
	}
}

export type ExtractChannel = TimedExtract | ItemExtract

export interface TimedExtract extends RaidChannel {
	extract: {
		type: 'Timed'

		/**
		 * How long in seconds it takes for user to extract
		 */
		time: number
	}
}

export interface ItemExtract extends RaidChannel {
	extract: {
		/**
		 * Item extracts require the user to give an item to extract, this will extract them instantly
		 */
		type: 'Item'

		/**
		 * The item user must give in order to extract here
		 */
		item: string
	}
}

export const customs: Location = {
	display: 'Customs',
	raidLength: 20 * 60,
	playerLimit: 20,
	channels: [
		{
			name: 'red-building',
			display: 'Red Building',
			scavange: {
				common: ['ak47'],
				uncommon: ['ak47'],
				rare: ['ak47'],
				rolls: 1,
				cooldown: 5 * 60
			}
		},
		{
			name: 'customs-office',
			display: 'Customs Office',
			scavange: {
				common: ['ai-2_medkit'],
				uncommon: ['ai-2_medkit'],
				rare: ['ai-2_medkit'],
				rolls: 1,
				cooldown: 5 * 60
			}
		},
		{
			name: 'trailer-park-extract',
			display: 'Trailer Park',
			scavange: {
				common: ['paca_armor'],
				uncommon: ['paca_armor'],
				rare: ['paca_armor'],
				rolls: 1,
				cooldown: 5 * 60
			},
			extract: {
				type: 'Timed',
				time: 30
			}
		}
	]
}
