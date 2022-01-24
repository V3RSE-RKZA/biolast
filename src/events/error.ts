import { EventHandler } from '../types/Events'
import { logger } from '../utils/logger'

export default {
	name: 'error',
	async run (error, shardID) {
		logger.error(`[SHARD ${shardID || 'unknown'}] Error: ${error.message}`)
	}
} as EventHandler<'error'>
