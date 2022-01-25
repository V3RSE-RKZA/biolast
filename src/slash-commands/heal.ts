import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { deleteItem, getUserBackpack, getUserStash, lowerItemDurability } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addHealth, getUserRow } from '../utils/db/players'
import { formatHealth } from '../utils/stringUtils'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { getNumber } from '../utils/argParsers'

class HealCommand extends CustomSlashCommand<'heal'> {
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
				},
				{
					type: CommandOptionType.STRING,
					name: 'amount',
					description: 'Amount of times to use the item. You can also specify "max" to use as the item as much as possible.',
					required: false
				}
			],
			category: 'equipment',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const itemID = ctx.options.item
		let amount = getNumber(ctx.options.amount) || 1

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
			return
		}
		else if (itemToUse.item.type !== 'Medical') {
			await transaction.commit()

			await ctx.send({
				content: `${icons.danger} ${getItemDisplay(itemToUse.item, itemToUse.row, { showEquipped: false })} cannot be used to heal.`
			})
			return
		}
		else if (amount > (itemToUse.row.durability || 1)) {
			await transaction.commit()

			await ctx.send({
				content: `${icons.danger} Your ${getItemDisplay(itemToUse.item, itemToUse.row, { showEquipped: false, showDurability: false })} can only be used up to **${itemToUse.row.durability || 1}x** more times.`
			})
			return
		}
		else if (ctx.options.amount && ctx.options.amount.toLowerCase() === 'max') {
			amount = itemToUse.row.durability || 1
		}

		const timesToUse = Math.min(itemToUse.row.durability || 1, Math.ceil((userData.maxHealth - userData.health) / itemToUse.item.healsFor), amount)
		const maxHeal = Math.min(userData.maxHealth - userData.health, itemToUse.item.healsFor * timesToUse)

		if (maxHeal === 0) {
			await transaction.commit()

			await ctx.send({
				content: `${icons.danger} You are already at max health!`
			})
			return
		}

		if (!itemToUse.row.durability || itemToUse.row.durability - timesToUse <= 0) {
			await deleteItem(transaction.query, itemToUse.row.id)
		}
		else {
			await lowerItemDurability(transaction.query, itemToUse.row.id, timesToUse)
		}

		await addHealth(transaction.query, ctx.user.id, maxHeal)
		await transaction.commit()

		const usesLeft = itemToUse.row.durability ? itemToUse.row.durability - timesToUse : 0

		await ctx.send({
			content: `${icons.checkmark} You use your ${getItemDisplay(itemToUse.item, itemToUse.row, { showDurability: false })} **${timesToUse}x** times to heal for **${maxHeal}** health!` +
				` You now have ${formatHealth(userData.health + maxHeal, userData.maxHealth)} **${userData.health + maxHeal} / ${userData.maxHealth}** health.` +
				`\n\nYour ${getItemDisplay(itemToUse.item)} has **${usesLeft}** uses left.`
		})
	}
}

export default HealCommand
