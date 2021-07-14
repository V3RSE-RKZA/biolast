import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { addItemToBackpack, getGroundItems, getUserBackpack, removeItemFromGround } from '../utils/db/items'
import { backpackHasSpace, getItemDisplay, getItems } from '../utils/itemUtils'
import { getNumber } from '../utils/argParsers'

export const command: Command = {
	name: 'grab',
	aliases: ['pickup'],
	examples: ['grab 12345'],
	description: 'Grabs an item from the ground and puts it in your backpack. You can view what items are on the ground with the `ground` command.',
	shortDescription: 'Grabs an item from the ground and puts it in your backpack.',
	category: 'items',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const itemID = getNumber(args[0])

		if (!itemID) {
			await reply(message, {
				content: `❌ You need to provide the ID of the item you want to drop. You can find the IDs of ground items with \`${prefix}ground\`.`
			})
			return
		}

		const transaction = await beginTransaction()
		const backpackRows = await getUserBackpack(transaction.query, message.author.id, true)
		const groundRows = await getGroundItems(transaction.query, message.channel.id, true)
		const groundItems = getItems(groundRows)
		const itemToGrab = groundItems.items.find(itm => itm.row.id === itemID)

		if (!itemToGrab) {
			await transaction.commit()

			await reply(message, {
				content: `❌ Could not find an item on the ground with that ID. You can find the IDs of ground items with \`${prefix}ground\`.`
			})
			return
		}
		else if (!backpackHasSpace(backpackRows, itemToGrab.item.slotsUsed)) {
			await transaction.commit()

			await reply(message, {
				content: `❌ You don't have enough space in your backpack. You need **${itemToGrab.item.slotsUsed}** open slots in your backpack. Drop items onto the ground to clear up some space.`
			})
			return
		}

		await removeItemFromGround(transaction.query, itemToGrab.row.id)
		await addItemToBackpack(transaction.query, message.author.id, itemToGrab.row.id)
		await transaction.commit()

		await reply(message, {
			content: `Picked up ${getItemDisplay(itemToGrab.item, itemToGrab.row)} from the ground. You can find this item in your \`${prefix}backpack\``
		})
	}
}
