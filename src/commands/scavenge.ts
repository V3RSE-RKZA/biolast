import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { addItemToBackpack, createItem, deleteItem, dropItemToGround, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { getRaidType, getRandomItem } from '../utils/raidUtils'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'
import { getBackpackLimit, getEquips, getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'

export const command: Command = {
	name: 'scavenge',
	aliases: ['loot'],
	examples: [],
	description: 'Use this command in a channel to search for loot.',
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
			const backpackData = getItems(backpackRows)
			const userEquips = getEquips(backpackRows)
			const keyRequired = raidChannel.scavange.requiresKey
			const hasRequiredKey = sortItemsByDurability(backpackData.items, true).find(i => i.item.name === keyRequired?.name)
			const scavengeCD = await getCooldown(transaction.query, message.author.id, 'scavenge')
			const channelCD = await getCooldown(transaction.query, message.channel.id, 'looted')
			const backpackLimit = getBackpackLimit(userEquips.backpack?.item)

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

			// validations passed, add cooldowns
			await createCooldown(transaction.query, message.author.id, 'scavenge', 60)
			await createCooldown(transaction.query, message.channel.id, 'looted', raidChannel.scavange.cooldown)

			const scavengedLoot = []
			const itemsAddedToBackpack = []
			const itemsAddedToGround = []

			for (let i = 0; i < raidChannel.scavange.rolls; i++) {
				const randomItem = getRandomItem(raidChannel)

				if (randomItem) {
					const itemRow = await createItem(transaction.query, randomItem.name, randomItem.durability)

					scavengedLoot.push({
						item: randomItem,
						row: itemRow
					})

					// check if users backpack has space for the item, otherwise throw it on ground
					if (backpackData.slotsUsed + scavengedLoot.reduce((prev, curr) => prev + curr.item.slotsUsed, 0) <= backpackLimit) {
						itemsAddedToBackpack.push({
							item: randomItem,
							row: itemRow
						})

						await addItemToBackpack(transaction.query, message.author.id, itemRow.id)
					}
					else {
						itemsAddedToGround.push({
							item: randomItem,
							row: itemRow
						})

						await dropItemToGround(transaction.query, message.channel.id, itemRow.id)
					}
				}
			}

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

			const finalMessage = `You ${hasRequiredKey ? `use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` : ''}scavenge **${raidChannel.display}** and find:\n\n${scavengedLoot.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || '**nothing**!'}`

			if (!scavengedLoot.length || (!itemsAddedToBackpack.length && !itemsAddedToGround.length)) {
				await reply(message, {
					content: finalMessage
				})
			}
			else if (itemsAddedToBackpack.length && itemsAddedToGround.length) {
				// items were added to both backpack and ground
				await reply(message, {
					content: `${finalMessage}\n\n` +
						`These items were added to your **backpack**: ${itemsAddedToBackpack.map(itm => getItemDisplay(itm.item, itm.row)).join(', ')}\n\n` +
						`Your backpack ran out of space and you were forced to put the following on the **ground**: ${itemsAddedToGround.map(itm => getItemDisplay(itm.item, itm.row)).join(', ')}`
				})
			}
			else if (itemsAddedToBackpack.length && !itemsAddedToGround.length) {
				// all items were added to backpack
				await reply(message, {
					content: `${finalMessage}\n\n` +
						'These items were added to your backpack.'
				})
			}
			else if (itemsAddedToGround.length && !itemsAddedToBackpack.length) {
				// all items were put on ground
				await reply(message, {
					content: `${finalMessage}\n\n` +
						'Your backpack ran out of space and you were forced to leave these items on the **ground**.'
				})
			}
		}
		catch (err) {
			console.error(err)

			await transaction.commit()
		}
	}
}
