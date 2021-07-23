import { Command } from '../types/Commands'
import { messageUser, reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { addItemToBackpack, createItem, deleteItem, dropItemToGround, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { getRaidType, getRandomItem } from '../utils/raidUtils'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'
import { getBackpackLimit, getEquips, getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'
import { getNPC } from '../utils/db/npcs'
import { allNPCs } from '../resources/npcs'
import { getUserRow, addXp } from '../utils/db/players'

export const command: Command = {
	name: 'scavenge',
	aliases: ['loot'],
	examples: [],
	description: 'Use this command in a channel to search for loot. Make sure the area is clear of threats, otherwise they might attack you!',
	shortDescription: 'Use this command in a channel to search for loot.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 60,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const raidType = getRaidType(message.channel.guild.id)
		if (!raidType) {
			// raid type not found?? this shouldn't happen so throw error
			throw new Error('Could not find raid type')
		}

		const raidChannel = raidType.channels.find(ch => ch.name === message.channel.name)
		if (!raidChannel) {
			// raid channel not found, was the channel not specified in the location?
			throw new Error('Could not find raid channel')
		}

		const transaction = await beginTransaction()

		try {
			const backpackRows = await getUserBackpack(transaction.query, message.author.id, true)
			const userData = (await getUserRow(transaction.query, message.author.id, true))!
			const backpackData = getItems(backpackRows)
			const userEquips = getEquips(backpackRows)
			const keyRequired = raidChannel.scavange.requiresKey
			const hasRequiredKey = sortItemsByDurability(backpackData.items, true).find(i => i.item.name === keyRequired?.name)
			const scavengeCD = await getCooldown(transaction.query, message.author.id, 'scavenge')
			const channelCD = await getCooldown(transaction.query, message.channel.id, 'looted')
			const backpackLimit = getBackpackLimit(userEquips.backpack?.item)
			const npcRow = await getNPC(transaction.query, message.channel.id, true)
			const npc = allNPCs.find(n => n.id === npcRow?.id)

			if (channelCD) {
				await transaction.commit()

				await reply(message, {
					content: `❌ This channel just got scavenged! Loot will respawn in **${channelCD}**.`
				})
				return
			}
			else if (scavengeCD) {
				await transaction.commit()

				await reply(message, {
					content: `❌ You need to wait **${scavengeCD}** before you can scavenge again.`
				})
				return
			}
			else if (keyRequired && !hasRequiredKey) {
				await transaction.commit()

				await reply(message, {
					content: `❌ You need a ${getItemDisplay(keyRequired)} to scavenge here.`
				})
				return
			}

			// validations passed, add scavenge cooldown
			await createCooldown(transaction.query, message.author.id, 'scavenge', 60)

			if (npc) {
				const attackResult = await app.npcHandler.attackPlayer(transaction.query, message.member, userData, backpackRows, npc, message.channel.id, [])
				await transaction.commit()

				const seenMessage = await reply(message, {
					content: `You try to scavenge **${raidChannel.display}** but there was a threat roaming the area!`
				})

				setTimeout(async () => {
					try {
						await reply(seenMessage, {
							content: attackResult.messages.join('\n')
						})
					}
					catch (err) {
						console.error(err)
					}
				}, 2000)

				if (userData.health - attackResult.damage <= 0) {
					// player died
					try {
						await message.member.kick(`User was killed by NPC while trying to scavenge: ${npc.type} (${npc.display})`)
					}
					catch (err) {
						console.error(err)
					}

					await messageUser(message.author, {
						content: '❌ Raid failed!\n\n' +
							`You were killed by a \`${npc.type}\` who hit you for **${attackResult.damage}** damage. Next time search the area before you scavenge for loot.\n` +
							`You lost all the items in your inventory (**${backpackData.items.length - attackResult.removedItems}** items).`
					})
				}

				return
			}

			// no npc in channel, continue to loot channel
			await createCooldown(transaction.query, message.channel.id, 'looted', raidChannel.scavange.cooldown)

			const scavengedLoot = []
			const itemsAddedToBackpack = []
			const itemsAddedToGround = []
			let xpEarned = 0

			for (let i = 0; i < raidChannel.scavange.rolls; i++) {
				const randomLoot = getRandomItem(raidChannel)

				if (randomLoot) {
					const itemRow = await createItem(transaction.query, randomLoot.item.name, randomLoot.item.durability)

					xpEarned += randomLoot.xp

					scavengedLoot.push({
						item: randomLoot.item,
						row: itemRow
					})

					// check if users backpack has space for the item, otherwise throw it on ground
					if (backpackData.slotsUsed + scavengedLoot.reduce((prev, curr) => prev + curr.item.slotsUsed, 0) <= backpackLimit) {
						itemsAddedToBackpack.push({
							item: randomLoot.item,
							row: itemRow
						})

						await addItemToBackpack(transaction.query, message.author.id, itemRow.id)
					}
					else {
						itemsAddedToGround.push({
							item: randomLoot.item,
							row: itemRow
						})

						await dropItemToGround(transaction.query, message.channel.id, itemRow.id)
					}
				}
			}

			await addXp(transaction.query, message.author.id, xpEarned)

			// lower durability or remove key
			if (hasRequiredKey) {
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
				await reply(message, {
					content: finalMessage
				})
			}
			else if (itemsAddedToBackpack.length && itemsAddedToGround.length) {
				// items were added to both backpack and ground
				await reply(message, {
					content: `${finalMessage}\n\n` +
						`These items were added to your **inventory**: ${itemsAddedToBackpack.map(itm => getItemDisplay(itm.item, itm.row)).join(', ')}\n\n` +
						`Your inventory ran out of space and you were forced to leave the following on the **ground**: ${itemsAddedToGround.map(itm => getItemDisplay(itm.item, itm.row)).join(', ')}`
				})
			}
			else if (itemsAddedToBackpack.length && !itemsAddedToGround.length) {
				// all items were added to backpack
				await reply(message, {
					content: `${finalMessage}\n\n` +
						'These items were added to your inventory.'
				})
			}
			else if (itemsAddedToGround.length && !itemsAddedToBackpack.length) {
				// all items were put on ground
				await reply(message, {
					content: `${finalMessage}\n\n` +
						'Your inventory ran out of space and you were forced to leave these items on the **ground**.'
				})
			}
		}
		catch (err) {
			console.error(err)

			await transaction.commit()
		}
	}
}
