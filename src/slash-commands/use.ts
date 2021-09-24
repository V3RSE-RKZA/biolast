import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { deleteItem, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addHealth, getUserRow } from '../utils/db/players'
import { formatHealth } from '../utils/stringUtils'
import { getBackpackLimit, getEquips, getItemDisplay, getItems } from '../utils/itemUtils'

class HealCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'use',
			description: 'Use an item such as a medical item to heal yourself.',
			longDescription: 'Use an item such as a medical item to heal yourself.',
			options: [
				{
					type: CommandOptionType.INTEGER,
					name: 'item',
					description: 'ID of item to use. ',
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
		const userBackpackData = getItems(backpackRows)
		const itemToUse = userBackpackData.items.find(itm => itm.row.id === itemID)

		if (!itemToUse) {
			await transaction.commit()

			await ctx.send({
				content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
			})
		}
		else if (itemToUse.item.type === 'Medical' && itemToUse.item.subtype === 'Healing') {
			const healCD = await getCooldown(transaction.query, ctx.user.id, 'heal')

			if (healCD) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} You need to wait **${healCD}** before you can heal again.`
				})
				return
			}

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

			await createCooldown(transaction.query, ctx.user.id, 'heal', itemToUse.item.healRate)
			await addHealth(transaction.query, ctx.user.id, maxHeal)
			await transaction.commit()

			const itemDisplay = getItemDisplay(itemToUse.item, {
				...itemToUse.row,
				durability: itemToUse.row.durability ? itemToUse.row.durability - 1 : undefined
			}, {
				showID: false
			})

			await ctx.send({
				content: `${icons.checkmark} You use your ${itemDisplay} to heal for **${maxHeal}** health! You now have ${formatHealth(userData.health + maxHeal, userData.maxHealth)} **${userData.health + maxHeal} / ${userData.maxHealth}** health.`
			})
		}
		else if (itemToUse.item.type === 'Medical' && itemToUse.item.subtype === 'Stimulant') {
			const stimulantActiveCD = await getCooldown(transaction.query, ctx.user.id, itemToUse.item.name)
			const equips = getEquips(backpackRows)

			if (stimulantActiveCD) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} Your current ${getItemDisplay(itemToUse.item)} is still active for **${stimulantActiveCD}**.`
				})
				return
			}

			if (!itemToUse.row.durability || itemToUse.row.durability - 1 <= 0) {
				await deleteItem(transaction.query, itemToUse.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, itemToUse.row.id, 1)
			}

			await createCooldown(transaction.query, ctx.user.id, itemToUse.item.name, itemToUse.item.effects.length)
			await transaction.commit()

			const itemDisplay = getItemDisplay(itemToUse.item, {
				...itemToUse.row,
				durability: itemToUse.row.durability ? itemToUse.row.durability - 1 : undefined
			}, {
				showID: false
			})
			const effectsDisplay = []

			if (itemToUse.item.effects.accuracyBonus) {
				effectsDisplay.push(`You now have **${itemToUse.item.effects.accuracyBonus}%** better accuracy with your weapons.`)
			}
			if (itemToUse.item.effects.damageBonus) {
				effectsDisplay.push(`You now deal **${itemToUse.item.effects.damageBonus}%** more damage with your weapons.`)
			}
			if (itemToUse.item.effects.weightBonus) {
				effectsDisplay.push(`Your inventory slots has been increased by **${itemToUse.item.effects.weightBonus}** (${getBackpackLimit(equips.backpack?.item)} → ${getBackpackLimit(equips.backpack?.item) + itemToUse.item.effects.weightBonus}).`)
			}

			await ctx.send({
				content: `${icons.checkmark} You inject yourself using your ${itemDisplay}. You now have the following effects for **${formatTime(itemToUse.item.effects.length * 1000)}**:\n\n${effectsDisplay.join('\n')}`
			})
		}
		else {
			await transaction.commit()

			await ctx.send({
				content: `${icons.danger} ${getItemDisplay(itemToUse.item, itemToUse.row, { showEquipped: false })} cannot be used. You can only use items of types: **Medical**`
			})
		}
	}
}

export default HealCommand
