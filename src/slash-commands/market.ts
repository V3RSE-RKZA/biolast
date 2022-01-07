import { CommandOptionType, SlashCreator, CommandContext, Message, AutocompleteContext, ComponentType, ComponentActionRow } from 'slash-create'
import App from '../app'
import { icons, shopDailyBuyLimit } from '../config'
import { allItems } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Item } from '../types/Items'
import { ItemRow, ItemWithRow, ShopItemRow } from '../types/mysql'
import { getItem } from '../utils/argParsers'
import { CONFIRM_BUTTONS, NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { addItemToStash, getAllShopItems, getShopItem, getUserStash, removeItemFromShop } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow, increaseShopSales, removeMoney } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItemPrice, getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { disableAllComponents } from '../utils/messageUtils'

const ITEMS_PER_PAGE = 5
const itemCorrector = new Corrector([...allItems.map(itm => itm.name.toLowerCase()), ...allItems.map(itm => itm.aliases.map(a => a.toLowerCase())).flat(1)])

class MarketCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'market',
			description: 'View and purchase items from the global item market.',
			longDescription: 'Used to view and purchase items from the global item market. When a player sells an item, it appears in the market for sale! Prices may vary.',
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'item',
					description: 'Name of item to search for.',
					required: false,
					autocomplete: true
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
		const searchedItem = getItem([ctx.options.item])
		let shopItems
		let pages
		let page = 0

		if (ctx.options.item) {
			// user tried searching for item

			if (!searchedItem) {
				const related = itemCorrector.getWord(ctx.options.item, 5)
				const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

				await ctx.send({
					content: relatedItem ? `${icons.information} Could not find an item matching that name. Did you mean ${getItemDisplay(relatedItem)}?` : `${icons.warning} Could not find an item matching that name.`
				})
				return
			}

			shopItems = (await getAllShopItems(query))
				.filter(i => i.item === searchedItem.name)
			pages = this.generatePages(shopItems, searchedItem)
		}
		else {
			const preUserData = (await getUserRow(query, ctx.user.id))!
			shopItems = (await getAllShopItems(query))
				.filter(row => (allItems.find(i => i.name === row.item)?.itemLevel || 1) <= preUserData.level)
			pages = this.generatePages(shopItems)
		}

		const preComponents: ComponentActionRow[] = []

		if (pages[0].items.length) {
			preComponents.push({
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.SELECT,
						custom_id: 'buy',
						placeholder: 'Select items to purchase:',
						min_values: 1,
						max_values: pages[0].items.length,
						options: pages[0].items.map(i => {
							const iconID = i.item.icon.match(/:([0-9]*)>/)

							return {
								label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
								value: i.row.id.toString(),
								description: `Price: ${formatMoney(i.row.price, false)}. Uses ${i.item.slotsUsed} slots.`,
								emoji: iconID ? {
									id: iconID[1],
									name: i.item.name
								} : undefined
							}
						})
					}
				]
			})
		}

		if (pages.length > 1) {
			preComponents.push({
				type: ComponentType.ACTION_ROW,
				components: [
					PREVIOUS_BUTTON(true),
					NEXT_BUTTON(false)
				]
			})
		}

		const fixedPages = pages
		const botMessage = await ctx.send({
			embeds: [pages[0].page.embed],
			components: preComponents
		}) as Message

		if (preComponents.length) {
			const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 80000)

			collector.on('collect', async c => {
				try {
					await c.acknowledge()

					const newComponents: ComponentActionRow[] = []

					if (c.customID === 'previous' && page !== 0) {
						page--

						newComponents.push({
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.SELECT,
									custom_id: 'buy',
									placeholder: 'Select items to purchase:',
									min_values: 1,
									max_values: fixedPages[page].items.length,
									options: fixedPages[page].items.map(i => {
										const iconID = i.item.icon.match(/:([0-9]*)>/)

										return {
											label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
											value: i.row.id.toString(),
											description: `Price: ${formatMoney(i.row.price, false)}. Uses ${i.item.slotsUsed} slots.`,
											emoji: iconID ? {
												id: iconID[1],
												name: i.item.name
											} : undefined
										}
									})
								}
							]
						})
						newComponents.push({
							type: ComponentType.ACTION_ROW,
							components: [
								PREVIOUS_BUTTON(page === 0),
								NEXT_BUTTON(false)
							]
						})

						await c.editParent({
							embeds: [fixedPages[page].page.embed],
							components: newComponents
						})
					}
					else if (c.customID === 'next' && page !== (fixedPages.length - 1)) {
						page++

						newComponents.push({
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.SELECT,
									custom_id: 'buy',
									placeholder: 'Select items to purchase:',
									min_values: 1,
									max_values: fixedPages[page].items.length,
									options: fixedPages[page].items.map(i => {
										const iconID = i.item.icon.match(/:([0-9]*)>/)

										return {
											label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
											value: i.row.id.toString(),
											description: `Price: ${formatMoney(i.row.price, false)}. Uses ${i.item.slotsUsed} slots.`,
											emoji: iconID ? {
												id: iconID[1],
												name: i.item.name
											} : undefined
										}
									})
								}
							]
						})
						newComponents.push({
							type: ComponentType.ACTION_ROW,
							components: [
								PREVIOUS_BUTTON(false),
								NEXT_BUTTON(page === (fixedPages.length - 1))
							]
						})

						await c.editParent({
							embeds: [fixedPages[page].page.embed],
							components: newComponents
						})
					}
					else if (c.customID === 'buy') {
						const items = fixedPages[page].items.filter(i => c.values.includes(i.row.id.toString()))
						const userData = (await getUserRow(query, ctx.user.id))!
						const stashRows = await getUserStash(query, ctx.user.id)
						const userStashData = getItems(stashRows)
						const itemsToBuy = []
						let price = 0

						if (userData.shopSales >= shopDailyBuyLimit) {
							await c.send({
								content: `${icons.danger} You have already purchased **${shopDailyBuyLimit}** items from the market and cannot purchase any more today.` +
									' This limit helps prevent a single user from buying every item in the market. Try again tomorrow!',
								ephemeral: true
							})
							return
						}

						for (const i of items) {
							const shopItemRow = await getShopItem(query, i.row.id)
							const shopItem = allItems.find(itm => itm.name === shopItemRow?.item)

							if (!shopItemRow || !shopItem) {
								await c.send({
									content: `${icons.warning} ${getItemDisplay(i.item, i.row, { showDurability: false })} has already been purchased by someone else! Select a different item to purchase.`,
									ephemeral: true
								})
								return
							}
							else if (userData.level < shopItem.itemLevel) {
								await c.send({
									content: `${icons.warning} You must be at least level **${shopItem.itemLevel}** to purchase ${getItemDisplay(shopItem, shopItemRow, { showDurability: false })}.`,
									ephemeral: true
								})
								return
							}

							itemsToBuy.push({ item: shopItem, row: shopItemRow })
							price += shopItemRow.price
						}

						if (userData.money < price) {
							await c.send({
								content: `${icons.danger} You don't have enough money. You need **${formatMoney(price)}** but you only have **${formatMoney(userData.money)}**.`,
								ephemeral: true
							})
							return
						}
						else if (userData.shopSales + itemsToBuy.length > shopDailyBuyLimit) {
							await c.send({
								content: `${icons.danger} You have already purchased **${userData.shopSales}** items from the market and can only purchase **${shopDailyBuyLimit - userData.shopSales}** more today.` +
									'This limit helps prevent a single user from buying every item in the market. Try again tomorrow!',
								ephemeral: true
							})
							return
						}

						const slotsNeeded = itemsToBuy.reduce((prev, curr) => prev + curr.item.slotsUsed, 0)
						if (userStashData.slotsUsed + slotsNeeded > userData.stashSlots) {
							const slotsAvailable = Math.max(0, userData.stashSlots - userStashData.slotsUsed)

							await c.send({
								content: `${icons.danger} You don't have enough space in your stash. You need **${slotsNeeded}** open slots in your stash but you only have **${slotsAvailable}** slots available.` +
									'\n\nSell items to clear up some space.',
								ephemeral: true
							})
							return
						}

						await c.editParent({
							content: `Purchase **${itemsToBuy.length}x** items for **${formatMoney(price)}**?\n\n` +
								`${itemsToBuy.map(i => itemsToBuy.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(i.row.price)}**` : getItemDisplay(i.item, i.row)).join('\n')}`,
							embeds: [],
							components: CONFIRM_BUTTONS
						}) as Message

						try {
							stopCollector()
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

										await confirmed.editParent({
											content: `${icons.warning} ${getItemDisplay(i.item, i.row, { showDurability: false })} has already been purchased by someone else!`,
											components: []
										})
										return
									}
								}

								if (userDataV.money < price) {
									await transaction.commit()

									await confirmed.editParent({
										content: `${icons.danger} You don't have enough money. You need **${formatMoney(price)}** but you only have **${formatMoney(userDataV.money)}**.`,
										components: []
									})
									return
								}
								else if (userDataV.shopSales + itemsToBuy.length > shopDailyBuyLimit) {
									await transaction.commit()

									await confirmed.editParent({
										content: `${icons.danger} You have already purchased **${userDataV.shopSales}** items from the market and can only purchase **${shopDailyBuyLimit - userDataV.shopSales}** more today.` +
											' This limit helps prevent a single user from buying every item in the market. Try again tomorrow!',
										components: []
									})
									return
								}
								else if (userStashDataV.slotsUsed + slotsNeeded > userDataV.stashSlots) {
									await transaction.commit()

									await confirmed.editParent({
										content: `${icons.danger} You don't have enough space in your stash. You need **${slotsNeeded}** open slots in your stash. Sell items to clear up some space.`,
										components: []
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
								await botMessage.edit({
									content: `${icons.checkmark} Purchase canceled.`,
									components: []
								})
							}
						}
						catch (err) {
							await botMessage.edit({
								content: `${icons.danger} Purchase timed out.`,
								components: disableAllComponents(botMessage.components)
							})
						}
					}
				}
				catch (err) {
					// continue
				}
			})

			collector.on('end', async msg => {
				try {
					if (msg === 'time') {
						await botMessage.edit({
							content: `${icons.warning} Buttons timed out.`,
							embeds: [fixedPages[page].page.embed],
							components: disableAllComponents(botMessage.components)
						})
					}
				}
				catch (err) {
					logger.warn(err)
				}
			})
		}
	}

	getItemShopPrice (item: Item, itemRow: ItemRow): number {
		return Math.floor(getItemPrice(item, itemRow) * this.app.currentShopSellMultiplier)
	}

	generatePages (rows: ShopItemRow[], searchedItem?: Item): { page: Embed, items: ItemWithRow<ShopItemRow>[] }[] {
		const itemData = getItems(rows)
		const pages = []
		const maxPage = Math.ceil(itemData.items.length / ITEMS_PER_PAGE) || 1

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = itemData.items.slice(indexFirst, indexLast)

			const embed = new Embed()
				.setDescription(`**${searchedItem ? `Market Results For: ${getItemDisplay(searchedItem)}` : 'Market'}**` +
					`\n\n${icons.information} Use the selection menu to purchase items.\n${icons.warning} These deals will expire after 1 day.` +
					'\n\n__**Items Available**__ (Sorted newest to oldest)' +
					`\n${filteredItems.map(itm => `**Item**: ${getItemDisplay(itm.item, itm.row)}\n**Listed**: <t:${itm.row.createdAt.getTime() / 1000}:R>\n**Price**: ${formatMoney(itm.row.price)}`).join('\n\n') ||
					`There are no ${searchedItem ? `${getItemDisplay(searchedItem)}'s` : 'items'} available right now. When a player sells an item, you will see it for sale here.`}`)

			if (maxPage > 1) {
				embed.setFooter(`Page ${i}/${maxPage}`)
			}

			pages.push({ page: embed, items: filteredItems })
		}

		return pages
	}

	async autocomplete (ctx: AutocompleteContext): Promise<void> {
		const search = ctx.options[ctx.focused].replace(/ +/g, '_').toLowerCase()
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

export default MarketCommand
