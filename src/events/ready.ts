import App from '../app'
import { logger } from '../utils/logger'

export async function run (this: App): Promise<void> {
	logger.info('Bot ready!')

	await this.loadRaidTimers()
	await this.npcHandler.start()

	this.acceptingCommands = true
}
