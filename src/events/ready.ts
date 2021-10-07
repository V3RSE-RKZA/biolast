import App from '../app'
import { allLocations } from '../resources/raids'
import { query } from '../utils/db/mysql'
import { userInRaid } from '../utils/db/raids'
import { logger } from '../utils/logger'
import { syncRaidGuilds } from '../utils/syncRaidGuilds'

export async function run (this: App): Promise<void> {
	// sync raid guilds with the proper channel structure and permissions
	await syncRaidGuilds(this)

	await this.loadRaidTimers()

	await new Promise(res => setTimeout(res, 1500))
	await this.npcHandler.start()

	// kick out players who are still in a raid even though their raid timer expired while bot was offline
	for (const location of allLocations) {
		for (const id of location.guilds) {
			const guild = this.bot.guilds.get(id)

			if (guild) {
				await guild.fetchAllMembers()

				for (const mem of guild.members) {
					const member = mem[1]

					if (member.id !== guild.ownerID && member.id !== this.bot.user.id && !(await userInRaid(query, member.id))) {
						await member.kick('Users raid has expired while the bot was offline')
					}
				}
			}
		}
	}

	this.acceptingCommands = true
	logger.info('Bot ready and accepting commands!')
}
