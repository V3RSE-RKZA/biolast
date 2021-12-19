import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { clearCooldown, createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { deleteItem, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addHealth, getUserRow } from '../utils/db/players'
import { combineArrayWithAnd, formatHealth } from '../utils/stringUtils'
import { getBackpackLimit, getEquips, getItemDisplay, getItems } from '../utils/itemUtils'
import { getAfflictions } from '../utils/playerUtils'

class HealCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'use',
			description: 'Use a medical item on yourself.',
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
			worksDuringDuel: false,
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
			const curedAfflictions = []

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

			if (itemToUse.item.curesBitten || itemToUse.item.curesBrokenArm || itemToUse.item.curesBurning) {
				const afflictions = await getAfflictions(transaction.query, ctx.user.id, true)

				for (const affliction of afflictions) {
					if (itemToUse.item.curesBitten && affliction.type === 'Bitten') {
						await clearCooldown(transaction.query, ctx.user.id, 'bitten')
						curedAfflictions.push(affliction.type)
					}
					else if (itemToUse.item.curesBrokenArm && affliction.type === 'Broken Arm') {
						await clearCooldown(transaction.query, ctx.user.id, 'broken-arm')
						curedAfflictions.push(affliction.type)
					}
					else if (itemToUse.item.curesBurning && affliction.type === 'Burning') {
						await clearCooldown(transaction.query, ctx.user.id, 'burning')
						curedAfflictions.push(affliction.type)
					}
				}
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
				content: `${icons.checkmark} You use your ${itemDisplay} to heal for **${maxHeal}** health!` +
					`You now have ${formatHealth(userData.health + maxHeal, userData.maxHealth)} **${userData.health + maxHeal} / ${userData.maxHealth}** health.` +
					`${curedAfflictions.length ? `\n\nAfflictions cured: ${combineArrayWithAnd(curedAfflictions)}` : ''}`
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
				effectsDisplay.push(`${itemToUse.item.effects.accuracyBonus > 0 ? icons.buff : icons.debuff} You now have **${itemToUse.item.effects.accuracyBonus > 0 ? '+' : ''}${itemToUse.item.effects.accuracyBonus}%** accuracy with your weapons.`)
			}
			if (itemToUse.item.effects.damageBonus) {
				effectsDisplay.push(`${itemToUse.item.effects.damageBonus > 0 ? icons.buff : icons.debuff} You now deal **${itemToUse.item.effects.damageBonus > 0 ? '+' : ''}${itemToUse.item.effects.damageBonus}%** damage with your weapons.`)
			}
			if (itemToUse.item.effects.weightBonus) {
				effectsDisplay.push(`${itemToUse.item.effects.weightBonus > 0 ? icons.buff : icons.debuff} Your inventory slots has been ${itemToUse.item.effects.weightBonus > 0 ? 'increased' : 'decreased'} by **${itemToUse.item.effects.weightBonus}** (${getBackpackLimit(equips.backpack?.item)} → ${getBackpackLimit(equips.backpack?.item) + itemToUse.item.effects.weightBonus}).`)
			}
			if (itemToUse.item.effects.fireRate) {
				effectsDisplay.push(`${itemToUse.item.effects.fireRate > 0 ? icons.buff : icons.debuff} Your attack cooldown is now ${itemToUse.item.effects.fireRate > 0 ? 'decreased' : 'increased'} by **${itemToUse.item.effects.fireRate}%**.`)
			}
			if (itemToUse.item.effects.damageReduction) {
				effectsDisplay.push(`${itemToUse.item.effects.damageReduction > 0 ? icons.buff : icons.debuff} Your damage taken from attacks is now ${itemToUse.item.effects.damageReduction > 0 ? 'decreased' : 'increased'} by **${itemToUse.item.effects.damageReduction}%**.`)
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
