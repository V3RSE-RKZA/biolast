import { CommandOptionType, SlashCreator, CommandContext, Message } from 'slash-create'
import App from '../app'
import { icons, shopBuyMultiplier } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { Item } from '../types/Items'
import { ItemRow } from '../types/mysql'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { addItemToShop, getUserBackpack, getUserStash, removeItemFromBackpack, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addMoney, getUserRow } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItemPrice, getItems, sortItemsByLevel } from '../utils/itemUtils'
import getRandomInt from '../utils/randomInt'

class ShopCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'sellall',
			description: 'Sell everything in your inventory or stash.',
			longDescription: 'Sell everything in your inventory or stash.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'inventory',
					description: 'Sell everything in your inventory.'
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'stash',
					description: 'Sell everything in your stash.'
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
		if (ctx.options.inventory) {
			const backpackRows = await getUserBackpack(query, ctx.user.id)
			const userBackpackData = getItems(backpackRows)
			const itemsToSell = []
			let price = 0

			if (userBackpackData.items.length <= 0) {
				await ctx.send({
					content: `${icons.danger} You don't have any sellable items in your inventory!`
				})
				return
			}

			for (const itm of userBackpackData.items) {
				if (!itm.item.sellPrice) {
					itemsToSell.push(itm)
					price += 0
				}
				else {
					itemsToSell.push(itm)
					price += this.getItemShopPrice(itm.item, itm.row)
				}
			}

			const botMessage = await ctx.send({
				content: `Sell **EVERYTHING IN YOUR INVENTORY** (**${itemsToSell.length}x** items) to the \`/shop\` for **${formatMoney(price)}**?\n\n` +
					`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemShopPrice(i.item, i.row))}**` : getItemDisplay(i.item, i.row)).join('\n')}` +
					`${itemsToSell.length > 5 ? `\n...and **${itemsToSell.length - 5}** other item${itemsToSell.length - 5 > 1 ? 's' : ''}` : ''}`,
				components: CONFIRM_BUTTONS
			}) as Message

			try {
				const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

				if (confirmed.customID === 'confirmed') {
					// using transaction because users data will be updated
					const transaction = await beginTransaction()
					const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
					const backpackRowsV = await getUserBackpack(transaction.query, ctx.user.id, true)
					const userBackpackDataV = getItems(backpackRowsV)

					for (const i of itemsToSell) {
						const foundItem = userBackpackDataV.items.find(itm => itm.row.id === i.row.id)

						if (!foundItem) {
							await transaction.commit()

							await confirmed.editParent({
								content: `${icons.warning} You don't have an item with the ID **${i.row.id}** in your inventory.`,
								components: []
							})
							return
						}
					}

					// verified user has items, continue selling
					for (const i of itemsToSell) {
						await removeItemFromBackpack(transaction.query, i.row.id)

						if (i.item.sellPrice && i.item.type !== 'Collectible') {
							let sellPrice = 0

							if (i.row.durability && i.item.durability) {
								sellPrice += Math.floor((i.row.durability / i.item.durability) * (i.item.sellPrice * this.app.currentShopSellMultiplier))
							}
							else {
								sellPrice += Math.floor(i.item.sellPrice * this.app.currentShopSellMultiplier)
							}

							await addItemToShop(transaction.query, i.row.id, getRandomInt(sellPrice * (shopBuyMultiplier.min / 100), sellPrice * (shopBuyMultiplier.max / 100)))
						}
					}

					await addMoney(transaction.query, ctx.user.id, price)
					await transaction.commit()

					await confirmed.editParent({
						content: `${icons.checkmark} Sold everything in your inventory (**${itemsToSell.length}x** items) to the \`/shop\` for **${formatMoney(price)}**.\n\n` +
							`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `~~${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemShopPrice(i.item, i.row))}**~~` : `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}` +
							`${itemsToSell.length > 5 ? `\n~~...and **${itemsToSell.length - 5}** other item${itemsToSell.length - 5 > 1 ? 's' : ''}~~` : ''}\n\n` +
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
		else if (ctx.options.stash) {
			const stashRows = await getUserStash(query, ctx.user.id)
			const userStashData = getItems(stashRows)
			const itemsToSell = []
			let price = 0

			if (userStashData.items.length <= 0) {
				await ctx.send({
					content: `${icons.danger} You don't have any sellable items in your stash!`
				})
				return
			}

			for (const itm of userStashData.items) {
				if (!itm.item.sellPrice) {
					itemsToSell.push(itm)
					price += 0
				}
				else {
					itemsToSell.push(itm)
					price += this.getItemShopPrice(itm.item, itm.row)
				}
			}

			const botMessage = await ctx.send({
				content: `Sell **EVERYTHING IN YOUR STASH** (**${itemsToSell.length}x** items) to the \`/shop\` for **${formatMoney(price)}**?\n\n` +
					`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemShopPrice(i.item, i.row))}**` : getItemDisplay(i.item, i.row)).join('\n')}` +
					`${itemsToSell.length > 5 ? `\n~~...and **${itemsToSell.length - 5}** other item${itemsToSell.length - 5 > 1 ? 's' : ''}~~` : ''}`,
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
								content: `${icons.warning} You don't have an item with the ID **${i.row.id}** in your stash.`,
								components: []
							})
							return
						}
					}

					// verified user has items, continue selling
					for (const i of itemsToSell) {
						await removeItemFromStash(transaction.query, i.row.id)

						if (i.item.sellPrice && i.item.type !== 'Collectible') {
							let sellPrice = 0

							if (i.row.durability && i.item.durability) {
								sellPrice += Math.floor((i.row.durability / i.item.durability) * (i.item.sellPrice * this.app.currentShopSellMultiplier))
							}
							else {
								sellPrice += Math.floor(i.item.sellPrice * this.app.currentShopSellMultiplier)
							}

							await addItemToShop(transaction.query, i.row.id, getRandomInt(sellPrice * (shopBuyMultiplier.min / 100), sellPrice * (shopBuyMultiplier.max / 100)))
						}
					}

					await addMoney(transaction.query, ctx.user.id, price)
					await transaction.commit()

					await confirmed.editParent({
						content: `${icons.checkmark} Sold everything in your stash (**${itemsToSell.length}x** items) to the \`/shop\` for **${formatMoney(price)}**.\n\n` +
							`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `~~${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemShopPrice(i.item, i.row))}**~~` : `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}` +
							`${itemsToSell.length > 5 ? `\n...and **${itemsToSell.length - 5}** other item${itemsToSell.length - 5 > 1 ? 's' : ''}` : ''}\n\n` +
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
	}

	getItemShopPrice (item: Item, itemRow: ItemRow): number {
		return Math.floor(getItemPrice(item, itemRow) * this.app.currentShopSellMultiplier)
	}
}

export default ShopCommand
