import { User } from 'slash-create'
import App from '../app'
import { allNPCs, NPC } from '../resources/npcs'
import { allLocations } from '../resources/raids'
import { Item } from '../types/Items'
import { BackpackItemRow, Query, UserRow } from '../types/mysql'
import { deleteItem, dropItemToGround, lowerItemDurability, removeItemFromBackpack } from './db/items'
import { query } from './db/mysql'
import { createNPC, deleteNPC, getAllNPCs } from './db/npcs'
import { lowerHealth } from './db/players'
import { removeUserFromRaid } from './db/raids'
import formatHealth from './formatHealth'
import { getEquips, getItemDisplay, getItems } from './itemUtils'
import { logger } from './logger'
import { getAttackDamage, getBodyPartHit } from './raidUtils'
import getRandomInt from './randomInt'

class NPCHandler {
	private app: App
	private intervals: Map<string, NodeJS.Timeout>

	constructor (app: App) {
		this.app = app
		this.intervals = new Map()
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
									const timer = getRandomInt(minInterval, maxInterval)

									const interval = setInterval(async () => {
										try {
											await this.app.bot.createMessage(channel.id, {
												content: mob.quotes[Math.floor(Math.random() * mob.quotes.length)]
											})
										}
										catch (err) {
											logger.warn(`Failed to send message: ${err}`)
										}
									}, timer * 1000)

									this.intervals.set(channel.id, interval)
								}
							}
							else if (raidChannel.npcSpawns) {
								// mob not spawned, spawn here
								await this.spawnNPC(channel.id, channel.name)
							}
						}
						else {
							// this shouldn't happen
							logger.error(`UNABLE TO FIND CHANNEL WITH NAME: ${raidChannel.name} IN GUILD: ${guild.name} (${guild.id})`)
						}
					}
				}
			}
		}
	}

	/**
	 * Spawns an NPC in a raid channel after some time
	 * @param channelID ID of channel to spawn npc in
	 * @param channelName Name of channel to spawn npc in
	 */
	async spawnNPC (channelID: string, channelName: string): Promise<void> {
		const location = allLocations.find(loc => loc.channels.some(ch => ch.name === channelName))
		const raidChannel = location?.channels.find(ch => ch.name === channelName)

		if (location && raidChannel && raidChannel.npcSpawns) {
			const timer = getRandomInt(raidChannel.npcSpawns.cooldownMin, raidChannel.npcSpawns.cooldownMax)
			const possibleSpawns = raidChannel.npcSpawns.npcs

			logger.info(`Spawning NPC at channel: ${channelName} in ${timer} seconds`)

			setTimeout(async () => {
				try {
					const npc = possibleSpawns[Math.floor(Math.random() * possibleSpawns.length)]
					const maxInterval = location.raidLength / 3
					const minInterval = location.raidLength / 5
					const intervalTimer = getRandomInt(minInterval, maxInterval)

					await createNPC(query, channelID, npc)

					await this.app.bot.createMessage(channelID, {
						content: npc.quotes[Math.floor(Math.random() * npc.quotes.length)]
					})

					const interval = setInterval(async () => {
						try {
							await this.app.bot.createMessage(channelID, {
								content: npc.quotes[Math.floor(Math.random() * npc.quotes.length)]
							})
						}
						catch (err) {
							logger.warn(`Failed to send message: ${err}`)
						}
					}, intervalTimer * 1000)

					this.intervals.set(channelID, interval)
				}
				catch (err) {
					logger.error(err)
				}
			}, timer * 1000)
		}
		else {
			logger.error(`Channel: ${channelName} (${channelID}) is not a raid channel that spawns NPCs`)
		}
	}

	/**
	 * Used to get a random item from an NPCs item drop pool
	 * @param npc The NPC to get item drop from
	 * @returns A random item from possible item drops of NPC
	 */
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

	/**
	 * Stops the message send interval for an NPC in a channel
	 * @param channelID ID of channel to stop sending NPC messages to
	 */
	clearNPCInterval (channelID: string): void {
		const interval = this.intervals.get(channelID)

		if (interval) {
			clearInterval(interval)
			this.intervals.delete(channelID)
		}
	}

	/**
	 * Simulates an NPCs attack on a player
	 * @param transactionQuery The transaction query, used to keep all queries inside a transaction. THIS FUNCTION DOES NOT COMMIT THE TRANSACTION, DO THAT AFTER YOU CALL THIS FUNCTION
	 * @param user The slash-create user object of the player getting attacked
	 * @param userRow The user row of player getting attacked
	 * @param userBackpack The backpack of player getting attacked
	 * @param npc The NPC attacking
	 * @param channelID ID of the channel to drop items to in case player dies from this attack
	 * @param removedItems Array of item IDs that were removed from the user already (if the user shot a weapon for example, their ammo would've been removed)
	 * @returns Object containing the attack messages, how much damage the NPC dealt, and how many items were removed from the user during the attack (such as their armor or helmet)
	 */
	async attackPlayer (
		transactionQuery: Query,
		user: User,
		userRow: UserRow,
		userBackpack: BackpackItemRow[],
		npc: NPC,
		channelID: string,
		removedItems: number[]
	): Promise<{ messages: string[], damage: number, removedItems: number }> {
		const messages = []
		const userBackpackData = getItems(userBackpack)
		const userEquips = getEquips(userBackpack)
		let bodyPartHit
		let npcDamage

		if (npc.type === 'raider' || npc.type === 'boss') {
			bodyPartHit = getBodyPartHit(npc.weapon.accuracy)

			if (npc.subtype === 'ranged') {
				// raider is using ranged weapon
				npcDamage = getAttackDamage(npc.damage, npc.ammo.penetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item)

				messages.push(`The \`${npc.type}\` shot <@${user.id}> in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with their ${getItemDisplay(npc.weapon)} (ammo: ${getItemDisplay(npc.ammo)}). **${npcDamage.total}** damage dealt.\n`)
			}
			else {
				npcDamage = getAttackDamage(npc.damage, npc.weapon.penetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item)

				messages.push(`The \`${npc.type}\` lunged at <@${user.id}>'s **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with their ${getItemDisplay(npc.weapon)}. **${npcDamage.total}** damage dealt.\n`)
			}
		}
		else {
			// walker doesn't use a weapon, instead just swipes at user
			bodyPartHit = getBodyPartHit(50)
			npcDamage = getAttackDamage(npc.damage, 0.75, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item)

			messages.push(`The \`${npc.type}\` took a swipe at <@${user.id}>'s **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}**. **${npcDamage.total}** damage dealt.\n`)
		}

		if (bodyPartHit.result === 'head' && userEquips.helmet) {
			messages.push(`**${user.username}#${user.discriminator}**'s helmet (${getItemDisplay(userEquips.helmet.item)}) reduced the damage by **${npcDamage.reduced}**.`)

			if (userEquips.helmet.row.durability - 1 <= 0) {
				messages.push(`**${user.username}#${user.discriminator}**'s ${getItemDisplay(userEquips.helmet.item)} broke from this attack!`)

				await deleteItem(transactionQuery, userEquips.helmet.row.id)
				removedItems.push(userEquips.helmet.row.id)
			}
			else {
				await lowerItemDurability(transactionQuery, userEquips.helmet.row.id, 1)
			}
		}
		else if (bodyPartHit.result === 'chest' && userEquips.armor) {
			messages.push(`**${user.username}#${user.discriminator}**'s armor (${getItemDisplay(userEquips.armor.item)}) reduced the damage by **${npcDamage.reduced}**.`)

			if (userEquips.armor.row.durability - 1 <= 0) {
				messages.push(`**${user.username}#${user.discriminator}**'s ${getItemDisplay(userEquips.armor.item)} broke from this attack!`)

				await deleteItem(transactionQuery, userEquips.armor.row.id)
				removedItems.push(userEquips.armor.row.id)
			}
			else {
				await lowerItemDurability(transactionQuery, userEquips.armor.row.id, 1)
			}
		}

		if (userRow.health - npcDamage.total <= 0) {
			for (const victimItem of userBackpackData.items) {
				if (!removedItems.includes(victimItem.row.id)) {
					await removeItemFromBackpack(transactionQuery, victimItem.row.id)
					await dropItemToGround(transactionQuery, channelID, victimItem.row.id)
				}
			}

			await removeUserFromRaid(transactionQuery, user.id)

			messages.push(`☠️ **${user.username}#${user.discriminator}** DIED! They dropped **${userBackpackData.items.length - removedItems.length}** items on the ground.`)
		}
		else {
			await lowerHealth(transactionQuery, user.id, npcDamage.total)

			messages.push(`**${user.username}#${user.discriminator}** is left with ${formatHealth(userRow.health - npcDamage.total, userRow.maxHealth)} **${userRow.health - npcDamage.total}** health.`)
		}

		return {
			messages,
			damage: npcDamage.total,
			removedItems: removedItems.length
		}
	}
}

export default NPCHandler
