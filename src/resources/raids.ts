interface Location {
	display: string
	channels: RaidChannel[]
}

interface RaidChannel {
	name: string
	display: string
	scavangeLoot: {
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
		 * How many time to get a random item name.
		 */
		rolls: number
	}
}

export const customs: Location = {
	display: 'Customs',
	channels: [
		{
			name: 'red-building',
			display: 'Red Building',
			scavangeLoot: {
				common: ['ak47'],
				uncommon: ['ak47'],
				rare: ['ak47'],
				rolls: 1
			}
		}
	]
}
