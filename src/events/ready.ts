import App from '../app'
import { logger } from '../utils/logger'
import { syncRaidGuilds } from '../utils/syncRaidGuilds'

export async function run (this: App): Promise<void> {
	// sync raid guilds with the proper channel structure and permissions
	await syncRaidGuilds(this)

	await this.loadRaidTimers()

	await new Promise(res => setTimeout(res, 1500))
	await this.npcHandler.start()

	this.acceptingCommands = true
	logger.info('Bot ready and accepting commands!')
}
