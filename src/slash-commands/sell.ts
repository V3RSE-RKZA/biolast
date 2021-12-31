import { CommandOptionType, SlashCreator, CommandContext, Message } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { Item } from '../types/Items'
import { ItemRow } from '../types/mysql'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { addItemToShop, getUserBackpack, getUserStash, removeItemFromBackpack, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addMoney, getUserRow } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItemPrice, getItems } from '../utils/itemUtils'
import getRandomInt from '../utils/randomInt'

class SellCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'sell',
			description: 'Sell an item from your inventory or stash to the shop.',
			longDescription: 'Sell an item from your inventory or stash to the shop.',
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
					description: 'ID of another item to sell.',
					required: false
				},
				{
					type: CommandOptionType.INTEGER,
					name: 'item-3',
					description: 'ID of another item to sell.',
					required: false
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const items: number[] = [ctx.options.item, ctx.options['item-2'], ctx.options['item-3']].filter(Boolean)

		if ((new Set(items)).size !== items.length) {
			await ctx.send({
				content: `${icons.danger} You specified the same item multiple times! Are you trying to break me?? >:(`
			})
			return
		}

		const stashRows = await getUserStash(query, ctx.user.id)
		const backpackRows = await getUserBackpack(query, ctx.user.id)
		const userStashData = getItems(stashRows)
		const userBackpackData = getItems(backpackRows)
		const itemsToSell = []
		let price = 0

		for (const i of items) {
			const foundItem = userStashData.items.find(itm => itm.row.id === i) || userBackpackData.items.find(itm => itm.row.id === i)

			// make sure user has item
			if (!foundItem) {
				await ctx.send({
					content: `${icons.warning} You don't have an item with the ID **${i}** in your inventory or stash. You can find the IDs of items in your \`/inventory\` or \`/stash\`.`
				})
				return
			}
			else if (!foundItem.item.sellPrice) {
				/* this will prevent users from being able to get rid of unsellable items.
				await ctx.send({
					content: `${icons.danger} ${getItemDisplay(foundItem.item)} cannot be sold.`
				})
				return
				*/
				itemsToSell.push(foundItem)
				price += 0
			}
			else {
				itemsToSell.push(foundItem)
				price += this.getItemShopPrice(foundItem.item, foundItem.row)
			}
		}

		const botMessage = await ctx.send({
			content: `Sell **${itemsToSell.length}x** items to the \`/shop\` for **${formatMoney(price)}**?\n\n` +
				`${itemsToSell.map(i => itemsToSell.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemShopPrice(i.item, i.row))}**` : getItemDisplay(i.item, i.row)).join('\n')}`,
			components: CONFIRM_BUTTONS
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

			if (confirmed.customID === 'confirmed') {
				// using transaction because users data will be updated
				const transaction = await beginTransaction()
				const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
				const stashRowsV = await getUserStash(transaction.query, ctx.user.id, true)
				const backpackRowsV = await getUserBackpack(transaction.query, ctx.user.id, true)
				const userStashDataV = getItems(stashRowsV)
				const userBackpackDataV = getItems(backpackRowsV)

				for (const i of itemsToSell) {
					const foundItem = userStashDataV.items.find(itm => itm.row.id === i.row.id) || userBackpackDataV.items.find(itm => itm.row.id === i.row.id)

					if (!foundItem) {
						await transaction.commit()

						await confirmed.editParent({
							content: `${icons.warning} You don't have an item with the ID **${i.row.id}** in your inventory or stash. You can find the IDs of items in your \`/inventory\` or \`/stash\`.`,
							components: []
						})
						return
					}
				}

				// verified user has items, continue selling
				for (const i of itemsToSell) {
					const isStashItem = userStashDataV.items.find(itm => itm.row.id === i.row.id)

					if (isStashItem) {
						await removeItemFromStash(transaction.query, i.row.id)
					}
					else {
						await removeItemFromBackpack(transaction.query, i.row.id)
					}

					if (i.item.sellPrice && i.item.type !== 'Collectible') {
						let sellPrice = 0

						if (i.row.durability && i.item.durability) {
							sellPrice += Math.floor((i.row.durability / i.item.durability) * (i.item.sellPrice * this.app.shopSellMultiplier))
						}
						else {
							sellPrice += Math.floor(i.item.sellPrice * this.app.shopSellMultiplier)
						}

						await addItemToShop(transaction.query, i.row.id, getRandomInt(sellPrice * 2, sellPrice * 3))
					}
				}

				await addMoney(transaction.query, ctx.user.id, price)
				await transaction.commit()

				await confirmed.editParent({
					content: `${icons.checkmark} Sold **${itemsToSell.length}x** items to the \`/shop\` for **${formatMoney(price)}**.\n\n${itemsToSell.map(i => `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}\n\n` +
						`${icons.information} You now have **${formatMoney(userDataV.money + price)}**.`,
					components: []
				})
			}
			else {
				await botMessage.delete()
			}
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} Command timed out.`,
				components: []
			})
		}
	}

	getItemShopPrice (item: Item, itemRow: ItemRow): number {
		return Math.floor(getItemPrice(item, itemRow) * this.app.shopSellMultiplier)
	}
}

export default SellCommand
