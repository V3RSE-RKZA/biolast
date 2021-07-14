import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { beginTransaction, query } from '../utils/db/mysql'
import { getNumber } from '../utils/argParsers'
import { getUserStash, removeItemFromStash, deleteItem } from '../utils/db/items'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { addMoney, getUserRow } from '../utils/db/players'
import formatNumber from '../utils/formatNumber'
import { CONFIRM_BUTTONS } from '../utils/constants'

export const command: Command = {
	name: 'sell',
	aliases: [],
	examples: ['sell 12345'],
	description: 'Sell an item from your stash for rubles.',
	category: 'items',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: false,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const itemID = getNumber(args[0])

		if (!itemID) {
			await reply(message, {
				content: `❌ You need to provide the ID of the item you want to sell. You can find the IDs of items in your \`${prefix}stash\`.`
			})
			return
		}

		const stashRows = await getUserStash(query, message.author.id, true)
		const userStashData = getItems(stashRows)
		const itemToSell = userStashData.items.find(itm => itm.row.id === itemID)

		if (!itemToSell) {
			await reply(message, {
				content: `❌ You don't have an item with that ID in your stash. You can find the IDs of items in your \`${prefix}stash\`.`
			})
			return
		}
		else if (!itemToSell.item.sellPrice) {
			await reply(message, {
				content: `❌ ${getItemDisplay(itemToSell.item)} cannot be sold.`
			})
			return
		}

		const botMessage = await reply(message, {
			content: `Sell ${getItemDisplay(itemToSell.item, itemToSell.row)} for **${formatNumber(itemToSell.item.sellPrice)}**?`,
			components: CONFIRM_BUTTONS
		})

		try {
			const confirmed = (await app.btnCollector.awaitClicks(botMessage.id, i => i.user.id === message.author.id))[0]

			if (confirmed.customID === 'confirmed') {
				// using transaction because users data will be updated
				const transaction = await beginTransaction()
				const userDataV = (await getUserRow(transaction.query, message.author.id, true))!
				const stashRowsV = await getUserStash(transaction.query, message.author.id, true)
				const userStashDataV = getItems(stashRowsV)
				const itemToSellV = userStashDataV.items.find(itm => itm.row.id === itemID)

				if (!itemToSellV) {
					await transaction.commit()

					await confirmed.editParent({
						content: `❌ You don't have an item with that ID in your stash. You can find the IDs of items in your \`${prefix}stash\`.`,
						components: []
					})
					return
				}

				await removeItemFromStash(transaction.query, itemToSell.row.id)
				await deleteItem(transaction.query, itemToSell.row.id)
				await addMoney(transaction.query, message.author.id, itemToSell.item.sellPrice)
				await transaction.commit()

				await confirmed.editParent({
					content: `Sold ${getItemDisplay(itemToSell.item, itemToSell.row)} for **${formatNumber(itemToSell.item.sellPrice)}**.\n\n` +
						`You now have **${formatNumber(userDataV.money + itemToSell.item.sellPrice)}** rubles.`,
					components: []
				})
			}
			else {
				await botMessage.delete()
			}
		}
		catch (err) {
			await botMessage.edit({
				content: '❌ Command timed out.',
				components: []
			})
		}
	}
}
