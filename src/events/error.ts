import { logger } from '../utils/logger'

export async function run (error: Error, id: number): Promise<void> {
	logger.error(`[SHARD ${id}] Error: ${error.message}`)
}
