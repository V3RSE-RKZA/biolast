import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { equipItem, getUserBackpack, unequipItem } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { getEquips, getItemDisplay, getItems } from '../utils/itemUtils'

class EquipCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'equip',
			description: 'Equip an item from your inventory such as a backpack, weapon, or armor.',
			longDescription: 'Equip an item from your inventory. Equipping a backpack will increase the amount your inventory can hold. Equipping a helmet or armor will protect you from damage. ' +
				'Equipping a weapon will use that weapon whenever you use the `attack` command.',
			options: [
				{
					type: CommandOptionType.INTEGER,
					name: 'item',
					description: 'ID of item to equip.',
					required: true
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

		const transaction = await beginTransaction()
		const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
		const userBackpackData = getItems(backpackRows)
		const itemToEquip = userBackpackData.items.find(itm => itm.row.id === itemID)

		if (!itemToEquip) {
			await transaction.commit()

			await ctx.send({
				content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
			})
			return
		}
		else if (!['Helmet', 'Body Armor', 'Backpack'].includes(itemToEquip.item.type)) {
			await transaction.commit()

			await ctx.send({
				content: `${icons.warning} Unequippable item. You cannot equip items of type **${itemToEquip.item.type}**. Specify a helmet, armor, or backpack to equip.`
			})
			return
		}

		const equips = getEquips(backpackRows)
		let unequippedItem

		if (equips.backpack && itemToEquip.item.type === 'Backpack') {
			unequippedItem = equips.backpack
			await unequipItem(transaction.query, equips.backpack.row.id)
		}
		else if (equips.helmet && itemToEquip.item.type === 'Helmet') {
			unequippedItem = equips.helmet
			await unequipItem(transaction.query, equips.helmet.row.id)
		}
		else if (equips.armor && itemToEquip.item.type === 'Body Armor') {
			unequippedItem = equips.armor
			await unequipItem(transaction.query, equips.armor.row.id)
		}

		await equipItem(transaction.query, itemToEquip.row.id)
		await transaction.commit()

		await ctx.send({
			content: unequippedItem ?
				`${icons.checkmark} Unequipped ${getItemDisplay(unequippedItem.item, unequippedItem.row, { showEquipped: false })} and equipped ${getItemDisplay(itemToEquip.item, itemToEquip.row)}` :
				`${icons.checkmark} Equipped ${getItemDisplay(itemToEquip.item, itemToEquip.row)}`
		})
	}
}

export default EquipCommand
