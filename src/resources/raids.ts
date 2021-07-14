export interface Location {
	display: string

	/**
	 * How long the raid lasts in seconds
	 */
	raidLength: number

	channels: RaidChannel[]
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

export const customs: Location = {
	display: 'Customs',
	raidLength: 20 * 60,
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
		}
	]
}
