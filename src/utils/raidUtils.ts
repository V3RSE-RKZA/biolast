import { customsGuilds } from '../config'

/**
 * Check if guild ID is a raid server
 * @param guildID The guild ID to check
 * @returns Whether or not guild is a raid server
 */
export function isRaidGuild (guildID: string): boolean {
	return customsGuilds.includes(guildID)
}
