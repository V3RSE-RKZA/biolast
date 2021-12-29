import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { deleteItem, getUserBackpack, getUserStash, lowerItemDurability } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addHealth, getUserRow } from '../utils/db/players'
import { formatHealth } from '../utils/stringUtils'
import { getItemDisplay, getItems } from '../utils/itemUtils'

class HealCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'heal',
			description: 'Use a medical item to restore health.',
			longDescription: 'Use a medical item to restore health. Use this to heal when outside of a duel.',
			options: [
				{
					type: CommandOptionType.INTEGER,
					name: 'item',
					description: 'ID of item to use.',
					required: true
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
		const itemID = ctx.options.item

		const transaction = await beginTransaction()
		const stashRows = await getUserStash(transaction.query, ctx.user.id, true)
		const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
		const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
		const userStashData = getItems(stashRows)
		const userBackpackData = getItems(backpackRows)
		const itemToUse = userStashData.items.find(itm => itm.row.id === itemID) || userBackpackData.items.find(itm => itm.row.id === itemID)

		if (!itemToUse) {
			await transaction.commit()

			await ctx.send({
				content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
			})
		}
		else if (itemToUse.item.type === 'Medical') {
			const maxHeal = Math.min(userData.maxHealth - userData.health, itemToUse.item.healsFor)

			if (maxHeal === 0) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.danger} You are already at max health!`
				})
				return
			}

			if (!itemToUse.row.durability || itemToUse.row.durability - 1 <= 0) {
				await deleteItem(transaction.query, itemToUse.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, itemToUse.row.id, 1)
			}

			await addHealth(transaction.query, ctx.user.id, maxHeal)
			await transaction.commit()

			const itemDisplay = getItemDisplay(itemToUse.item, {
				...itemToUse.row,
				durability: itemToUse.row.durability ? itemToUse.row.durability - 1 : undefined
			}, {
				showID: false
			})

			await ctx.send({
				content: `${icons.checkmark} You use your ${itemDisplay} to heal for **${maxHeal}** health!` +
					`You now have ${formatHealth(userData.health + maxHeal, userData.maxHealth)} **${userData.health + maxHeal} / ${userData.maxHealth}** health.`
			})
		}
		else {
			await transaction.commit()

			await ctx.send({
				content: `${icons.danger} ${getItemDisplay(itemToUse.item, itemToUse.row, { showEquipped: false })} cannot be used to heal.`
			})
		}
	}
}

export default HealCommand
