import { Location, RaidChannel, allLocations } from '../resources/raids'
import { Item } from '../types/Items'

/**
 * Check if guild ID is a raid server
 * @param guildID The guild ID to check
 * @returns Whether or not guild is a raid server
 */
export function isRaidGuild (guildID?: string): boolean {
	return !!getRaidType(guildID || 'false')
}

export function getRaidType (guildID: string): Location | undefined {
	for (const location of allLocations) {
		if (location.guilds.includes(guildID)) {
			return location
		}
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
		randomItem = raidChannel.scavange.rarest[Math.floor(Math.random() * raidChannel.scavange.rarest.length)]
	}
	else if (rand < 0.60) {
		randomItem = raidChannel.scavange.common[Math.floor(Math.random() * raidChannel.scavange.common.length)]
	}
	else if (rand < 0.85) {
		randomItem = raidChannel.scavange.uncommon[Math.floor(Math.random() * raidChannel.scavange.uncommon.length)]
	}
	else {
		randomItem = raidChannel.scavange.rare[Math.floor(Math.random() * raidChannel.scavange.rare.length)]
	}

	return randomItem
}
