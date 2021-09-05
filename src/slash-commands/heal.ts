import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'
import { deleteItem, getUserBackpack } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addHealth, getUserRow } from '../utils/db/players'
import formatHealth from '../utils/formatHealth'
import { getItemDisplay, getItems } from '../utils/itemUtils'

class HealCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'heal',
			description: 'Heal yourself using an item from your inventory.',
			longDescription: 'Heal yourself using an item from your inventory.',
			options: [
				{
					type: CommandOptionType.INTEGER,
					name: 'item',
					description: 'ID of item to heal with. Must be a medical item.',
					required: true
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const itemID = ctx.options.item

		const transaction = await beginTransaction()
		const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
		const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
		const healCD = await getCooldown(transaction.query, ctx.user.id, 'heal')
		const userBackpackData = getItems(backpackRows)
		const itemToUse = userBackpackData.items.find(itm => itm.row.id === itemID)

		if (healCD) {
			await transaction.commit()

			await ctx.send({
				content: `❌ You need to wait **${healCD}** before you can heal again.`
			})
			return
		}
		else if (!itemToUse) {
			await transaction.commit()

			await ctx.send({
				content: `❌ You don't have an item with the ID **${itemID}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
			})
			return
		}
		else if (itemToUse.item.type !== 'Medical') {
			await transaction.commit()

			await ctx.send({
				content: `❌ ${getItemDisplay(itemToUse.item, itemToUse.row)} cannot be used to heal.`
			})
			return
		}

		const maxHeal = Math.min(userData.maxHealth - userData.health, itemToUse.item.healsFor)

		if (maxHeal === 0) {
			await transaction.commit()

			await ctx.send({
				content: '❌ You are already at max health!'
			})
			return
		}

		await createCooldown(transaction.query, ctx.user.id, 'heal', itemToUse.item.healRate)
		await deleteItem(transaction.query, itemToUse.row.id)
		await addHealth(transaction.query, ctx.user.id, maxHeal)
		await transaction.commit()

		await ctx.send({
			content: `You use your ${getItemDisplay(itemToUse.item)} to heal for **${maxHeal}** health! You now have ${formatHealth(userData.health + maxHeal, userData.maxHealth)} **${userData.health + maxHeal} / ${userData.maxHealth}** health.`
		})
	}
}

export default HealCommand
