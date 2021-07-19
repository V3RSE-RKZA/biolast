import { Guild, Member } from 'eris'
import { query } from '../utils/db/mysql'
import { getUsersRaid } from '../utils/db/raids'
import { isRaidGuild } from '../utils/raidUtils'

export async function run(guild: Guild, member: Member): Promise<void> {
	if (isRaidGuild(guild.id)) {
		const userRaid = await getUsersRaid(query, member.id)

		if (userRaid && userRaid.guildId === guild.id) {
			const role = guild.roles.find(r => r.name === 'Scavenger')

			if (!role) {
				console.error(`Could not find Scavenger role in guild: ${guild.name} (${guild.id})`)
				return
			}

			try {
				await member.addRole(role.id, 'User started raid and joined')
			}
			catch (err) {
				console.error(`Error adding Scavenger role in guild: ${guild.name} (${guild.id})`)
			}
		}
	}
}
