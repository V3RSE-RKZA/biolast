import { SlashCreator, CommandContext, ComponentActionRow, ComponentType, Message } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Armor, Backpack, Helmet, Item } from '../types/Items'
import { ItemRow, ItemWithRow } from '../types/mysql'
import { NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { equipItem, getUserBackpack, unequipItem } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { getBackpackLimit, getEquips, getItemDisplay, getItemNameDisplay, getItems, sortItemsByName } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { disableAllComponents } from '../utils/messageUtils'
import { getBodyPartEmoji } from '../utils/stringUtils'

const ITEMS_PER_PAGE = 12

class EquipCommand extends CustomSlashCommand<'equip'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'equip',
			description: 'Equip an item from your inventory such as a backpack, weapon, or armor.',
			longDescription: 'Equip an item from your inventory. Equipping a backpack will increase the amount your inventory can hold. Equipping a helmet or armor will protect you from damage.',
			category: 'equipment',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const preBackpackRows = await getUserBackpack(query, ctx.user.id)
		const preBackpackData = getItems(preBackpackRows)
		const availableEquips = preBackpackData.items.filter(i => ['Helmet', 'Body Armor', 'Backpack'].includes(i.item.type) && !i.row.equipped) as ItemWithRow<ItemRow, Helmet | Armor | Backpack>[]
		const pages = this.generateItemPages(availableEquips)

		if (!availableEquips.length || !pages[0].items.length) {
			await ctx.send({
				content: 'You have no items in your inventory that you can equip right now.' +
					'\n\nYou can equip helmets, armors, and backpacks.'
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
					placeholder: 'Select an item to equip:',
					options: pages[page].items.map(i => {
						const iconID = i.item.icon.match(/:([0-9]*)>/)
						let description

						if (i.item.type === 'Backpack') {
							description = `Increases space by ${i.item.slots}.`
						}
						else if (i.item.type === 'Body Armor') {
							description = `Level ${i.item.level} body armor.`
						}
						else if (i.item.type === 'Helmet') {
							description = `Level ${i.item.level} helmet.`
						}

						return {
							label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
							value: i.row.id.toString(),
							description: `${description}${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
			content: 'Select the item from your **inventory** you wish to equip.',
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
								placeholder: 'Select an item to equip:',
								options: pages[page].items.map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)
									let description

									if (i.item.type === 'Backpack') {
										description = `Increases space by ${i.item.slots}.`
									}
									else if (i.item.type === 'Body Armor') {
										description = `Level ${i.item.level} body armor.`
									}
									else if (i.item.type === 'Helmet') {
										description = `Level ${i.item.level} helmet.`
									}

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
										value: i.row.id.toString(),
										description: `${description}${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
								placeholder: 'Select an item to equip:',
								options: pages[page].items.map(i => {
									const iconID = i.item.icon.match(/:([0-9]*)>/)
									let description

									if (i.item.type === 'Backpack') {
										description = `Increases space by ${i.item.slots}.`
									}
									else if (i.item.type === 'Body Armor') {
										description = `Level ${i.item.level} body armor.`
									}
									else if (i.item.type === 'Helmet') {
										description = `Level ${i.item.level} helmet.`
									}

									return {
										label: `[${i.row.id}] ${getItemNameDisplay(i.item, i.row)}`,
										value: i.row.id.toString(),
										description: `${description}${i.row.durability ? ` ${i.row.durability} uses left. ` : ''}`,
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
					const transaction = await beginTransaction()
					const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
					const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
					const userBackpackData = getItems(backpackRows)
					const itemToEquip = userBackpackData.items.find(itm => itm.row.id.toString() === c.values[0])

					if (!itemToEquip) {
						await transaction.commit()

						await c.send({
							content: `${icons.warning} You don't have an item with the ID **${c.values[0]}** in your inventory.`,
							ephemeral: true
						})
						return
					}
					else if (!['Helmet', 'Body Armor', 'Backpack'].includes(itemToEquip.item.type)) {
						await transaction.commit()

						await c.send({
							content: `${icons.warning} Unequippable item. You cannot equip items of type **${itemToEquip.item.type}**. Specify a helmet, armor, or backpack to equip.`,
							ephemeral: true
						})
						return
					}

					stopCollector()

					if (userDataV.fighting) {
						await transaction.commit()

						await c.editParent({
							content: `${icons.danger} You cannot equip items while in a fight!`,
							embeds: [],
							components: []
						})
						return
					}

					const equips = getEquips(backpackRows)
					let unequippedItem
					let equipDetails

					if (
						equips.armor?.row.id === itemToEquip.row.id ||
						equips.helmet?.row.id === itemToEquip.row.id ||
						equips.backpack?.row.id === itemToEquip.row.id
					) {
						await transaction.commit()

						await c.editParent({
							content: `${icons.warning} You have already equipped your ${getItemDisplay(itemToEquip.item, itemToEquip.row, { showDurability: false, showEquipped: false })}.`,
							embeds: [],
							components: []
						})
						return
					}

					if (itemToEquip.item.type === 'Backpack') {
						if (equips.backpack) {
							unequippedItem = equips.backpack
							await unequipItem(transaction.query, equips.backpack.row.id)
						}

						equipDetails = `You now have **${userBackpackData.slotsUsed.toFixed(1)} / ${getBackpackLimit(itemToEquip.item).toFixed(1)}** space in your inventory.`
					}
					else if (itemToEquip.item.type === 'Helmet') {
						if (equips.helmet) {
							unequippedItem = equips.helmet
							await unequipItem(transaction.query, equips.helmet.row.id)
						}

						equipDetails = `Your **${getBodyPartEmoji('head')} head** is now protected from weapons with an armor penetration below **${itemToEquip.item.level.toFixed(2)}**.`
					}
					else if (itemToEquip.item.type === 'Body Armor') {
						if (equips.armor) {
							unequippedItem = equips.armor
							await unequipItem(transaction.query, equips.armor.row.id)
						}

						equipDetails = `Your **${getBodyPartEmoji('chest')} chest** is now protected from weapons with an armor penetration below **${itemToEquip.item.level.toFixed(2)}**.`
					}

					await equipItem(transaction.query, itemToEquip.row.id)
					await transaction.commit()

					await c.editParent({
						content: unequippedItem ?
							`${icons.checkmark} Unequipped ${getItemDisplay(unequippedItem.item, unequippedItem.row, { showEquipped: false })} and equipped ${getItemDisplay(itemToEquip.item, itemToEquip.row)}.${equipDetails ? `\n\n${equipDetails}` : ''}` :
							`${icons.checkmark} Equipped ${getItemDisplay(itemToEquip.item, itemToEquip.row)}.${equipDetails ? `\n\n${equipDetails}` : ''}`,
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

export default EquipCommand
