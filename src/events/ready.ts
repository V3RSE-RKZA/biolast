import App from '../app'

export async function run(this: App): Promise<void> {
	console.log('Bot ready!')

	await this.loadRaidTimers()
	await this.npcHandler.start()

	this.acceptingCommands = true
}
