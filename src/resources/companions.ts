export interface Companion {
	/**
	 * The unique name of this companion
	 */
	name: string

	/**
	 * The cost to purchase this companion
	 */
	price: number

	/**
	 * How many times can this companions skills be upgraded
	 */
	maxUpgrades: number

	/**
	 * How much stress does this companion gain when they complete a fetch mission
	 */
	stressPerFetch: number

	/**
	 * Icon image of the companion
	 */
	icon: string
}

export const companions: Companion[] = [
	{
		name: 'Silas the Raider',
		price: 1000,
		maxUpgrades: 5,
		stressPerFetch: 30,
		icon: '<:silas:933168015686651904>'
	},
	{
		name: 'Scavenger Landon',
		price: 10000,
		maxUpgrades: 10,
		stressPerFetch: 25,
		icon: '<:landon:933168396579799120>'
	},
	{
		name: 'John the Survivalist',
		price: 200000,
		maxUpgrades: 20,
		stressPerFetch: 25,
		icon: '<:john:933167778536509520>'
	}
]
