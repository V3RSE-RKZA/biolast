import { SlashCreator, CommandContext, Message, ComponentActionRow, ComponentType } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { getUserBackpack, getUserStash, setDurability } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow, removeMoney } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItemNameDisplay, getItemPrice, getItems, sortItemsByName } from '../utils/itemUtils'
import { disableAllComponents } from '../utils/messageUtils'
import { CONFIRM_BUTTONS, NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { Armor, Helmet, Item, MeleeWeapon, RangedWeapon } from '../types/Items'
import { ItemRow, ItemWithRow } from '../types/mysql'
import Embed from '../structures/Embed'
import { logger } from '../utils/logger'

const ITEMS_PER_PAGE = 12

class RepairCommand extends CustomSlashCommand<'repair'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'repair',
			description: 'Repair your weapon or armor to full durability.',
			longDescription: 'Repair armor or a weapon from your inventory to full durability. Useful if your favorite weapon or armor is about to break.' +
				' Repairing an item is not cheap, be prepared to shell out a lot of copper if you want to repair an item that has really low durability.',
			category: 'equipment',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			minimumLocationLevel: 3
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const preStashRows = await getUserStash(query, ctx.user.id)
		const preBackpackRows = await getUserBackpack(query, ctx.user.id)
		const preStashData = getItems(preStashRows)
		const preBackpackData = getItems(preBackpackRows)
		const availableRepairs = [...preStashData.items, ...preBackpackData.items].filter(i =>
			i.item.sellPrice &&
			i.item.durability &&
			['Helmet', 'Body Armor', 'Ranged Weapon', 'Melee Weapon'].includes(i.item.type)
		) as ItemWithRow<ItemRow, Helmet | Armor | RangedWeapon | MeleeWeapon>[]
		const pages = this.generateItemPages(availableRepairs)

		if (!availableRepairs.length || !pages[0].items.length) {
			await ctx.send({
				content: 'You have no items in your inventory or stash that you can repair.' +
					'\n\nYou can repair weapons and armors.'
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
					placeholder: 'Select an item to repair:',
					options: pages[page].items.map(i => {
						const iconID = i.item.icon.match(/:([0-9]*)>/)

						return {
							label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
							value: i.row.id.toString(),
							description: `${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
			content: 'Select the item from your inventory or stash that you want to repair.',
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
								placeholder: 'Select an item to repair:',
								options: pages[page].items.map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
										value: i.row.id.toString(),
										description: `${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
								placeholder: 'Select an item to repair:',
								options: pages[page].items.map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
										value: i.row.id.toString(),
										description: `${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
					const itemToRepair = preStashData.items.find(itm => itm.row.id.toString() === c.values[0]) || preBackpackData.items.find(itm => itm.row.id.toString() === c.values[0])

					if (!itemToRepair) {
						await c.send({
							content: `${icons.warning} You don't have an item with the ID **${c.values[0]}** in your inventory or stash.`,
							ephemeral: true
						})
						return
					}
					else if (
						!itemToRepair.item.durability ||
						!itemToRepair.item.sellPrice ||
						(
							itemToRepair.item.type !== 'Body Armor' &&
							itemToRepair.item.type !== 'Helmet' &&
							itemToRepair.item.type !== 'Ranged Weapon' &&
							itemToRepair.item.type !== 'Melee Weapon'
						)
					) {
						await c.send({
							content: `${icons.danger} Your ${getItemDisplay(itemToRepair.item, itemToRepair.row, { showEquipped: false })} cannot be repaired.`,
							ephemeral: true
						})
						return
					}
					else if ((itemToRepair.row.durability || 1) >= itemToRepair.item.durability) {
						await c.send({
							content: `${icons.danger} Your ${getItemDisplay(itemToRepair.item, itemToRepair.row, { showEquipped: false })} is already at max durability. There is no need to repair it.`,
							ephemeral: true
						})
						return
					}

					stopCollector()

					const costToRepair = (itemToRepair.item.sellPrice - getItemPrice(itemToRepair.item, itemToRepair.row)) * 6

					await c.editParent({
						content: `Repair your ${getItemDisplay(itemToRepair.item, itemToRepair.row, { showEquipped: false })} for **${formatMoney(costToRepair)}**?`,
						embeds: [],
						components: CONFIRM_BUTTONS
					})

					try {
						const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

						if (confirmed.customID !== 'confirmed') {
							await confirmed.editParent({
								content: `${icons.checkmark} Repair canceled.`,
								components: []
							})
							return
						}

						const transaction = await beginTransaction()
						const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
						const stashRowsV = await getUserStash(transaction.query, ctx.user.id, true)
						const backpackRowsV = await getUserBackpack(transaction.query, ctx.user.id, true)
						const userStashDataV = getItems(stashRowsV)
						const userBackpackDataV = getItems(backpackRowsV)
						const foundItem = userStashDataV.items.find(itm => itm.row.id === itemToRepair.row.id) || userBackpackDataV.items.find(itm => itm.row.id === itemToRepair.row.id)

						if (!foundItem) {
							await transaction.commit()

							await confirmed.editParent({
								content: `${icons.warning} You don't have an item with the ID **${itemToRepair.row.id}** in your inventory or stash.`,
								components: []
							})
							return
						}
						if (userDataV.fighting) {
							await transaction.commit()

							await confirmed.editParent({
								content: `${icons.danger} You cannot repair items while in a fight!`,
								embeds: [],
								components: []
							})
							return
						}
						else if (
							!foundItem.item.durability ||
							!foundItem.item.sellPrice ||
							(
								foundItem.item.type !== 'Body Armor' &&
								foundItem.item.type !== 'Helmet' &&
								foundItem.item.type !== 'Ranged Weapon' &&
								foundItem.item.type !== 'Melee Weapon'
							)
						) {
							await transaction.commit()

							await confirmed.editParent({
								content: `${icons.danger} Your ${getItemDisplay(foundItem.item, foundItem.row, { showEquipped: false })} cannot be repaired.`,
								components: []
							})
							return
						}
						else if ((foundItem.row.durability || 1) >= foundItem.item.durability) {
							await transaction.commit()

							await confirmed.editParent({
								content: `${icons.danger} Your ${getItemDisplay(foundItem.item, foundItem.row, { showEquipped: false })} is already at max durability. There is no need to repair it.`,
								components: []
							})
							return
						}
						else if (userDataV.money < costToRepair) {
							await transaction.commit()

							await confirmed.editParent({
								content: `${icons.danger} You don't have enough copper. You need **${formatMoney(costToRepair)}** but you only have **${formatMoney(userDataV.money)}**.`,
								components: []
							})
							return
						}

						await setDurability(transaction.query, foundItem.row.id, foundItem.item.durability)
						await removeMoney(transaction.query, ctx.user.id, costToRepair)
						await transaction.commit()

						await confirmed.editParent({
							content: `${icons.checkmark} Repair completed. Your ${getItemDisplay(foundItem.item, foundItem.row, { showEquipped: false, showDurability: false })} now has **${foundItem.item.durability}** uses left.` +
								`\n\n${icons.information} You now have **${formatMoney(userDataV.money - costToRepair)}**.`,
							components: []
						})
					}
					catch (err) {
						await botMessage.edit({
							content: `${icons.danger} Repair timed out.`,
							components: disableAllComponents(CONFIRM_BUTTONS)
						})
					}
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

export default RepairCommand
