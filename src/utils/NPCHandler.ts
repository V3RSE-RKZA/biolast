import { AnyGuildChannel } from 'eris'
import App from '../app'
import { allNPCs, NPC } from '../resources/npcs'
import { allLocations } from '../resources/raids'
import { Item } from '../types/Items'
import { query } from './db/mysql'
import { createNPC, deleteNPC, getAllNPCs } from './db/npcs'

class NPCHandler {
	private app: App

	constructor(app: App) {
		this.app = app
	}

	async start (): Promise<void> {
		const spawns = await getAllNPCs(query)

		// loop through all raid locations and check
		// if the raid channels have an npc spawned
		for (const location of allLocations) {
			for (const guildId of location.guilds) {
				const guild = this.app.bot.guilds.get(guildId)

				// make sure guild is cached on this shard
				if (guild) {
					for (const raidChannel of location.channels) {
						const channel = guild.channels.find(ch => ch.name === raidChannel.name)

						if (channel) {
							const spawn = spawns.find(row => row.channelId === channel.id)

							if (spawn) {
								// mob already spawned, set timeouts here
								const mob = allNPCs.find(npc => npc.id === spawn.id)

								if (!mob) {
									// mob doesn't exist anymore, delete the row
									await deleteNPC(query, spawn.channelId)
								}
								else {
									// send messages showing that mob is present in channel
									const maxInterval = location.raidLength / 3
									const minInterval = location.raidLength / 5
									const timer = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval

									setInterval(async () => {
										try {
											await this.app.bot.createMessage(channel.id, {
												content: mob.quotes[Math.floor(Math.random() * mob.quotes.length)]
											})
										}
										catch (err) {
											console.warn(`Failed to send message: ${err}`)
										}
									}, timer * 1000)
								}
							}
							else if (raidChannel.npcSpawns) {
								// mob not spawned, spawn here
								await this.spawnNPC(channel)
							}
						}
						else {
							// this shouldn't happen
							console.error(`UNABLE TO FIND CHANNEL WITH NAME: ${raidChannel.name} IN GUILD: ${guild.name} (${guild.id})`)
						}
					}
				}
			}
		}
	}

	/**
	 * Spawns an NPC in a raid channel after some time
	 * @param channel Channel to spawn npc in
	 */
	async spawnNPC (channel: AnyGuildChannel): Promise<void> {
		const location = allLocations.find(loc => loc.channels.some(ch => ch.name === channel.name))
		const raidChannel = location?.channels.find(ch => ch.name === channel.name)

		if (location && raidChannel && raidChannel.npcSpawns) {
			const timer = Math.floor(Math.random() * (raidChannel.npcSpawns.cooldownMax - raidChannel.npcSpawns.cooldownMin + 1)) + raidChannel.npcSpawns.cooldownMin
			const possibleSpawns = raidChannel.npcSpawns.npcs

			console.log(`Spawning NPC at channel: ${channel.name} in ${timer} seconds`)

			setTimeout(async () => {
				try {
					const npc = possibleSpawns[Math.floor(Math.random() * possibleSpawns.length)]
					const maxInterval = location.raidLength / 3
					const minInterval = location.raidLength / 5
					const intervalTimer = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval

					await createNPC(query, channel.id, npc)

					await this.app.bot.createMessage(channel.id, {
						content: npc.quotes[Math.floor(Math.random() * npc.quotes.length)]
					})

					setInterval(async () => {
						try {
							await this.app.bot.createMessage(channel.id, {
								content: npc.quotes[Math.floor(Math.random() * npc.quotes.length)]
							})
						}
						catch (err) {
							console.warn(`Failed to send message: ${err}`)
						}
					}, intervalTimer * 1000)
				}
				catch (err) {
					console.error(err)
				}
			}, timer * 1000)
		}
		else {
			console.error(`Channel: ${channel.name} (${channel.id}) is not a raid channel that spawns NPCs`)
		}
	}

	getDrop (npc: NPC): Item | undefined {
		const rand = Math.random()
		let randomItem

		if (rand < 0.60) {
			randomItem = npc.drops.common[Math.floor(Math.random() * npc.drops.common.length)]
		}
		else if (rand < 0.85) {
			randomItem = npc.drops.uncommon[Math.floor(Math.random() * npc.drops.uncommon.length)]
		}
		else {
			randomItem = npc.drops.rare[Math.floor(Math.random() * npc.drops.rare.length)]
		}

		return randomItem
	}
}

export default NPCHandler
