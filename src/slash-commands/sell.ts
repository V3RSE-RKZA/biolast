import { CommandOptionType, SlashCreator, CommandContext, Message } from 'slash-create'
import App from '../app'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { deleteItem, getUserStash, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addMoney, getUserRow } from '../utils/db/players'
import formatNumber from '../utils/formatNumber'
import { getItemDisplay, getItems } from '../utils/itemUtils'

class SellCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'sell',
			description: 'Sell an item from your stash for rubles.',
			longDescription: 'Sell an item from your stash for rubles.',
			options: [
				{
					type: CommandOptionType.INTEGER,
					name: 'item',
					description: 'ID of item to sell.',
					required: true
				},
				{
					type: CommandOptionType.INTEGER,
					name: 'item-2',
					description: 'ID of item to sell.',
					required: false
				},
				{
					type: CommandOptionType.INTEGER,
					name: 'item-3',
					description: 'ID of item to sell.',
					required: false
				}
			],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const items: number[] = [ctx.options.item, ctx.options['item-2'], ctx.options['item-3']].filter(Boolean)

		if ((new Set(items)).size !== items.length) {
			await ctx.send({
				content: '❌ You specified the same item multiple times! Are you trying to break me?? >:('
			})
			return
		}

		const stashRows = await getUserStash(query, ctx.user.id, true)
		const userStashData = getItems(stashRows)
		const itemsToSell = []
		let price = 0

		for (const i of items) {
			const foundItem = userStashData.items.find(itm => itm.row.id === i)

			// make sure user has item
			if (!foundItem) {
				await ctx.send({
					content: `❌ You don't have an item with the ID **${i}** in your stash. You can find the IDs of items in your \`/stash\`.`
				})
				return
			}
			else if (!foundItem.item.sellPrice) {
				await ctx.send({
					content: `❌ ${getItemDisplay(foundItem.item)} cannot be sold.`
				})
				return
			}

			console.log(price)
			itemsToSell.push(foundItem)
			price += foundItem.item.sellPrice
		}

		const botMessage = await ctx.send({
			content: `Sell **${itemsToSell.length}x** items for **${formatNumber(price)}**?\n\n${itemsToSell.map(i => getItemDisplay(i.item, i.row)).join('\n')}`,
			components: CONFIRM_BUTTONS
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

			if (confirmed.customID === 'confirmed') {
				// using transaction because users data will be updated
				const transaction = await beginTransaction()
				const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
				const stashRowsV = await getUserStash(transaction.query, ctx.user.id, true)
				const userStashDataV = getItems(stashRowsV)

				for (const i of itemsToSell) {
					const foundItem = userStashDataV.items.find(itm => itm.row.id === i.row.id)

					if (!foundItem) {
						await transaction.commit()

						await confirmed.editParent({
							content: `❌ You don't have an item with the ID **${i.row.id}** in your stash. You can find the IDs of items in your \`/stash\`.`,
							components: []
						})
						return
					}
				}

				// verified user has items, continue selling
				for (const i of itemsToSell) {
					await removeItemFromStash(transaction.query, i.row.id)
					await deleteItem(transaction.query, i.row.id)
				}

				await addMoney(transaction.query, ctx.user.id, price)
				await transaction.commit()

				await confirmed.editParent({
					content: `✅ Sold **${itemsToSell.length}x** items for **${formatNumber(price)}**.\n\n${itemsToSell.map(i => `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}\n\n` +
						`You now have **${formatNumber(userDataV.money + price)}** rubles.`,
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

export default SellCommand
