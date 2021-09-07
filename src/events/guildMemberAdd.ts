import { Guild, Member } from 'eris'
import { query } from '../utils/db/mysql'
import { getUsersRaid } from '../utils/db/raids'
import { logger } from '../utils/logger'
import { isRaidGuild } from '../utils/raidUtils'
import getRandomInt from '../utils/randomInt'

export async function run (guild: Guild, member: Member): Promise<void> {
	if (isRaidGuild(guild.id)) {
		try {
			await member.edit({ nick: `Scavenger ${getRandomInt(10000, 99999)}` }, 'Setting random scavenger nickname')
		}
		catch (err) {
			logger.err('Failed to change members nickname in raid guild:', err)
		}

		const userRaid = await getUsersRaid(query, member.id)

		if (userRaid && userRaid.guildId === guild.id) {
			const role = guild.roles.find(r => r.name === 'Scavenger')

			if (!role) {
				logger.error(`Could not find Scavenger role in guild: ${guild.name} (${guild.id})`)
				return
			}

			try {
				await member.addRole(role.id, 'User started raid and joined')
			}
			catch (err) {
				logger.error(`Error adding Scavenger role in guild: ${guild.name} (${guild.id})`)
			}
		}
	}
}
