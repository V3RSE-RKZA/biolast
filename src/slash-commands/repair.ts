import { CommandOptionType, SlashCreator, CommandContext, Message } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { getUserBackpack, getUserStash, setDurability } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow, removeMoney } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItemPrice, getItems } from '../utils/itemUtils'
import { disableAllComponents } from '../utils/messageUtils'
import { CONFIRM_BUTTONS } from '../utils/constants'

class RepairCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'repair',
			description: 'Repair your weapon or armor to full durability.',
			longDescription: 'Repair armor or a weapon from your inventory to full durability. Useful if your favorite weapon or armor is about to break.' +
				' Repairing an item is not cheap, be prepared to shell out a lot of copper if you want to repair an item that has really low durability.',
			options: [
				{
					type: CommandOptionType.INTEGER,
					name: 'item',
					description: 'ID of item to repair.',
					required: true
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			minimumLocationLevel: 3
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const itemID = ctx.options.item

		const stashRows = await getUserStash(query, ctx.user.id)
		const backpackRows = await getUserBackpack(query, ctx.user.id)
		const userStashData = getItems(stashRows)
		const userBackpackData = getItems(backpackRows)
		const itemToUse = userStashData.items.find(itm => itm.row.id === itemID) || userBackpackData.items.find(itm => itm.row.id === itemID)

		if (!itemToUse) {
			await ctx.send({
				content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory or stash.`
			})
			return
		}
		else if (
			!itemToUse.item.durability ||
			!itemToUse.item.sellPrice ||
			(
				itemToUse.item.type !== 'Body Armor' &&
				itemToUse.item.type !== 'Helmet' &&
				itemToUse.item.type !== 'Ranged Weapon' &&
				itemToUse.item.type !== 'Melee Weapon'
			)
		) {
			await ctx.send({
				content: `${icons.danger} Your ${getItemDisplay(itemToUse.item, itemToUse.row, { showEquipped: false })} cannot be repaired.`
			})
			return
		}
		else if ((itemToUse.row.durability || 1) >= itemToUse.item.durability) {
			await ctx.send({
				content: `${icons.danger} Your ${getItemDisplay(itemToUse.item, itemToUse.row, { showEquipped: false })} is already at max durability. There is no need to repair it.`
			})
			return
		}

		const costToRepair = (itemToUse.item.sellPrice - getItemPrice(itemToUse.item, itemToUse.row)) * 6

		const botMessage = await ctx.send({
			content: `Repair your ${getItemDisplay(itemToUse.item, itemToUse.row, { showEquipped: false })} for **${formatMoney(costToRepair)}**?`,
			components: CONFIRM_BUTTONS
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

			if (confirmed.customID !== 'confirmed') {
				await confirmed.editParent({
					content: `${icons.checkmark} Repair canceled.`,
					components: disableAllComponents(botMessage.components)
				})
				return
			}

			const transaction = await beginTransaction()
			const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
			const stashRowsV = await getUserStash(transaction.query, ctx.user.id, true)
			const backpackRowsV = await getUserBackpack(transaction.query, ctx.user.id, true)
			const userStashDataV = getItems(stashRowsV)
			const userBackpackDataV = getItems(backpackRowsV)
			const foundItem = userStashDataV.items.find(itm => itm.row.id === itemID) || userBackpackDataV.items.find(itm => itm.row.id === itemID)

			if (!foundItem) {
				await transaction.commit()

				await confirmed.editParent({
					content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory or stash.`,
					components: []
				})
				return
			}
			else if (
				!foundItem.item.durability ||
				!foundItem.item.sellPrice ||
				(
					itemToUse.item.type !== 'Body Armor' &&
					itemToUse.item.type !== 'Helmet' &&
					itemToUse.item.type !== 'Ranged Weapon' &&
					itemToUse.item.type !== 'Melee Weapon'
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
				content: `${icons.checkmark} Repair completed. Your ${getItemDisplay(foundItem.item, foundItem.row, { showEquipped: false, showDurability: false })} now has **${foundItem.item.durability}** uses left.`,
				components: []
			})
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} Repair timed out.`,
				components: disableAllComponents(botMessage.components)
			})
		}
	}
}

export default RepairCommand
