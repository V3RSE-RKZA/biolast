export interface Companion {
	/**
	 * The unique name of this companion
	 */
	name: string

	/**
	 * The level this companion starts at when purchased
	 */
	startingLevel: number

	/**
	 * How long in seconds it takes this companion to complete their fetch mission
	 */
	fetchTime: number

	/**
	 * The cost to purchase this companion
	 */
	price: number

	/**
	 * How many items this companion finds from fetching
	 */
	itemsFound: number

	/**
	 * URL image of the companion
	 */
	image?: string
}

export const companions: Companion[] = [
	{
		name: 'cool cat',
		startingLevel: 1,
		fetchTime: 60 * 1,
		itemsFound: 1,
		price: 1,
		image: 'https://cdn.discordapp.com/attachments/497302646521069570/908025992252108810/coolcat.PNG'
	}
]
