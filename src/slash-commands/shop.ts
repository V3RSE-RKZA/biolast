import { CommandOptionType, SlashCreator, CommandContext, Message, AutocompleteContext } from 'slash-create'
import App from '../app'
import { icons, shopDailyBuyLimit } from '../config'
import { allItems } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Item } from '../types/Items'
import { ItemRow, ShopItemRow } from '../types/mysql'
import { getItem } from '../utils/argParsers'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { addItemToShop, addItemToStash, getAllShopItems, getShopItem, getUserBackpack, getUserStash, removeItemFromBackpack, removeItemFromShop, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addMoney, getUserRow, increaseShopSales, removeMoney } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItems, sortItemsByLevel } from '../utils/itemUtils'
import getRandomInt from '../utils/randomInt'

const ITEMS_PER_PAGE = 15
const itemCorrector = new Corrector([...allItems.map(itm => itm.name.toLowerCase()), ...allItems.map(itm => itm.aliases.map(a => a.toLowerCase())).flat(1)])

class ShopCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'shop',
			description: 'View the item shop.',
			longDescription: 'Used to view the item shop. When you sell an item to the shop, it will appear in the shop for sale! Prices are random.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'sell',
					description: 'Sell an item from your inventory or stash to the shop.',
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
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND_GROUP,
					name: 'sellall',
					description: 'Sell everything in your inventory.',
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
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'buy',
					description: 'Purchase an item from the shop.',
					options: [
						{
							type: CommandOptionType.INTEGER,
							name: 'item',
							description: 'ID of item to purchase.',
							required: true
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-2',
							description: 'ID of another item to purchase.',
							required: false
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-3',
							description: 'ID of another item to purchase.',
							required: false
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'view',
					description: 'View the items for sale in the shop.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'item',
							description: 'Name of item to search for.',
							required: false,
							autocomplete: true
						}
					]
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (ctx.options.sell) {
			const items: number[] = [ctx.options.sell.item, ctx.options.sell['item-2'], ctx.options.sell['item-3']].filter(Boolean)

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
					price += this.getItemPrice(foundItem.item, foundItem.row)
				}
			}

			const botMessage = await ctx.send({
				content: `Sell **${itemsToSell.length}x** items for **${formatMoney(price)}**?\n\n` +
					`${itemsToSell.map(i => itemsToSell.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemPrice(i.item, i.row))}**` : getItemDisplay(i.item, i.row)).join('\n')}`,
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
						content: `${icons.checkmark} Sold **${itemsToSell.length}x** items for **${formatMoney(price)}**.\n\n${itemsToSell.map(i => `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}\n\n` +
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
		else if (ctx.options.buy) {
			const items: number[] = [ctx.options.buy.item, ctx.options.buy['item-2'], ctx.options.buy['item-3']].filter(Boolean)

			if ((new Set(items)).size !== items.length) {
				await ctx.send({
					content: `${icons.danger} You specified the same item multiple times! Are you trying to break me?? >:(`
				})
				return
			}

			const itemID = ctx.options.buy.item as number
			const userData = (await getUserRow(query, ctx.user.id))!
			const stashRows = await getUserStash(query, ctx.user.id)
			const userStashData = getItems(stashRows)
			const itemsToBuy = []
			let price = 0

			if (userData.shopSales >= shopDailyBuyLimit) {
				await ctx.send({
					content: `${icons.danger} You have already purchased **${shopDailyBuyLimit}** items from the shop and cannot purchase any more today. This limit helps prevent a single user from buying every item in the shop. Try again tomorrow!`
				})
				return
			}

			for (const i of items) {
				const shopItemRow = await getShopItem(query, i)
				const shopItem = allItems.find(itm => itm.name === shopItemRow?.item)

				if (!shopItemRow || !shopItem) {
					await ctx.send({
						content: `${icons.warning} Could not find an item available in the shop with the ID **${itemID}**. You view the shop with \`/shop view\`.`
					})
					return
				}
				else if (userData.level < shopItem.itemLevel) {
					await ctx.send({
						content: `${icons.warning} You must be at least level **${shopItem.itemLevel}** to purchase ${getItemDisplay(shopItem, shopItemRow, { showDurability: false })}.`
					})
					return
				}

				itemsToBuy.push({ item: shopItem, row: shopItemRow })
				price += shopItemRow.price
			}

			if (userData.money < price) {
				await ctx.send({
					content: `${icons.danger} You don't have enough money. You need **${formatMoney(price)}** but you only have **${formatMoney(userData.money)}**.`
				})
				return
			}
			else if (userData.shopSales + itemsToBuy.length > shopDailyBuyLimit) {
				await ctx.send({
					content: `${icons.danger} You have already purchased **${userData.shopSales}** items from the shop and can only purchase **${shopDailyBuyLimit - userData.shopSales}** more today. This limit helps prevent a single user from buying every item in the shop. Try again tomorrow!`
				})
				return
			}

			const slotsNeeded = itemsToBuy.reduce((prev, curr) => prev + curr.item.slotsUsed, 0)
			if (userStashData.slotsUsed + slotsNeeded > userData.stashSlots) {
				await ctx.send({
					content: `${icons.danger} You don't have enough space in your stash. You need **${slotsNeeded}** open slots in your stash. Sell items to clear up some space.`
				})
				return
			}

			const botMessage = await ctx.send({
				content: `Purchase **${itemsToBuy.length}x** items for **${formatMoney(price)}**?\n\n` +
					`${itemsToBuy.map(i => itemsToBuy.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(i.row.price)}**` : getItemDisplay(i.item, i.row)).join('\n')}`,
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

					for (const i of itemsToBuy) {
						const shopItemRow = await getShopItem(transaction.query, i.row.id, true)

						if (!shopItemRow || i.row.price !== shopItemRow.price) {
							await transaction.commit()

							await ctx.send({
								content: `${icons.warning} Could not find an item available in the shop with the ID **${itemID}**. You view the shop with \`/shop view\`.`
							})
							return
						}
					}

					if (userDataV.money < price) {
						await transaction.commit()

						await ctx.send({
							content: `${icons.danger} You don't have enough money. You need **${formatMoney(price)}** but you only have **${formatMoney(userDataV.money)}**.`
						})
						return
					}
					else if (userDataV.shopSales + itemsToBuy.length > shopDailyBuyLimit) {
						await transaction.commit()

						await ctx.send({
							content: `${icons.danger} You have already purchased **${userDataV.shopSales}** items from the shop and can only purchase **${shopDailyBuyLimit - userDataV.shopSales}** more today. This limit helps prevent a single user from buying every item in the shop. Try again tomorrow!`
						})
						return
					}
					else if (userStashDataV.slotsUsed + slotsNeeded > userDataV.stashSlots) {
						await transaction.commit()

						await ctx.send({
							content: `${icons.danger} You don't have enough space in your stash. You need **${slotsNeeded}** open slots in your stash. Sell items to clear up some space.`
						})
						return
					}

					// verified shop has items, continue buy
					for (const i of itemsToBuy) {
						await removeItemFromShop(transaction.query, i.row.id)
						await addItemToStash(transaction.query, ctx.user.id, i.row.id)
					}

					await increaseShopSales(transaction.query, ctx.user.id, itemsToBuy.length)
					await removeMoney(transaction.query, ctx.user.id, price)
					await transaction.commit()

					await confirmed.editParent({
						content: `${icons.checkmark} Purchased **${itemsToBuy.length}x** items for **${formatMoney(price)}**. You can find purchased items in your stash.\n\n${itemsToBuy.map(i => `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}\n\n` +
							`${icons.information} You now have **${formatMoney(userDataV.money - price)}**.`,
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
		else if (ctx.options.sellall && ctx.options.sellall.inventory) {
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
					price += this.getItemPrice(itm.item, itm.row)
				}
			}

			const botMessage = await ctx.send({
				content: `Sell **EVERYTHING IN YOUR INVENTORY** (**${itemsToSell.length}x** items) for **${formatMoney(price)}**?\n\n` +
					`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemPrice(i.item, i.row))}**` : getItemDisplay(i.item, i.row)).join('\n')}` +
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
						content: `${icons.checkmark} Sold everything in your inventory (**${itemsToSell.length}x** items) for **${formatMoney(price)}**.\n\n` +
							`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `~~${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemPrice(i.item, i.row))}**~~` : `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}` +
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
		else if (ctx.options.sellall && ctx.options.sellall.stash) {
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
					price += this.getItemPrice(itm.item, itm.row)
				}
			}

			const botMessage = await ctx.send({
				content: `Sell **EVERYTHING IN YOUR STASH** (**${itemsToSell.length}x** items) for **${formatMoney(price)}**?\n\n` +
					`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemPrice(i.item, i.row))}**` : getItemDisplay(i.item, i.row)).join('\n')}` +
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
						content: `${icons.checkmark} Sold everything in your stash (**${itemsToSell.length}x** items) for **${formatMoney(price)}**.\n\n` +
							`${sortItemsByLevel(itemsToSell, true).slice(0, 5).map(i => itemsToSell.length > 1 ? `~~${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemPrice(i.item, i.row))}**~~` : `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}` +
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
		else {
			const searchedItem = getItem([ctx.options.view.item])
			let pages

			if (ctx.options.view.item) {
				// user tried searching for item

				if (!searchedItem) {
					const related = itemCorrector.getWord(ctx.options.view.item, 5)
					const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

					await ctx.send({
						content: relatedItem ? `${icons.information} Could not find an item matching that name. Did you mean ${getItemDisplay(relatedItem)}?` : `${icons.warning} Could not find an item matching that name.`
					})
					return
				}

				const shopItems = await getAllShopItems(query)
				pages = this.generatePages(shopItems.filter(i => i.item === searchedItem.name), searchedItem)
			}
			else {
				const userData = (await getUserRow(query, ctx.user.id))!
				const shopItems = (await getAllShopItems(query)).filter(row => (allItems.find(i => i.name === row.item)?.itemLevel || 1) <= userData.level)
				pages = this.generatePages(shopItems)
			}

			if (pages.length === 1) {
				await ctx.send({
					embeds: [pages[0].embed]
				})
			}
			else {
				await this.app.componentCollector.paginateEmbeds(ctx, pages)
			}
		}
	}

	getItemPrice (item: Item, itemRow: ItemRow): number {
		if (!item.sellPrice) {
			return 0
		}
		else if (item.durability && itemRow.durability) {
			return Math.floor((itemRow.durability / item.durability) * (item.sellPrice * this.app.shopSellMultiplier))
		}

		return Math.floor(item.sellPrice * this.app.shopSellMultiplier)
	}

	generatePages (rows: ShopItemRow[], searchedItem?: Item): Embed[] {
		const itemData = getItems(rows)
		const pages = []
		const maxPage = Math.ceil(itemData.items.length / ITEMS_PER_PAGE) || 1

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = itemData.items.slice(indexFirst, indexLast)

			const embed = new Embed()
				.setDescription(`**${searchedItem ? `Market Results For: ${getItemDisplay(searchedItem)}` : 'Market'}**` +
					`\n\n${icons.information} Use \`/shop buy <item id>\` to purchase an item.\n${icons.warning} These deals will expire after 1 day.` +
					'\n\n__**Items Available**__ (Sorted newest to oldest)' +
					`\n${filteredItems.map(itm => `<t:${itm.row.createdAt.getTime() / 1000}:R> ${getItemDisplay(itm.item, itm.row)} - ${formatMoney(itm.row.price)}`).join('\n') ||
					`There no ${searchedItem ? `${getItemDisplay(searchedItem)}'s` : 'items'} available right now. When a player sells an item, you will see it for sale here.`}`)

			pages.push(embed)
		}

		return pages
	}

	async autocomplete (ctx: AutocompleteContext): Promise<void> {
		const search = ctx.options.view[ctx.focused].replace(/ +/g, '_')
		const items = allItems.filter(itm => itm.name.toLowerCase().includes(search) || itm.type.toLowerCase().includes(search))

		if (items.length) {
			await ctx.sendResults(items.slice(0, 25).map(itm => ({ name: `${itm.type} - ${itm.name.replace(/_/g, ' ')}`, value: itm.name })))
		}
		else {
			const related = itemCorrector.getWord(search, 5)
			const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

			if (relatedItem) {
				await ctx.sendResults([{ name: `${relatedItem.type} - ${relatedItem.name.replace(/_/g, ' ')}`, value: relatedItem.name }])
			}
			else {
				await ctx.sendResults([])
			}
		}
	}
}

export default ShopCommand
