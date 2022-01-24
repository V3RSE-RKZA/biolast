import { EventHandler } from '../types/Events'
import { logger } from '../utils/logger'

export default {
	name: 'ready',
	async run () {
		this.acceptingCommands = true
		logger.info('Bot ready and accepting commands!')
	}
} as EventHandler<'ready'>
