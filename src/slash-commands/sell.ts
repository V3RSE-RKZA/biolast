import { CommandOptionType, SlashCreator, CommandContext, Message, ComponentActionRow, ComponentType, MessageOptions, ComponentContext } from 'slash-create'
import App from '../app'
import { icons, shopBuyMultiplier } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { Item } from '../types/Items'
import { ItemRow, ItemWithRow } from '../types/mysql'
import { CONFIRM_BUTTONS, NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { addItemToShop, getUserBackpack, getUserStash, removeItemFromBackpack, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addMoney, getUserRow } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { getBackpackLimit, getEquips, getItemDisplay, getItemNameDisplay, getItemPrice, getItems, instanceOfBackpackRow, sortItemsByName } from '../utils/itemUtils'
import getRandomInt from '../utils/randomInt'
import { disableAllComponents } from '../utils/messageUtils'
import { logger } from '../utils/logger'
import Embed from '../structures/Embed'

const ITEMS_PER_PAGE = 12

class SellCommand extends CustomSlashCommand<'sell'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'sell',
			description: 'Sell an item from your inventory or stash to the shop.',
			longDescription: 'Sell items from your inventory or stash to the shop.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'inventory',
					description: 'Sell items from your inventory.'
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'stash',
					description: 'Sell items from your stash.'
				}
			],
			category: 'trading',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext, sellFromStash?: boolean, ranFromComponentOptions?: { messageID: string, componentCtx: ComponentContext }): Promise<void> {
		let pages: { page: Embed, items: ItemWithRow<ItemRow>[] }[]

		if (ctx.options.stash || sellFromStash) {
			const userData = (await getUserRow(query, ctx.user.id))!
			const userStash = await getUserStash(query, ctx.user.id)
			pages = this.generatePages(userStash, userData.stashSlots)
		}
		else {
			const userBackpack = await getUserBackpack(query, ctx.user.id)
			const equips = getEquips(userBackpack)
			const space = getBackpackLimit(equips.backpack?.item)
			pages = this.generatePages(userBackpack, space)
		}

		let components: ComponentActionRow[] = []
		let page = 0

		if (pages[0].items.length) {
			components.push({
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.SELECT,
						custom_id: 'sell',
						placeholder: 'Select item(s) to sell:',
						min_values: 1,
						max_values: pages[0].items.length,
						options: pages[0].items.map(i => {
							const iconID = i.item.icon.match(/:([0-9]*)>/)

							return {
								label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
								value: i.row.id.toString(),
								description: `Worth ${formatMoney(this.getItemShopPrice(i.item, i.row), false)}.` +
									`${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}` +
									`${instanceOfBackpackRow(i.row) && i.row.equipped ? ' equipped.' : ''}`,
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
			components.push({
				type: ComponentType.ACTION_ROW,
				components: [
					PREVIOUS_BUTTON(true),
					NEXT_BUTTON(false)
				]
			})
		}

		const sendMessage = (options: MessageOptions): Promise<Message | boolean> => {
			if (ranFromComponentOptions) {
				return ranFromComponentOptions.componentCtx.editParent(options)
			}

			return ctx.editOriginal(options)
		}
		const botMessage = await sendMessage({
			content: `Select the item(s) from your **${ctx.options.stash || sellFromStash ? 'stash' : 'inventory'}** that you wish to sell.`,
			embeds: [pages[0].page.embed],
			components
		}) as Message

		if (components.length) {
			const { collector, stopCollector } = this.app.componentCollector.createCollector(ranFromComponentOptions ? ranFromComponentOptions.messageID : botMessage.id, c => c.user.id === ctx.user.id, 80000)

			collector.on('collect', async c => {
				try {
					await c.acknowledge()

					components = []

					if (c.customID === 'previous' && page !== 0) {
						page--

						components.push({
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.SELECT,
									custom_id: 'sell',
									placeholder: 'Select item(s) to sell:',
									min_values: 1,
									max_values: pages[page].items.length,
									options: pages[page].items.map(i => {
										const iconID = i.item.icon.match(/:([0-9]*)>/)

										return {
											label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
											value: i.row.id.toString(),
											description: `Worth ${formatMoney(this.getItemShopPrice(i.item, i.row), false)}.` +
												`${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}` +
												`${instanceOfBackpackRow(i.row) && i.row.equipped ? ' equipped.' : ''}`,
											emoji: iconID ? {
												id: iconID[1],
												name: i.item.name
											} : undefined
										}
									})
								}
							]
						})

						components.push({
							type: ComponentType.ACTION_ROW,
							components: [
								PREVIOUS_BUTTON(page === 0),
								NEXT_BUTTON(false)
							]
						})

						await c.editParent({
							embeds: [pages[page].page.embed],
							components
						})
					}
					else if (c.customID === 'next' && page !== (pages.length - 1)) {
						page++

						components.push({
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.SELECT,
									custom_id: 'sell',
									placeholder: 'Select item(s) to sell:',
									min_values: 1,
									max_values: pages[page].items.length,
									options: pages[page].items.map(i => {
										const iconID = i.item.icon.match(/:([0-9]*)>/)

										return {
											label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
											value: i.row.id.toString(),
											description: `Worth ${formatMoney(this.getItemShopPrice(i.item, i.row), false)}.` +
												`${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}` +
												`${instanceOfBackpackRow(i.row) && i.row.equipped ? ' equipped.' : ''}`,
											emoji: iconID ? {
												id: iconID[1],
												name: i.item.name
											} : undefined
										}
									})
								}
							]
						})

						components.push({
							type: ComponentType.ACTION_ROW,
							components: [
								PREVIOUS_BUTTON(false),
								NEXT_BUTTON(page === (pages.length - 1))
							]
						})

						await c.editParent({
							embeds: [pages[page].page.embed],
							components
						})
					}
					else if (c.customID === 'sell') {
						const items = pages[page].items.filter(i => c.values.includes(i.row.id.toString()))
						const stashRows = await getUserStash(query, ctx.user.id)
						const backpackRows = await getUserBackpack(query, ctx.user.id)
						const userStashData = getItems(stashRows)
						const userBackpackData = getItems(backpackRows)
						const itemsToSell = []
						let price = 0

						for (const i of items) {
							const foundItem = userStashData.items.find(itm => itm.row.id === i.row.id) || userBackpackData.items.find(itm => itm.row.id === i.row.id)

							// make sure user has item
							if (!foundItem) {
								await c.send({
									content: `${icons.warning} You don't have an item with the ID **${i.row.id}** in your inventory or stash. Did you already sell it?`,
									ephemeral: true
								})
								return
							}
							else if (!foundItem.item.sellPrice) {
								/* this will prevent users from being able to get rid of unsellable items.
								await c.send({
									content: `${icons.danger} ${getItemDisplay(foundItem.item)} cannot be sold.`,
									ephemeral: true
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

						stopCollector()
						const sellMessage = await c.editParent({
							content: `Sell **${itemsToSell.length}x** items to the \`/market\` for **${formatMoney(price)}**?\n\n` +
								`${itemsToSell.map(i => itemsToSell.length > 1 ? `${getItemDisplay(i.item, i.row)} for **${formatMoney(this.getItemShopPrice(i.item, i.row))}**` : getItemDisplay(i.item, i.row)).join('\n')}`,
							components: CONFIRM_BUTTONS,
							embeds: []
						}) as Message

						try {
							const confirmed = (await this.app.componentCollector.awaitClicks(sellMessage.id, i => i.user.id === ctx.user.id))[0]

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
											content: `${icons.warning} You don't have an item with the ID **${i.row.id}** in your inventory or stash. Did you already sell it?`,
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
									content: `${icons.checkmark} Sold **${itemsToSell.length}x** items to the \`/market\` for **${formatMoney(price)}**.\n\n${itemsToSell.map(i => `~~${getItemDisplay(i.item, i.row)}~~`).join('\n')}\n\n` +
										`${icons.information} You now have **${formatMoney(userDataV.money + price)}**.`,
									components: []
								})
							}
							else {
								await confirmed.editParent({
									content: `${icons.checkmark} Sell canceled.`,
									components: []
								})
							}
						}
						catch (err) {
							await sendMessage({
								content: `${icons.danger} Command timed out.`,
								components: disableAllComponents(CONFIRM_BUTTONS)
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
						await sendMessage({
							content: `${icons.warning} Buttons timed out.`,
							embeds: [pages[page].page.embed],
							components: disableAllComponents(components)
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

	generatePages<T extends ItemRow> (rows: T[], invSpace: number): { page: Embed, items: ItemWithRow<T>[] }[] {
		const itemData = getItems(rows)
		const sortedItems = sortItemsByName(itemData.items, true)
		const pages = []
		const maxPage = Math.ceil(sortedItems.length / ITEMS_PER_PAGE) || 1

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = sortedItems.slice(indexFirst, indexLast)

			const embed = new Embed()
				.setTitle(`Space: ${itemData.slotsUsed.toFixed(1)} / ${invSpace.toFixed(1)}`)
				.setDescription(filteredItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || 'No sellable items found.')

			if (maxPage > 1) {
				embed.setFooter(`Page ${i}/${maxPage}`)
			}

			pages.push({ page: embed, items: filteredItems })
		}

		return pages as { page: Embed, items: ItemWithRow<T>[] }[]
	}
}

export default SellCommand
