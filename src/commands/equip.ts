import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { getNumber } from '../utils/argParsers'
import { getUserBackpack, unequipItem, equipItem } from '../utils/db/items'
import { getEquips, getItemDisplay, getItems } from '../utils/itemUtils'

export const command: Command = {
	name: 'equip',
	aliases: [],
	examples: ['equip 12345'],
	description: 'Equip an item from your inventory. Equipping a backpack will increase the amount your inventory can hold. Equipping a helmet or armor will protect you from damage. ' +
		'Equipping a weapon will use that weapon whenever you use the `attack` command.',
	shortDescription: 'Equip an item from your inventory.',
	category: 'items',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute (app, message, { args, prefix }) {
		const itemID = getNumber(args[0])

		if (!itemID) {
			await reply(message, {
				content: `❌ You need to provide the ID of the item you want to equip. You can find the IDs of items in your \`${prefix}inventory\`.`
			})
			return
		}

		const transaction = await beginTransaction()
		const backpackRows = await getUserBackpack(transaction.query, message.author.id, true)
		const userBackpackData = getItems(backpackRows)
		const itemToEquip = userBackpackData.items.find(itm => itm.row.id === itemID)

		if (!itemToEquip) {
			await transaction.commit()

			await reply(message, {
				content: `❌ You don't have an item with that ID in your inventory. You can find the IDs of items in your \`${prefix}inventory\`.`
			})
			return
		}
		else if (!['Ranged Weapon', 'Melee Weapon', 'Helmet', 'Body Armor', 'Backpack'].includes(itemToEquip.item.type)) {
			await transaction.commit()

			await reply(message, {
				content: `❌ Unequippable item. You cannot equip items of type **${itemToEquip.item.type}**. Specify a weapon, helmet, armor, or backpack to equip.`
			})
			return
		}

		const equips = getEquips(backpackRows)
		let unequippedItem

		if (equips.backpack && itemToEquip.item.type === 'Backpack') {
			unequippedItem = equips.backpack
			await unequipItem(transaction.query, equips.backpack.row.id)
		}
		else if (equips.weapon && (itemToEquip.item.type === 'Melee Weapon' || itemToEquip.item.type === 'Ranged Weapon')) {
			unequippedItem = equips.weapon
			await unequipItem(transaction.query, equips.weapon.row.id)
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

		await reply(message, {
			content: unequippedItem ?
				`Successfully unequipped ${getItemDisplay(unequippedItem.item, unequippedItem.row)} and equipped ${getItemDisplay(itemToEquip.item, itemToEquip.row)}` :
				`Successfully equipped ${getItemDisplay(itemToEquip.item, itemToEquip.row)}`
		})
	}
}
