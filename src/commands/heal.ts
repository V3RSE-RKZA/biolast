import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { deleteItem, getUserBackpack } from '../utils/db/items'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { getNumber } from '../utils/argParsers'
import { addHealth, getUserRow } from '../utils/db/players'
import formatHealth from '../utils/formatHealth'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'

export const command: Command = {
	name: 'heal',
	aliases: [],
	examples: ['heal 12345'],
	description: 'Heal yourself using an item from your inventory.',
	shortDescription: 'Heal yourself using an item from your inventory.',
	category: 'items',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const itemID = getNumber(args[0])

		if (!itemID) {
			await reply(message, {
				content: `❌ You need to provide the ID of the item to heal with. You can find the IDs of items in your \`${prefix}inventory\`.`
			})
			return
		}

		const transaction = await beginTransaction()
		const backpackRows = await getUserBackpack(transaction.query, message.author.id, true)
		const userData = (await getUserRow(transaction.query, message.author.id, true))!
		const healCD = await getCooldown(transaction.query, message.author.id, 'heal')
		const userBackpackData = getItems(backpackRows)
		const itemToUse = userBackpackData.items.find(itm => itm.row.id === itemID)

		if (healCD) {
			await transaction.commit()

			await reply(message, {
				content: `❌ You need to wait **${healCD}** before you can heal again.`
			})
			return
		}
		else if (!itemToUse) {
			await transaction.commit()

			await reply(message, {
				content: `❌ You don't have an item with that ID in your inventory. You can find the IDs of items in your \`${prefix}inventory\`.`
			})
			return
		}
		else if (itemToUse.item.type !== 'Medical') {
			await transaction.commit()

			await reply(message, {
				content: `❌ ${getItemDisplay(itemToUse.item, itemToUse.row)} cannot be used to heal.`
			})
			return
		}

		const maxHeal = Math.min(userData.maxHealth - userData.health, itemToUse.item.healsFor)

		if (maxHeal === 0) {
			await transaction.commit()

			await reply(message, {
				content: '❌ You are already at max health!'
			})
			return
		}

		await createCooldown(transaction.query, message.author.id, 'heal', itemToUse.item.healRate)
		await deleteItem(transaction.query, itemToUse.row.id)
		await addHealth(transaction.query, message.author.id, maxHeal)
		await transaction.commit()

		await reply(message, {
			content: `You use your ${getItemDisplay(itemToUse.item, itemToUse.row)} to heal for **${maxHeal}** health! You now have ${formatHealth(userData.health + maxHeal, userData.maxHealth)} **${userData.health + maxHeal} / ${userData.maxHealth}** health.`
		})
	}
}
