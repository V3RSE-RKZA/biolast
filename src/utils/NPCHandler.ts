import { Member } from 'slash-create'
import App from '../app'
import { icons, raidCooldown } from '../config'
import { allNPCs, NPC } from '../resources/npcs'
import { allLocations } from '../resources/raids'
import { Item } from '../types/Items'
import { BackpackItemRow, Query, UserRow } from '../types/mysql'
import { Location } from '../types/Raids'
import { createCooldown } from './db/cooldowns'
import { deleteItem, dropItemToGround, lowerItemDurability, removeItemFromBackpack } from './db/items'
import { query } from './db/mysql'
import { createNPC, deleteNPC, getAllNPCs } from './db/npcs'
import { lowerHealth } from './db/players'
import { removeUserFromRaid } from './db/raids'
import { combineArrayWithAnd, formatHealth, getBodyPartEmoji, getRarityDisplay } from './stringUtils'
import { getEquips, getItemDisplay, getItems, sortItemsByLevel } from './itemUtils'
import { logger } from './logger'
import { getAttackDamage, getBodyPartHit } from './raidUtils'
import getRandomInt from './randomInt'
import { addStatusEffects, getActiveStimulants } from './playerUtils'
import { TextChannel, Webhook } from 'eris'
import Embed from '../structures/Embed'

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
						const channel = guild.channels.find(ch => ch.name === raidChannel.name) as TextChannel

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
									const webhook = await this.getNPCWebhook(channel)

									const interval = setInterval(async () => {
										try {
											await this.app.bot.executeWebhook(webhook.id, webhook.token, {
												username: mob.display,
												avatarURL: mob.avatarURL,
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
								await this.spawnNPC(channel)
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

	async getNPCWebhook (channel: TextChannel): Promise<Webhook> {
		const webhooks = await channel.getWebhooks()
		let webhook: Webhook

		if (webhooks.length) {
			webhook = webhooks[0]
		}
		else {
			webhook = await channel.createWebhook({
				name: 'NPC'
			}, 'Creating NPC webhook for quotes')
		}

		return webhook
	}

	/**
	 * Spawns an NPC in a raid channel after some time
	 * @param channel Channel to spawn npc in
	 */
	async spawnNPC (channel: TextChannel): Promise<void> {
		const location = allLocations.find(loc => loc.channels.some(ch => ch.name === channel.name))
		const raidChannel = location?.channels.find(ch => ch.name === channel.name)

		if (location && raidChannel && raidChannel.npcSpawns) {
			const timer = getRandomInt(raidChannel.npcSpawns.cooldownMin, raidChannel.npcSpawns.cooldownMax)
			const possibleSpawns = raidChannel.npcSpawns.npcs

			logger.info(`Spawning NPC at channel: ${channel.name} in ${timer} seconds`)

			setTimeout(async () => {
				try {
					const npc = possibleSpawns[Math.floor(Math.random() * possibleSpawns.length)]
					const maxInterval = location.raidLength / 3
					const minInterval = location.raidLength / 5
					const intervalTimer = getRandomInt(minInterval, maxInterval)
					const webhook = await this.getNPCWebhook(channel)

					await createNPC(query, channel.id, npc)

					await this.app.bot.executeWebhook(webhook.id, webhook.token, {
						username: npc.display,
						avatarURL: npc.avatarURL,
						content: npc.quotes[Math.floor(Math.random() * npc.quotes.length)]
					})

					const interval = setInterval(async () => {
						try {
							await this.app.bot.executeWebhook(webhook.id, webhook.token, {
								username: npc.display,
								avatarURL: npc.avatarURL,
								content: npc.quotes[Math.floor(Math.random() * npc.quotes.length)]
							})
						}
						catch (err) {
							logger.warn(`Failed to send message: ${err}`)
						}
					}, intervalTimer * 1000)

					this.intervals.set(channel.id, interval)
				}
				catch (err) {
					logger.error(err)
				}
			}, timer * 1000)
		}
		else {
			logger.error(`Channel: ${channel.name} (${channel.id}) is not a raid channel that spawns NPCs`)
		}
	}

	/**
	 * Used to get a random item from an NPCs item drop pool
	 * @param npc The NPC to get item drop from
	 * @returns A random item from possible item drops of NPC
	 */
	getDrop (npc: NPC): { item: Item, rarityDisplay: string } | undefined {
		const rand = Math.random()
		let randomItem
		let rarityDisplay

		if (rand < 0.60) {
			randomItem = npc.drops.common[Math.floor(Math.random() * npc.drops.common.length)]
			rarityDisplay = getRarityDisplay('Common')
		}
		else if (rand < 0.85) {
			randomItem = npc.drops.uncommon[Math.floor(Math.random() * npc.drops.uncommon.length)]
			rarityDisplay = getRarityDisplay('Uncommon')
		}
		else {
			randomItem = npc.drops.rare[Math.floor(Math.random() * npc.drops.rare.length)]
			rarityDisplay = getRarityDisplay('Rare')
		}

		return {
			item: randomItem,
			rarityDisplay
		}
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
	 * @param member The slash-create member object of the player getting attacked
	 * @param userRow The user row of player getting attacked
	 * @param userBackpack The backpack of player getting attacked
	 * @param npc The NPC attacking
	 * @param channelID ID of the channel to drop items to in case player dies from this attack
	 * @param removedItems Array of item IDs that were removed from the user already (if the user shot a weapon for example, their ammo would've been removed)
	 * @returns Object containing the attack messages, how much damage the NPC dealt, and how many items were removed from the user during the attack (such as their armor or helmet)
	 */
	async attackPlayer (
		transactionQuery: Query,
		member: Member,
		userRow: UserRow,
		userBackpack: BackpackItemRow[],
		npc: NPC,
		channelID: string,
		removedItems: number[],
		raidType: Location
	): Promise<{ messages: string[], damage: number, removedItems: number, lootEmbed: Embed | undefined }> {
		const messages = []
		const userBackpackData = getItems(userBackpack)
		const userEquips = getEquips(userBackpack)
		const victimStimulants = await getActiveStimulants(transactionQuery, member.id, ['damage'], true)
		const victimEffects = addStatusEffects(victimStimulants.map(stim => stim.stimulant))
		const stimulantDamageMulti = (1 - (victimEffects.damageReduction / 100))
		const limbsHit = []
		const bodyPartHit = getBodyPartHit(50)
		let totalDamage
		let npcAttackPenetration

		if (npc.type === 'raider' || npc.type === 'boss') {
			if (npc.subtype === 'ranged') {
				// raider is using ranged weapon
				npcAttackPenetration = npc.ammo.penetration

				if (npc.ammo.spreadsDamageToLimbs) {
					limbsHit.push({
						damage: getAttackDamage((npc.damage * stimulantDamageMulti) / npc.ammo.spreadsDamageToLimbs, npc.ammo.penetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
						limb: bodyPartHit.result
					})

					for (let i = 0; i < npc.ammo.spreadsDamageToLimbs - 1; i++) {
						let limb = getBodyPartHit(npc.weapon.accuracy)

						// make sure no duplicate limbs are hit
						while (limbsHit.find(l => l.limb === limb.result)) {
							limb = getBodyPartHit(npc.weapon.accuracy)
						}

						limbsHit.push({
							damage: getAttackDamage((npc.damage * stimulantDamageMulti) / npc.ammo.spreadsDamageToLimbs, npc.ammo.penetration, limb.result, userEquips.armor?.item, userEquips.helmet?.item),
							limb: limb.result
						})
					}
				}
				else {
					limbsHit.push({
						damage: getAttackDamage((npc.damage * stimulantDamageMulti), npc.ammo.penetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
						limb: bodyPartHit.result
					})
				}

				totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

				if (npc.ammo.spreadsDamageToLimbs) {
					const limbsHitStrings = []

					for (const limbHit of limbsHit) {
						limbsHitStrings.push(limbHit.limb === 'head' ? `${getBodyPartEmoji(limbHit.limb)} ***HEAD*** for **${limbHit.damage.total}** damage` : `${getBodyPartEmoji(limbHit.limb)} **${limbHit.limb}** for **${limbHit.damage.total}** damage`)
					}

					messages.push(`${npc.type === 'boss' ? `**${npc.display}**` : `The \`${npc.type}\``} shot <@${member.id}> in the ${combineArrayWithAnd(limbsHitStrings)} with their ${getItemDisplay(npc.weapon)} (ammo: ${getItemDisplay(npc.ammo)}). **${totalDamage}** damage dealt.\n`)
				}
				else {
					messages.push(`${npc.type === 'boss' ? `**${npc.display}**` : `The \`${npc.type}\``} shot <@${member.id}> in the ${getBodyPartEmoji(bodyPartHit.result)} **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with their ${getItemDisplay(npc.weapon)} (ammo: ${getItemDisplay(npc.ammo)}). **${totalDamage}** damage dealt.\n`)
				}
			}
			else if (npc.subtype === 'melee') {
				npcAttackPenetration = npc.weapon.penetration
				limbsHit.push({
					damage: getAttackDamage((npc.damage * stimulantDamageMulti), npcAttackPenetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
					limb: bodyPartHit.result
				})
				totalDamage = limbsHit[0].damage.total

				messages.push(`${npc.type === 'boss' ? `**${npc.display}**` : `The \`${npc.type}\``} lunged at <@${member.id}>'s ${getBodyPartEmoji(bodyPartHit.result)} **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with their ${getItemDisplay(npc.weapon)}. **${totalDamage}** damage dealt.\n`)
			}
			else {
				npcAttackPenetration = npc.attackPenetration
				limbsHit.push({
					damage: getAttackDamage((npc.damage * stimulantDamageMulti), npcAttackPenetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
					limb: bodyPartHit.result
				})
				totalDamage = limbsHit[0].damage.total

				messages.push(`**${npc.display}** took a swipe at <@${member.id}>'s ${getBodyPartEmoji(bodyPartHit.result)} **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}**. **${totalDamage}** damage dealt.\n`)

				if (Math.random() <= (npc.chanceToBite / 100)) {
					messages.push(`${icons.debuff} **${member.displayName}** was ${icons.biohazard} Bitten! (-20% damage dealt, +20% damage taken for 4 minutes)`)
					await createCooldown(transactionQuery, member.id, 'bitten', 4 * 60)
				}
			}
		}
		else {
			// walker doesn't use a weapon, instead just swipes at user
			npcAttackPenetration = npc.attackPenetration
			limbsHit.push({
				damage: getAttackDamage((npc.damage * stimulantDamageMulti), npcAttackPenetration, bodyPartHit.result, userEquips.armor?.item, userEquips.helmet?.item),
				limb: bodyPartHit.result
			})
			totalDamage = limbsHit[0].damage.total

			messages.push(`The \`${npc.type}\` took a swipe at <@${member.id}>'s ${getBodyPartEmoji(bodyPartHit.result)} **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}**. **${totalDamage}** damage dealt.\n`)

			if (Math.random() <= (npc.chanceToBite / 100)) {
				messages.push(`${icons.debuff} **${member.displayName}** was ${icons.biohazard} Bitten! (-20% damage dealt, +20% damage taken for 4 minutes)`)
				await createCooldown(transactionQuery, member.id, 'bitten', 4 * 60)
			}
		}

		for (const result of limbsHit) {
			if (result.limb === 'head' && userEquips.helmet) {
				messages.push(`**${member.displayName}**'s helmet (${getItemDisplay(userEquips.helmet.item)}) reduced the damage by **${result.damage.reduced}**.`)

				// only lower helmet durability if npcs weapon penetration is within 1 penetration (exclusive) of
				// the level of armor victim is wearing (so if someone used a knife with 1.0 level penetration
				// against someone who had level 3 armor, the armor would NOT lose durability)
				if (npcAttackPenetration > userEquips.helmet.item.level - 1) {
					if (userEquips.helmet.row.durability - 1 <= 0) {
						messages.push(`**${member.displayName}**'s ${getItemDisplay(userEquips.helmet.item)} broke from this attack!`)

						await deleteItem(transactionQuery, userEquips.helmet.row.id)
						removedItems.push(userEquips.helmet.row.id)
					}
					else {
						await lowerItemDurability(transactionQuery, userEquips.helmet.row.id, 1)
					}
				}
			}
			else if (result.limb === 'chest' && userEquips.armor) {
				messages.push(`**${member.displayName}**'s armor (${getItemDisplay(userEquips.armor.item)}) reduced the damage by **${result.damage.reduced}**.`)

				if (npcAttackPenetration > userEquips.armor.item.level - 1) {
					if (userEquips.armor.row.durability - 1 <= 0) {
						messages.push(`**${member.displayName}**'s ${getItemDisplay(userEquips.armor.item)} broke from this attack!`)

						await deleteItem(transactionQuery, userEquips.armor.row.id)
						removedItems.push(userEquips.armor.row.id)
					}
					else {
						await lowerItemDurability(transactionQuery, userEquips.armor.row.id, 1)
					}
				}
			}
			else if (result.limb === 'arm' && Math.random() <= 0.2) {
				messages.push(`${icons.debuff} **${member.displayName}**'s arm was broken! (+15% attack cooldown for 4 minutes)`)
				await createCooldown(transactionQuery, member.id, 'broken-arm', 4 * 60)
			}
		}

		let lootEmbed

		if (userRow.health - totalDamage <= 0) {
			// have to filter out the removed armor/helmet to prevent sql reference errors
			const victimLoot = userBackpackData.items.filter(i => !removedItems.includes(i.row.id))

			for (const victimItem of victimLoot) {
				await removeItemFromBackpack(transactionQuery, victimItem.row.id)
				await dropItemToGround(transactionQuery, channelID, victimItem.row.id)
			}

			await removeUserFromRaid(transactionQuery, member.id)
			await createCooldown(transactionQuery, member.id, `raid-${raidType.id}`, raidCooldown)

			messages.push(`☠️ **${member.displayName}** DIED! They dropped **${victimLoot.length}** items on the ground.`)

			lootEmbed = new Embed()
				.setTitle('Items Dropped')
				.setDescription(victimLoot.length ?
					`${sortItemsByLevel(victimLoot, true).slice(0, 10).map(victimItem => getItemDisplay(victimItem.item)).join('\n')}` +
						`${victimLoot.length > 10 ? `\n...and **${victimLoot.length - 10}** other item${victimLoot.length - 10 > 1 ? 's' : ''}` : ''}` :
					'No items were dropped.')
				.setFooter('These items were dropped onto the ground.')
		}
		else {
			await lowerHealth(transactionQuery, member.id, totalDamage)

			messages.push(`**${member.displayName}** is left with ${formatHealth(userRow.health - totalDamage, userRow.maxHealth)} **${userRow.health - totalDamage}** health.`)
		}

		return {
			messages,
			damage: totalDamage,
			lootEmbed,
			removedItems: removedItems.length
		}
	}
}

export default NPCHandler
