import { AnyGuildChannel } from 'eris'
import App from '../app'
import { allNPCs } from '../resources/npcs'
import { allLocations } from '../resources/raids'
import { query } from './db/mysql'
import { deleteNPC, getAllNPCs } from './db/npcs'

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

	async spawnNPC (channel: AnyGuildChannel): Promise<void> {
		const location = allLocations.find(loc => loc.channels.some(ch => ch.name === channel.name))
		const raidChannel = location?.channels.find(ch => ch.name === channel.name)

		if (raidChannel && raidChannel.npcSpawns) {
			const timer = Math.floor(Math.random() * (raidChannel.npcSpawns.cooldownMax - raidChannel.npcSpawns.cooldownMin + 1)) + raidChannel.npcSpawns.cooldownMin

			console.log(`Spawning NPC at channel: ${channel.name} in ${timer} seconds`)

			setTimeout(async () => {
				try {
					await this.app.bot.createMessage(channel.id, {
						content: 'A MOB HAS SPAWNED OMG KILL IT'
					})
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
}

export default NPCHandler
