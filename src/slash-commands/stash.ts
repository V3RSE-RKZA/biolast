import { SlashCreator, CommandContext, User, ComponentActionRow, ComponentType, Message, CommandOptionType } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { ItemRow, ItemWithRow, UserRow } from '../types/mysql'
import { addItemToBackpack, getUserBackpack, getUserStash, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { backpackHasSpace, getBackpackLimit, getEquips, getItemDisplay, getItemNameDisplay, getItemPrice, getItems, sortItemsByName } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { GRAY_BUTTON, NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { disableAllComponents } from '../utils/messageUtils'
import SellCommand from './sell'

const ITEMS_PER_PAGE = 12

class StashCommand extends CustomSlashCommand<'stash'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'stash',
			description: 'View the items in your stash (and transfer items to your inventory).',
			longDescription: 'View the items in your stash. Your stash holds much more than your inventory.' +
				' You can put items from your stash into your inventory using the dropdown. Simply select the items you want to transfer to your inventory.' +
				' Use the `/inventory` command to transfer items from your inventory to your stash.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check stash of.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			starterTip: 'The stash is used to keep items safe. You will not lose these items if you die and there is no way for someone to steal these from you.' +
				' Your stash also has a much higher space limit than your inventory, and the limit will increase as you level up!' +
				`\n\n${icons.information} *As a side note, your coins are part of your stash, and will not be lost when you die.*`
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		// view player stash
		const member = ctx.members.get(ctx.options.user)

		if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await ctx.send({
					content: `${icons.warning} **${member.displayName}** does not have an account!`
				})
				return
			}

			const userStash = await getUserStash(query, member.id)
			const pages = this.generatePages(member, userStash, userData, false)

			if (pages.length === 1) {
				await ctx.send({
					embeds: [pages[0].page.embed]
				})
			}
			else {
				await this.app.componentCollector.paginateEmbeds(ctx, pages.map(p => p.page))
			}
			return
		}

		const preUserData = (await getUserRow(query, ctx.user.id))!
		const preUserStash = await getUserStash(query, ctx.user.id)
		const pages = this.generatePages(ctx.member || ctx.user, preUserStash, preUserData, true)
		let components: ComponentActionRow[] = []
		let page = 0

		if (pages[0].items.length && !preUserData.fighting) {
			components.push({
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.SELECT,
						custom_id: 'transfer',
						placeholder: 'Transfer item(s) to your inventory:',
						min_values: 1,
						max_values: pages[0].items.length,
						options: pages[0].items.map(i => {
							const iconID = i.item.icon.match(/:([0-9]*)>/)

							return {
								label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
								value: i.row.id.toString(),
								description: `Uses ${i.item.slotsUsed} slots.${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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

		const fixedPages = pages
		const botMessage = await ctx.send({
			embeds: [pages[0].page.embed],
			components
		}) as Message

		if (components.length) {
			const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 80000)

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
									custom_id: 'transfer',
									placeholder: 'Transfer item(s) to your inventory:',
									min_values: 1,
									max_values: fixedPages[page].items.length,
									options: fixedPages[page].items.map(i => {
										const iconID = i.item.icon.match(/:([0-9]*)>/)

										return {
											label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
											value: i.row.id.toString(),
											description: `Uses ${i.item.slotsUsed} slots.${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
							embeds: [fixedPages[page].page.embed],
							components
						})
					}
					else if (c.customID === 'next' && page !== (fixedPages.length - 1)) {
						page++

						components.push({
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.SELECT,
									custom_id: 'transfer',
									placeholder: 'Transfer item(s) to your inventory:',
									min_values: 1,
									max_values: fixedPages[page].items.length,
									options: fixedPages[page].items.map(i => {
										const iconID = i.item.icon.match(/:([0-9]*)>/)

										return {
											label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
											value: i.row.id.toString(),
											description: `Uses ${i.item.slotsUsed} slots.${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
								NEXT_BUTTON(page === (fixedPages.length - 1))
							]
						})

						await c.editParent({
							embeds: [fixedPages[page].page.embed],
							components
						})
					}
					else if (c.customID === 'transfer') {
						// using transaction because users data will be updated
						const transaction = await beginTransaction()
						const userData = (await getUserRow(transaction.query, ctx.user.id, true))!

						if (userData.fighting) {
							await transaction.commit()

							await c.send({
								content: `${icons.danger} You cannot transfer items while in a duel!`,
								ephemeral: true
							})
							return
						}

						const items = fixedPages[page].items.filter(i => c.values.includes(i.row.id.toString()))
						const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
						const stashRows = await getUserStash(transaction.query, ctx.user.id, true)
						const userStashData = getItems(stashRows)
						const itemsToWithdraw = []
						let spaceNeeded = 0

						for (const i of items) {
							const foundItem = userStashData.items.find(itm => itm.row.id === i.row.id)

							// make sure user has item
							if (foundItem) {
								itemsToWithdraw.push(foundItem)
								spaceNeeded += foundItem.item.slotsUsed
							}
							else {
								await transaction.commit()

								await c.send({
									content: `${icons.warning} You don't have an item with the ID **${i.row.id}** in your stash. Did you already transfer it to your inventory?`,
									ephemeral: true
								})
								return
							}
						}

						if (!backpackHasSpace(backpackRows, spaceNeeded)) {
							await transaction.commit()

							const userBackpackData = getItems(backpackRows)
							const equips = getEquips(backpackRows)
							const slotsAvailable = Math.max(0, getBackpackLimit(equips.backpack?.item) - userBackpackData.slotsUsed).toFixed(1)

							const sellMessage = await c.send({
								content: `${icons.danger} You don't have enough space in your inventory. You need **${spaceNeeded}** open slots in your inventory but you only have **${slotsAvailable}** slots available.` +
									'\n\nSell items to clear up some space.',
								ephemeral: true,
								components: [{
									type: ComponentType.ACTION_ROW,
									components: [GRAY_BUTTON('Sell Items', 'sell')]
								}]
							}) as Message

							try {
								const confirmed = (await this.app.componentCollector.awaitClicks(sellMessage.id, i => i.user.id === ctx.user.id))[0]

								if (confirmed.customID === 'sell') {
									const sellCommand = new SellCommand(this.app.slashCreator, this.app)

									await sellCommand.run(ctx, false, {
										messageID: sellMessage.id,
										componentCtx: confirmed
									})
								}
							}
							catch (err) {
								// sell button timed out, continue
							}
							return
						}

						for (const i of itemsToWithdraw) {
							await removeItemFromStash(transaction.query, i.row.id)
							await addItemToBackpack(transaction.query, ctx.user.id, i.row.id)
						}

						await transaction.commit()
						stopCollector()

						await c.editParent({
							content: `${icons.checkmark} Moved the following from your stash to your inventory:\n\n${itemsToWithdraw.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}`,
							embeds: [],
							components: []
						})
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

	generatePages (member: ResolvedMember | User, rows: ItemRow[], userData: UserRow, isSelf: boolean): { page: Embed, items: ItemWithRow<ItemRow>[] }[] {
		const userDisplay = 'user' in member ? member.displayName : `${member.username}#${member.discriminator}`
		const itemData = getItems(rows)
		const sortedItems = sortItemsByName(itemData.items, true)
		const pages = []
		const maxPage = Math.ceil(itemData.items.length / ITEMS_PER_PAGE) || 1
		const stashValue = itemData.items.reduce((prev, curr) => prev + Math.floor(getItemPrice(curr.item, curr.row) * this.app.currentShopSellMultiplier), 0)

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = sortedItems.slice(indexFirst, indexLast)

			const embed = new Embed()
				.setAuthor(`${userDisplay}'s Stash`, member.avatarURL)
				.setDescription(`\n**Number of Items**: ${itemData.items.length}` +
					`\n**Stash Value**: ${formatMoney(stashValue)}`)
				.addField('__Balance__', `**${formatMoney(userData.money)}** copper`)
				.addField(`__Items in Stash__ (Space: ${itemData.slotsUsed.toFixed(1)} / ${userData.stashSlots.toFixed(1)})`,
					filteredItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || `No items found.\n\n${icons.information} Move items from your inventory to your stash with \`/inventory\`.`)

			if (isSelf) {
				if (maxPage > 1) {
					embed.setFooter(`Page ${i}/${maxPage} · Stashed items will not be lost if you die`)
				}
				else {
					embed.setFooter('Stashed items will not be lost if you die')
				}
			}

			pages.push({ page: embed, items: filteredItems })
		}

		return pages
	}
}

export default StashCommand
