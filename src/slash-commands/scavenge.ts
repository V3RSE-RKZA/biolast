import { SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { allNPCs } from '../resources/npcs'
import { quests } from '../resources/quests'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { Item } from '../types/Items'
import { RaidChannel } from '../types/Raids'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'
import { addItemToBackpack, createItem, deleteItem, dropItemToGround, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { getNPC } from '../utils/db/npcs'
import { addXp, getUserRow, increaseDeaths } from '../utils/db/players'
import { getUserQuests, increaseProgress } from '../utils/db/quests'
import { getBackpackLimit, getEquips, getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { messageUser } from '../utils/messageUtils'
import { getRaidType, getRandomItem } from '../utils/raidUtils'

class ScavengeCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'scavenge',
			description: 'Use this command in a channel to search for loot.',
			longDescription: 'Use this command in a channel to search for loot. Make sure the area is clear of threats, otherwise they might attack you!',
			options: [],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,

			// this is automatically populated with the ids of raid guilds since onlyWorksInRaidGuild is set to true
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const raidType = getRaidType(ctx.guildID as string)
		if (!raidType) {
			// raid type not found?? this shouldn't happen so throw error
			throw new Error('Could not find raid type')
		}
		const guild = this.app.bot.guilds.get(ctx.guildID as string)
		if (!guild) {
			throw new Error('Guild not found in Eris cache')
		}
		const raidChannel = raidType.channels.find(ch => ch.name === guild.channels.get(ctx.channelID)?.name)
		if (!raidChannel) {
			// raid channel not found, was the channel not specified in the location?
			throw new Error('Could not find raid channel')
		}

		else if (!raidChannel.scavange) {
			await ctx.send({
				content: '❌ You try to scavenge for items but find nothing.'
			})
			return
		}

		const transaction = await beginTransaction()

		try {
			const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
			const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
			const backpackData = getItems(backpackRows)
			const userEquips = getEquips(backpackRows)
			const keyRequired = raidChannel.scavange.requiresKey
			const hasRequiredKey = sortItemsByDurability(backpackData.items, true).reverse().find(i => i.item.name === keyRequired?.name)
			const scavengeCD = await getCooldown(transaction.query, ctx.user.id, 'scavenge')
			const channelCD = await getCooldown(transaction.query, ctx.channelID, 'looted')
			const backpackLimit = getBackpackLimit(userEquips.backpack?.item)
			const npcRow = await getNPC(transaction.query, ctx.channelID, true)
			const npc = allNPCs.find(n => n.id === npcRow?.id)

			if (channelCD) {
				await transaction.commit()

				await ctx.send({
					content: `❌ This channel was recently scavenged by another player! Loot will respawn in **${channelCD}**.`
				})
				return
			}
			else if (scavengeCD) {
				await transaction.commit()

				await ctx.send({
					content: `❌ You need to wait **${scavengeCD}** before you can scavenge again.`
				})
				return
			}
			else if (keyRequired && !raidChannel.scavange.keyIsOptional && !hasRequiredKey) {
				await transaction.commit()

				await ctx.send({
					content: `❌ You need a ${getItemDisplay(keyRequired)} to scavenge here.`
				})
				return
			}

			// validations passed, add scavenge cooldown
			await createCooldown(transaction.query, ctx.user.id, 'scavenge', 60)

			if (npc) {
				const attackResult = await this.app.npcHandler.attackPlayer(transaction.query, ctx.user, userData, backpackRows, npc, ctx.channelID, [])

				if (userData.health - attackResult.damage <= 0) {
					await increaseDeaths(transaction.query, ctx.user.id, 1)
				}

				await transaction.commit()

				await ctx.send({
					content: `You try to scavenge **${raidChannel.display}** but there was a threat roaming the area!`
				})

				setTimeout(async () => {
					try {
						await ctx.send({
							content: attackResult.messages.join('\n')
						})
					}
					catch (err) {
						logger.error(err)
					}
				}, 2000)

				if (userData.health - attackResult.damage <= 0) {
					// player died
					try {
						const member = await this.app.fetchMember(guild, ctx.user.id)
						this.app.clearRaidTimer(ctx.user.id)

						if (member) {
							await member.kick(`User was killed by NPC while trying to scavenge: ${npc.type} (${npc.display})`)
						}
					}
					catch (err) {
						logger.error(err)
					}

					const erisUser = await this.app.fetchUser(ctx.user.id)
					if (erisUser) {
						await messageUser(erisUser, {
							content: '❌ Raid failed!\n\n' +
								`You were killed by a \`${npc.type}\` who hit you for **${attackResult.damage}** damage. Next time search the area before you scavenge for loot.\n` +
								`You lost all the items in your inventory (**${backpackData.items.length - attackResult.removedItems}** items).`
						})
					}
				}

				return
			}

			// no npc in channel, continue to loot channel
			await createCooldown(transaction.query, ctx.channelID, 'looted', raidChannel.scavange.cooldown)

			const scavengedLoot = []
			const itemsAddedToBackpack = []
			const itemsAddedToGround = []
			let xpEarned = 0

			for (let i = 0; i < raidChannel.scavange.rolls; i++) {
				const randomLoot = hasRequiredKey && raidChannel.scavange.keyIsOptional ?
					this.getRandomSpecialItem(raidChannel) :
					getRandomItem(raidChannel)

				if (randomLoot) {
					const itemRow = await createItem(transaction.query, randomLoot.item.name, randomLoot.item.durability)

					xpEarned += randomLoot.xp

					scavengedLoot.push({
						item: randomLoot.item,
						row: itemRow
					})

					// check if users backpack has space for the item, otherwise throw it on ground
					if (
						backpackData.slotsUsed + scavengedLoot.reduce((prev, curr) => prev + curr.item.slotsUsed, 0) -
						(
							hasRequiredKey &&
							(!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) ? hasRequiredKey.item.slotsUsed : 0
						) <= backpackLimit
					) {
						itemsAddedToBackpack.push({
							item: randomLoot.item,
							row: itemRow
						})

						await addItemToBackpack(transaction.query, ctx.user.id, itemRow.id)
					}
					else {
						itemsAddedToGround.push({
							item: randomLoot.item,
							row: itemRow
						})

						await dropItemToGround(transaction.query, ctx.channelID, itemRow.id)
					}
				}
			}

			await addXp(transaction.query, ctx.user.id, xpEarned)

			// lower durability or remove key
			if (hasRequiredKey) {
				const userQuests = (await getUserQuests(transaction.query, ctx.user.id, true)).filter(q => q.questType === 'Scavenge With A Key')

				// check if user had a quest to scavenge with a key
				for (const questRow of userQuests) {
					const quest = quests.find(q => q.id === questRow.questId)

					if (
						quest &&
						quest.questType === 'Scavenge With A Key' &&
						quest.key.name === hasRequiredKey.item.name &&
						questRow.progress < questRow.progressGoal
					) {
						await increaseProgress(transaction.query, questRow.id, 1)
					}
				}

				if (!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) {
					await deleteItem(transaction.query, hasRequiredKey.row.id)
				}
				else {
					await lowerItemDurability(transaction.query, hasRequiredKey.row.id, 1)
				}
			}

			await transaction.commit()

			const finalMessage = `You ${hasRequiredKey ?
				`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
				''}scavenge **${raidChannel.display}** and find:\n\n${scavengedLoot.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || '**nothing**!'}\n🌟 ***+${xpEarned}** xp!*`

			if (!scavengedLoot.length || (!itemsAddedToBackpack.length && !itemsAddedToGround.length)) {
				await ctx.send({
					content: finalMessage
				})
			}
			else if (itemsAddedToBackpack.length && itemsAddedToGround.length) {
				// items were added to both backpack and ground
				await ctx.send({
					content: `${finalMessage}\n\n` +
						`These items were added to your **inventory**: ${itemsAddedToBackpack.map(itm => getItemDisplay(itm.item, itm.row)).join(', ')}\n\n` +
						`Your inventory ran out of space and you were forced to leave the following on the **ground**: ${itemsAddedToGround.map(itm => getItemDisplay(itm.item, itm.row)).join(', ')}`
				})
			}
			else if (itemsAddedToBackpack.length && !itemsAddedToGround.length) {
				// all items were added to backpack
				await ctx.send({
					content: `${finalMessage}\n\n` +
						'These items were added to your inventory.'
				})
			}
			else if (itemsAddedToGround.length && !itemsAddedToBackpack.length) {
				// all items were put on ground
				await ctx.send({
					content: `${finalMessage}\n\n` +
						'Your inventory ran out of space and you were forced to leave these items on the **ground**.'
				})
			}
		}
		catch (err) {
			logger.error(err)

			await transaction.commit()
		}
	}

	getRandomSpecialItem (raidChannel: RaidChannel): { item: Item, xp: number } {
		if (!raidChannel.scavange) {
			throw new Error(`Raid channel (${raidChannel.name}) cannot be scavenged`)
		}
		else if (!raidChannel.scavange.requiresKey || !raidChannel.scavange.keyIsOptional) {
			throw new Error(`Raid channel (${raidChannel.name}) does not have special loot`)
		}

		return {
			item: raidChannel.scavange.special.items[Math.floor(Math.random() * raidChannel.scavange.special.items.length)],
			xp: raidChannel.scavange.special.xp
		}
	}
}

export default ScavengeCommand
