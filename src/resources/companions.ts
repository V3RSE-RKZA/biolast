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

	/**
	 * Icon image URL of the companion
	 */
	iconURL: string


	/**
	 * Discord ID of the user who drew the icon for this item
	 */
	artist?: string
}

export const companions: Companion[] = [
	{
		name: 'Silas the Raider',
		price: 1000,
		maxUpgrades: 5,
		stressPerFetch: 30,
		icon: '<:silas:944974268654055484>',
		iconURL: 'https://cdn.discordapp.com/attachments/886559272660533251/944976708895920138/silas.png',
		artist: '719365897458024558'
	},
	{
		name: 'Scavenger Landon',
		price: 10000,
		maxUpgrades: 10,
		stressPerFetch: 25,
		icon: '<:landon:944974268800839680>',
		iconURL: 'https://cdn.discordapp.com/attachments/886559272660533251/944976708560379984/landon.png',
		artist: '719365897458024558'
	},
	{
		name: 'John the Survivalist',
		price: 200000,
		maxUpgrades: 20,
		stressPerFetch: 25,
		icon: '<:john:944974268683411476>',
		iconURL: 'https://cdn.discordapp.com/attachments/886559272660533251/944976708291919912/john.png',
		artist: '719365897458024558'
	}
]
