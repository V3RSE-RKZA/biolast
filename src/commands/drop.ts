import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { dropItemToGround, getGroundItems, getUserBackpack, removeItemFromBackpack } from '../utils/db/items'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { getNumber } from '../utils/argParsers'

export const command: Command = {
	name: 'drop',
	aliases: [],
	examples: ['drop 12345'],
	description: 'Drop an item from your backpack onto the ground. You can view what items are on the ground with the `ground` command.',
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
				content: `❌ You need to provide the ID of the item you want to drop. You can find the IDs of items in your \`${prefix}backpack\`.`
			})
			return
		}

		const transaction = await beginTransaction()
		const backpackRows = await getUserBackpack(transaction.query, message.author.id, true)
		const groundRows = await getGroundItems(transaction.query, message.channel.id, true)
		const userBackpackData = getItems(backpackRows)
		const itemToDrop = userBackpackData.items.find(itm => itm.row.id === itemID)

		if (!itemToDrop) {
			await transaction.commit()

			await reply(message, {
				content: `❌ You don't have an item with that ID in your backpack. You can find the IDs of items in your \`${prefix}backpack\`.`
			})
			return
		}

		await removeItemFromBackpack(transaction.query, itemToDrop.row.id)
		await dropItemToGround(transaction.query, message.channel.id, itemToDrop.row.id)
		await transaction.commit()

		await reply(message, {
			content: `Dropped ${getItemDisplay(itemToDrop.item, itemToDrop.row)} onto the ground.`
		})
	}
}
