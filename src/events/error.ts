export async function run(error: Error, id: number): Promise<void> {
	console.error(`[SHARD ${id}] Error: ${error.message}`)
}
