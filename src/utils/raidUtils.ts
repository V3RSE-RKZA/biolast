import { customsGuilds } from '../config'
import { Item, items } from '../resources/items'
import { customs, Location, RaidChannel } from '../resources/raids'

/**
 * Check if guild ID is a raid server
 * @param guildID The guild ID to check
 * @returns Whether or not guild is a raid server
 */
export function isRaidGuild (guildID?: string): boolean {
	return !!getRaidType(guildID || 'false')
}

export function getRaidType (guildID: string): Location | undefined {
	if (customsGuilds.includes(guildID)) {
		return customs
	}
}

/**
 * Gets a random scavenged item from a raid channel
 * @param raidChannel The channel to get scavenge loot for
 * @returns An item
 */
export function getRandomItem (raidChannel: RaidChannel): Item | undefined {
	const rand = Math.random()
	let randomItem

	if (raidChannel.scavange.rarest && rand < 0.05) {
		const randName = raidChannel.scavange.rarest[Math.floor(Math.random() * raidChannel.scavange.rarest.length)]
		randomItem = items.find(itm => itm.name === randName)
	}
	else if (rand < 0.55) {
		const randName = raidChannel.scavange.common[Math.floor(Math.random() * raidChannel.scavange.common.length)]
		randomItem = items.find(itm => itm.name === randName)
	}
	else if (rand < 0.85) {
		const randName = raidChannel.scavange.uncommon[Math.floor(Math.random() * raidChannel.scavange.uncommon.length)]
		randomItem = items.find(itm => itm.name === randName)
	}
	else {
		const randName = raidChannel.scavange.rare[Math.floor(Math.random() * raidChannel.scavange.rare.length)]
		randomItem = items.find(itm => itm.name === randName)
	}

	return randomItem
}
