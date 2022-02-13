import { SlashCreator, CommandContext, ComponentActionRow, ComponentType, Message } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { deleteItem, getUserBackpack, getUserStash, lowerItemDurability } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addHealth, getUserRow } from '../utils/db/players'
import { formatHealth } from '../utils/stringUtils'
import { getItemDisplay, getItemNameDisplay, getItems, sortItemsByName } from '../utils/itemUtils'
import { ItemRow, ItemWithRow } from '../types/mysql'
import Embed from '../structures/Embed'
import { Item, Medical } from '../types/Items'
import { NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { items } from '../resources/items'
import { disableAllComponents } from '../utils/messageUtils'
import { logger } from '../utils/logger'

const ITEMS_PER_PAGE = 12

class HealCommand extends CustomSlashCommand<'heal'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'heal',
			description: 'Use a medical item to restore health.',
			longDescription: 'Use a medical item to restore health. Use this to heal when outside of a duel.',
			category: 'equipment',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const preUserData = (await getUserRow(query, ctx.user.id))!

		if (preUserData.health >= preUserData.maxHealth) {
			await ctx.send({
				content: `${icons.danger} You are already at max health!`,
				embeds: [],
				components: []
			})
			return
		}

		const preStashRows = await getUserStash(query, ctx.user.id)
		const preBackpackRows = await getUserBackpack(query, ctx.user.id)
		const preStashData = getItems(preStashRows)
		const preBackpackData = getItems(preBackpackRows)
		const availableMedical = [...preStashData.items, ...preBackpackData.items].filter(i => i.item.type === 'Medical') as ItemWithRow<ItemRow, Medical>[]
		const pages = this.generateItemPages(availableMedical)

		if (!availableMedical.length || !pages[0].items.length) {
			await ctx.send({
				content: 'You have no medical items in your inventory or stash that you can use to heal.' +
					`\n\nYou can purchase a ${getItemDisplay(items.bandage)} from the \`/merchant\` or other healing items from the \`/market\`.`
			})
			return
		}

		let components: ComponentActionRow[] = []
		let page = 0

		components.push({
			type: ComponentType.ACTION_ROW,
			components: [
				{
					type: ComponentType.SELECT,
					custom_id: 'select',
					placeholder: 'Select an item to heal with:',
					options: pages[page].items.map(i => {
						const iconID = i.item.icon.match(/:([0-9]*)>/)

						return {
							label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
							value: i.row.id.toString(),
							description: `Heals for ${i.item.healsFor} HP.${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
							emoji: iconID ? {
								id: iconID[1],
								name: i.item.name
							} : undefined
						}
					})
				}
			]
		})

		if (pages.length > 1) {
			components.push({
				type: ComponentType.ACTION_ROW,
				components: [
					PREVIOUS_BUTTON(true),
					NEXT_BUTTON(false)
				]
			})
		}

		const botMessage = await ctx.send({
			content: 'Select the item from your inventory or stash that you want to heal with.',
			embeds: [pages[page].page.embed],
			components
		}) as Message
		const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 30000)

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
								custom_id: 'select',
								placeholder: 'Select an item to heal with:',
								options: pages[page].items.map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
										value: i.row.id.toString(),
										description: `Heals for ${i.item.healsFor} HP.${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
								custom_id: 'select',
								placeholder: 'Select an item to heal with:',
								options: pages[page].items.map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
										value: i.row.id.toString(),
										description: `Heals for ${i.item.healsFor} HP.${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
				else if (c.customID === 'select') {
					const selected = pages[page].items.find(i => i.row.id.toString() === c.values[0])

					if (!selected) {
						await c.send({
							content: `${icons.warning} You don't have an item with the ID **${c.values[0]}** in your inventory or stash. Did you sell it?`,
							ephemeral: true
						})
						return
					}

					stopCollector()

					let timesToUse = 1

					if (selected.row.durability && selected.row.durability > 1) {
						const timesCanUse = [1, 2, 3, 4].filter(t => t <= selected.row.durability!)
						components = [{
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.SELECT,
									custom_id: 'amount',
									placeholder: 'How many times to use:',
									options: [
										...timesCanUse.map(t => ({
											label: t === 1 ? '1 time' : `${t} times`,
											value: t.toString(),
											description: `Will heal for up to ${t * selected.item.healsFor} HP.`
										})),
										{
											label: 'Use max times',
											value: 'max',
											description: `Use the ${getItemNameDisplay(selected.item)} to heal as much as possible.`
										}
									]
								}
							]
						}]
						await c.editParent({
							content: `How many times do you want to use your ${getItemDisplay(selected.item, selected.row)}?`,
							embeds: [],
							components
						})

						try {
							const selection = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id, 30000))[0]

							if (selection.values[0] === 'max') {
								timesToUse = selected.row.durability || 1
							}
							else {
								const amount = parseInt(selection.values[0]) || 1

								timesToUse = amount
							}
						}
						catch (err) {
							await c.editParent({
								content: `${icons.danger} You did not select how many times to use your ${getItemDisplay(selected.item, selected.row)}.`,
								embeds: [],
								components: disableAllComponents(components)
							})
							return
						}
					}

					// verify and heal player
					const transaction = await beginTransaction()
					const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
					const stashRowsV = await getUserStash(transaction.query, ctx.user.id, true)
					const backpackRowsV = await getUserBackpack(transaction.query, ctx.user.id, true)
					const userStashDataV = getItems(stashRowsV)
					const userBackpackDataV = getItems(backpackRowsV)
					const selectedItem = userStashDataV.items.find(itm => itm.row.id === selected.row.id) || userBackpackDataV.items.find(itm => itm.row.id === selected.row.id)

					if (!selectedItem) {
						await transaction.commit()

						await c.editParent({
							content: `${icons.warning} You don't have an item with the ID **${selected.row.id}** in your inventory or stash.`,
							embeds: [],
							components: []
						})
						return
					}
					else if (selectedItem.item.type !== 'Medical') {
						await transaction.commit()

						await c.editParent({
							content: `${icons.danger} ${getItemDisplay(selectedItem.item, selectedItem.row, { showEquipped: false })} cannot be used to heal.`,
							embeds: [],
							components: []
						})
						return
					}
					else if (timesToUse > (selectedItem.row.durability || 1)) {
						await transaction.commit()

						await c.editParent({
							content: `${icons.danger} Your ${getItemDisplay(selectedItem.item, selectedItem.row, { showEquipped: false, showDurability: false })} can only be used up to **${selectedItem.row.durability || 1}x** more times.`,
							embeds: [],
							components: []
						})
						return
					}
					else if (userDataV.fighting) {
						await transaction.commit()

						await c.editParent({
							content: `${icons.danger} You cannot heal while in a fight!`,
							embeds: [],
							components: []
						})
						return
					}

					timesToUse = Math.min(selectedItem.row.durability || 1, Math.ceil((userDataV.maxHealth - userDataV.health) / selectedItem.item.healsFor), timesToUse)
					const maxHeal = Math.min(userDataV.maxHealth - userDataV.health, selectedItem.item.healsFor * timesToUse)

					if (maxHeal === 0) {
						await transaction.commit()

						await c.editParent({
							content: `${icons.danger} You are already at max health!`,
							embeds: [],
							components: []
						})
						return
					}

					if (!selectedItem.row.durability || selectedItem.row.durability - timesToUse <= 0) {
						await deleteItem(transaction.query, selectedItem.row.id)
					}
					else {
						await lowerItemDurability(transaction.query, selectedItem.row.id, timesToUse)
					}

					await addHealth(transaction.query, ctx.user.id, maxHeal)
					await transaction.commit()

					const usesLeft = selectedItem.row.durability ? selectedItem.row.durability - timesToUse : 0

					await c.editParent({
						content: `${icons.checkmark} You use your ${getItemDisplay(selectedItem.item, selectedItem.row, { showDurability: false })} **${timesToUse}x** times to heal for **${maxHeal}** health!` +
							` You now have ${formatHealth(userDataV.health + maxHeal, userDataV.maxHealth)} **${userDataV.health + maxHeal} / ${userDataV.maxHealth}** health.` +
							`\n\nYour ${getItemDisplay(selectedItem.item)} has **${usesLeft}** uses left.`,
						embeds: [],
						components: []
					})
				}
			}
			catch (err) {
				logger.warn(err)
			}
		})
		collector.on('end', async m => {
			if (m === 'time') {
				try {
					await botMessage.edit({
						content: `${icons.danger} You ran out of time to select an item.`,
						components: disableAllComponents(components)
					})
				}
				catch (err) {
					logger.warn(err)
				}
			}
		})
	}

	/**
	 * @param rows Rows of items
	 * @returns Array of embeds with the items that are displayed on that embed
	 */
	generateItemPages<T extends Item> (itemList: ItemWithRow<ItemRow, T>[]): { page: Embed, items: ItemWithRow<ItemRow, T>[] }[] {
		const sortedItems = sortItemsByName(itemList, true)
		const pages = []
		const maxPage = Math.ceil(sortedItems.length / ITEMS_PER_PAGE) || 1

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = sortedItems.slice(indexFirst, indexLast) as ItemWithRow<ItemRow, T>[]

			const embed = new Embed()
				.setDescription(filteredItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || 'No items found.')

			if (maxPage > 1) {
				embed.setFooter(`Page ${i}/${maxPage}`)
			}

			pages.push({ page: embed, items: filteredItems })
		}

		return pages
	}
}

export default HealCommand
