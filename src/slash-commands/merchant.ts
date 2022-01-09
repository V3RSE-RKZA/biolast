import { CommandOptionType, SlashCreator, CommandContext, Message, AutocompleteContext, ComponentType, ComponentActionRow } from 'slash-create'
import App from '../app'
import { icons, shopDailyBuyLimit } from '../config'
import { allItems, items } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Collectible, Item } from '../types/Items'
import { ItemRow, ItemWithRow, ShopItemRow, UserRow } from '../types/mysql'
import { getItem } from '../utils/argParsers'
import { CONFIRM_BUTTONS, NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { addItemToBackpack, addItemToStash, createItem, deleteItem, getAllShopItems, getShopItem, getUserBackpack, getUserStash, removeItemFromShop, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow, increaseShopSales, removeMoney } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { backpackHasSpace, getItemDisplay, getItemPrice, getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { disableAllComponents } from '../utils/messageUtils'
import { Location } from '../types/Locations'

interface MoneyTrade {
	type: 'money'
	offer: {
		item: Item
		amount: number
	}
	price: number
}
interface CollectibleTrade {
	type: 'collectible'
	offer: {
		item: Item
		amount: number
	}
	price: Collectible
}
interface OtherMoneyTrade {
	type: 'other-money'
	offer: string
	price: number
}
interface OtherCollectibleTrade {
	type: 'other-collectible'
	offer: string
	price: Collectible
}

type Trade = (MoneyTrade | CollectibleTrade | OtherMoneyTrade | OtherCollectibleTrade) & { locationLevel: number }

const allTrades: Trade[] = [
	{
		type: 'money',
		offer: {
			item: items['glock-17'],
			amount: 1
		},
		price: 1500,
		locationLevel: 1
	},
	{
		type: 'money',
		offer: {
			item: items['9mm_FMJ_bullet'],
			amount: 2
		},
		price: 2000,
		locationLevel: 1
	},
	{
		type: 'collectible',
		offer: {
			item: items['.22LR_bullet'],
			amount: 1
		},
		price: items.farming_guide,
		locationLevel: 2
	},
	{
		type: 'collectible',
		offer: {
			item: items['.303_FMJ_bullet'],
			amount: 1
		},
		price: items.farming_guide,
		locationLevel: 2
	}
]

const DEALS_PER_PAGE = 2

class MerchantCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'merchant',
			description: 'Visit the merchant. The merchant sells different stuff depending on the regions you\'ve unlocked.',
			longDescription: 'Visit the merchant. The merchant sells different stuff depending on the regions you\'ve unlocked.' +
				'\n\nThe higher level region you unlock, the better deals the merchant will offer you.',
			options: [],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const preUserData = (await getUserRow(query, ctx.user.id))!
		const pages = this.generatePages(preUserData)
		const preComponents: ComponentActionRow[] = []
		let page = 0

		if (pages[0].deals.length) {
			preComponents.push({
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.SELECT,
						custom_id: 'buy',
						placeholder: 'Select trade:',
						options: pages[0].deals.map((d, i) => {
							const iconID = (d.type === 'collectible' || d.type === 'money') && d.offer.item.icon.match(/:([0-9]*)>/)
							const label = (d.type === 'collectible' || d.type === 'money') ?
								`${d.offer.amount}x ${d.offer.item.name.replace(/_/g, ' ')}` :
								d.offer
							const price = (d.type === 'collectible' || d.type === 'other-collectible') ?
								`Costs 1x ${d.price.name.replace(/_/g, ' ')}` :
								`Costs ${formatMoney(d.price, false)}`

							return {
								label: `I'd like to purchase ${label}`,
								description: price,
								value: i.toString(),
								emoji: iconID ? {
									id: iconID[1],
									name: 'offer'
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

		const botMessage = await ctx.send({
			embeds: [pages[0].page.embed],
			components: preComponents
		}) as Message
		const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 60000)

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
								placeholder: 'Select trade:',
								options: pages[page].deals.map((d, i) => {
									const iconID = (d.type === 'collectible' || d.type === 'money') && d.offer.item.icon.match(/:([0-9]*)>/)
									const label = (d.type === 'collectible' || d.type === 'money') ?
										`${d.offer.amount}x ${d.offer.item.name.replace(/_/g, ' ')}` :
										d.offer
									const price = (d.type === 'collectible' || d.type === 'other-collectible') ?
										`Costs 1x ${d.price.name.replace(/_/g, ' ')}` :
										`Costs ${formatMoney(d.price, false)}`

									return {
										label,
										description: price,
										value: i.toString(),
										emoji: iconID ? {
											id: iconID[1],
											name: 'offer'
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
						embeds: [pages[page].page.embed],
						components: newComponents
					})
				}
				else if (c.customID === 'next' && page !== (pages.length - 1)) {
					page++

					if (pages[page].deals.length) {
						newComponents.push({
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.SELECT,
									custom_id: 'buy',
									placeholder: 'Select trade:',
									options: pages[page].deals.map((d, i) => {
										const iconID = (d.type === 'collectible' || d.type === 'money') && d.offer.item.icon.match(/:([0-9]*)>/)
										const label = (d.type === 'collectible' || d.type === 'money') ?
											`${d.offer.amount}x ${d.offer.item.name.replace(/_/g, ' ')}` :
											d.offer
										const price = (d.type === 'collectible' || d.type === 'other-collectible') ?
											`Costs 1x ${d.price.name.replace(/_/g, ' ')}` :
											`Costs ${formatMoney(d.price, false)}`

										return {
											label,
											description: price,
											value: i.toString(),
											emoji: iconID ? {
												id: iconID[1],
												name: 'offer'
											} : undefined
										}
									})
								}
							]
						})
					}

					newComponents.push({
						type: ComponentType.ACTION_ROW,
						components: [
							PREVIOUS_BUTTON(false),
							NEXT_BUTTON(page === (pages.length - 1))
						]
					})

					await c.editParent({
						embeds: [pages[page].page.embed],
						components: newComponents
					})
				}
				else if (c.customID === 'buy') {
					const deal = pages[page].deals[parseInt(c.values[0])]
					let foundItem

					if (!deal) {
						throw new Error('No deal selected')
					}

					if (deal.type === 'money' || deal.type === 'other-money') {
						const userData = (await getUserRow(query, ctx.user.id))!

						if (userData.money < deal.price) {
							await c.send({
								content: `${icons.warning} You need **${formatMoney(deal.price)}** to complete that trade. You only have **${formatMoney(userData.money)}**.`,
								ephemeral: true
							})
							return
						}

						if (deal.type === 'money') {
							const backpackRows = await getUserBackpack(query, ctx.user.id)
							const slotsNeeded = deal.offer.item.slotsUsed * deal.offer.amount

							if (!backpackHasSpace(backpackRows, slotsNeeded)) {
								await c.send({
									content: `${icons.danger} You don't have enough space in your inventory. You need **${slotsNeeded}** open slots in your inventory to complete that trade.` +
										'\n\nSell items to clear up some space.',
									ephemeral: true
								})
								return
							}
						}
					}
					else {
						const stashRows = await getUserStash(query, ctx.user.id)
						const backpackRows = await getUserBackpack(query, ctx.user.id)
						const userStashData = getItems(stashRows)
						const userBackpackData = getItems(backpackRows)
						foundItem = userBackpackData.items.find(itm => itm.item.name === deal.price.name) || userStashData.items.find(itm => itm.item.name === deal.price.name)

						if (!foundItem) {
							await c.send({
								content: `${icons.warning} You need **1x** ${getItemDisplay(deal.price)} in your inventory or stash to complete that trade.`,
								ephemeral: true
							})
							return
						}
						else if (deal.type === 'collectible') {
							const slotsNeeded = (deal.offer.item.slotsUsed * deal.offer.amount) - foundItem.item.slotsUsed

							if (!backpackHasSpace(backpackRows, slotsNeeded)) {
								await c.send({
									content: `${icons.danger} You don't have enough space in your inventory. You need **${slotsNeeded}** open slots in your inventory to complete that trade.` +
										'\n\nSell items to clear up some space.',
									ephemeral: true
								})
								return
							}
						}
					}

					const offer = (deal.type === 'collectible' || deal.type === 'money') ?
						`${deal.offer.amount}x ${getItemDisplay(deal.offer.item)}` :
						deal.offer
					const price = (deal.type === 'collectible' || deal.type === 'other-collectible') ?
						foundItem ? `${getItemDisplay(foundItem.item, foundItem.row)}` : `**1x** ${getItemDisplay(deal.price)}` :
						`**${formatMoney(deal.price)}** copper`
					const buyMessage = await c.send({
						content: `Give ${price} to the merchant in return for **${offer}**?`,
						components: CONFIRM_BUTTONS
					}) as Message

					try {
						const confirmed = (await this.app.componentCollector.awaitClicks(buyMessage.id, i => i.user.id === ctx.user.id))[0]

						if (confirmed.customID === 'confirmed') {
							// using transaction because users data will be updated
							const transaction = await beginTransaction()
							const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
							const stashRows = await getUserStash(transaction.query, ctx.user.id, true)
							const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
							const userStashData = getItems(stashRows)
							const userBackpackData = getItems(backpackRows)

							if (deal.type === 'money' || deal.type === 'other-money') {
								if (userData.money < deal.price) {
									await transaction.commit()

									await confirmed.editParent({
										content: `${icons.warning} You need **${formatMoney(deal.price)}** to complete this trade. You only have **${formatMoney(userData.money)}**.`,
										components: disableAllComponents(CONFIRM_BUTTONS)
									})
									return
								}

								if (deal.type === 'money') {
									const slotsNeeded = deal.offer.item.slotsUsed * deal.offer.amount

									if (!backpackHasSpace(backpackRows, slotsNeeded)) {
										await transaction.commit()

										await confirmed.editParent({
											content: `${icons.danger} You don't have enough space in your inventory. You need **${slotsNeeded}** open slots in your inventory.` +
												'\n\nSell items to clear up some space.',
											components: disableAllComponents(CONFIRM_BUTTONS)
										})
										return
									}
								}

								await removeMoney(transaction.query, ctx.user.id, deal.price)
							}
							else {
								const tradedItem = foundItem as ItemWithRow<ItemRow>
								const hasItem = userBackpackData.items.find(itm => itm.row.id === tradedItem.row.id) || userStashData.items.find(itm => itm.row.id === tradedItem.row.id)

								if (!hasItem) {
									await transaction.commit()

									await confirmed.editParent({
										content: `${icons.warning} You need **1x** ${getItemDisplay(deal.price)} in your inventory or stash to complete this trade.`,
										components: disableAllComponents(CONFIRM_BUTTONS)
									})
									return
								}
								else if (deal.type === 'collectible') {
									const slotsNeeded = (deal.offer.item.slotsUsed * deal.offer.amount) - tradedItem.item.slotsUsed

									if (!backpackHasSpace(backpackRows, slotsNeeded)) {
										await transaction.commit()

										await confirmed.editParent({
											content: `${icons.danger} You don't have enough space in your inventory. You need **${slotsNeeded}** open slots in your inventory to complete this trade.` +
												'\n\nSell items to clear up some space.',
											components: disableAllComponents(CONFIRM_BUTTONS)
										})
										return
									}
								}

								await deleteItem(transaction.query, tradedItem.row.id)
							}

							const offersReceived: string[] = []

							if (deal.type === 'collectible' || deal.type === 'money') {
								for (let i = 0; i < deal.offer.amount; i++) {
									const dealItemRow = await createItem(transaction.query, deal.offer.item.name, { durability: deal.offer.item.durability })
									await addItemToBackpack(transaction.query, ctx.user.id, dealItemRow.id)
									offersReceived.push(getItemDisplay(deal.offer.item, dealItemRow))
								}
							}
							else {
								// handle other types of trades here
							}

							await transaction.commit()

							await confirmed.editParent({
								content: `You hand over ${price} in exchange for:\n\n${offersReceived.join('\n')}.` +
								`\n\n${icons.merchant} thanks for the trade! best of luck out there.`,
								components: []
							})
						}
						else {
							await confirmed.editParent({
								content: `${icons.checkmark} Purchase canceled.`,
								components: []
							})
						}
					}
					catch (err) {
						await buyMessage.edit({
							content: `${icons.danger} Purchase timed out.`,
							components: disableAllComponents(buyMessage.components)
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
						embeds: [pages[page].page.embed],
						components: disableAllComponents(botMessage.components)
					})
				}
			}
			catch (err) {
				logger.warn(err)
			}
		})
	}

	getMerchantQuote (userRegionLevel: number): string {
		const possibleQuotes = [
			'would you be interested in my services?',
			'what can I do for ya?',
			'need something?',
			'no refunds!',
			'I get it, my prices are high... are you gonna buy something or what?',
			'I make sure all of my weapons are in tip top shape'
		]

		if (userRegionLevel <= 3) {
			possibleQuotes.push('hmm, you don\'t look very experienced. I guess I cant show you all of my trades.')
		}

		return possibleQuotes[Math.floor(Math.random() * possibleQuotes.length)]
	}

	getTradeDisplay (trade: Trade, locked = false): string {
		if (locked) {
			if (trade.type === 'collectible' || trade.type === 'money') {
				return `**${trade.offer.amount}x** ${getItemDisplay(trade.offer.item)} for *an unknown price*`
			}

			return `**${trade.offer}** for *an unknown price*`
		}
		else if (trade.type === 'collectible') {
			return `**${trade.offer.amount}x** ${getItemDisplay(trade.offer.item)} for a ${getItemDisplay(trade.price)}`
		}
		else if (trade.type === 'money') {
			return `**${trade.offer.amount}x** ${getItemDisplay(trade.offer.item)} for ${formatMoney(trade.price)}`
		}
		else if (trade.type === 'other-collectible') {
			return `**${trade.offer}** for ${getItemDisplay(trade.price)}`
		}

		return `**${trade.offer}** for ${formatMoney(trade.price)}`
	}

	generatePages (userData: UserRow): { page: Embed, deals: Trade[] }[] {
		const sortedTrades = allTrades.sort((a, b) => a.locationLevel - b.locationLevel)
		const pages = []
		const maxPage = Math.ceil((sortedTrades.length) / DEALS_PER_PAGE) || 1

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (DEALS_PER_PAGE * i) - DEALS_PER_PAGE
			const indexLast = DEALS_PER_PAGE * i
			const filtered = sortedTrades.slice(indexFirst, indexLast)
			const availableTrades = filtered.filter(t => t.locationLevel <= userData.locationLevel)
			const lockedTrades = filtered.filter(t => t.locationLevel > userData.locationLevel)
			let description = `${icons.merchant} ${this.getMerchantQuote(userData.locationLevel)}`

			const embed = new Embed()

			if (availableTrades.length) {
				description += `\n\n__**Available Deals**__\n${availableTrades.map(t => this.getTradeDisplay(t)).join('\n')}`
			}

			if (lockedTrades.length) {
				description += `\n\n__**Locked Deals**__\n${lockedTrades.map(t => this.getTradeDisplay(t, true)).join('\n')}`
				embed.setFooter('Unlock more deals by discovering new regions')
			}

			embed.setDescription(description)

			pages.push({ page: embed, deals: availableTrades })
		}

		return pages
	}
}

export default MerchantCommand
