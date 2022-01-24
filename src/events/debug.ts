import { EventHandler } from '../types/Events'
// import { logger } from '../utils/logger'

export default {
	name: 'debug',
	async run (message, shardID) {
		// logger.error(`[SHARD ${shardID || 'unknown'}] Error: ${message}`)
	}
} as EventHandler<'debug'>
