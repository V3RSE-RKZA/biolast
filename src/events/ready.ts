import App from '../app'
import { logger } from '../utils/logger'

export async function run (this: App): Promise<void> {
	this.acceptingCommands = true
	logger.info('Bot ready and accepting commands!')
}
