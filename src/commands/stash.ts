import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { getUserRow } from '../utils/db/players'
import { beginTransaction, query } from '../utils/db/mysql'
import { getMember, getNumber } from '../utils/argParsers'
import { ItemRow, UserRow } from '../types/mysql'
import Embed from '../structures/Embed'
import { Member } from 'eris'
import { addItemToBackpack, addItemToStash, getUserBackpack, getUserStash, removeItemFromBackpack, removeItemFromStash } from '../utils/db/items'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import formatNumber from '../utils/formatNumber'

const ITEMS_PER_PAGE = 10

export const command: Command = {
	name: 'stash',
	aliases: [],
	examples: ['stash @blobfysh', 'stash put 12345', 'stash take 12345'],
	description: 'View the items in your stash. Your stash holds much more than your backpack but can only be altered when out of raid. ' +
		'You can put items from your backpack into your stash using `stash put <item id>` or take items from your stash and put them into your backpack with `stash take <item id>`.',
	shortDescription: 'View the items in your stash.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: false,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const member = getMember(message.channel.guild, args)

		if (args[0] === 'put') {
			const itemID = getNumber(args[1])

			if (!itemID) {
				await reply(message, {
					content: `❌ You need to provide the ID of the item you want to put in your stash. You can find the IDs of items in your \`${prefix}backpack\`.`
				})
				return
			}

			const transaction = await beginTransaction()
			const backpackRows = await getUserBackpack(transaction.query, message.author.id, true)
			const userBackpackData = getItems(backpackRows)
			const itemToDeposit = userBackpackData.items.find(itm => itm.row.id === itemID)

			if (!itemToDeposit) {
				await transaction.commit()

				await reply(message, {
					content: `❌ You don't have an item with that ID in your backpack. You can find the IDs of items in your \`${prefix}backpack\`.`
				})
				return
			}

			await removeItemFromBackpack(transaction.query, itemToDeposit.row.id)
			await addItemToStash(transaction.query, message.author.id, itemToDeposit.row.id)
			await transaction.commit()

			await reply(message, {
				content: `Successfully moved ${getItemDisplay(itemToDeposit.item, itemToDeposit.row)} from your backpack to your stash.`
			})
			return
		}
		if (args[0] === 'take') {
			const itemID = getNumber(args[1])

			if (!itemID) {
				await reply(message, {
					content: `❌ You need to provide the ID of the item you want to take out of your stash. You can find the IDs of items in your \`${prefix}stash\`.`
				})
				return
			}

			const transaction = await beginTransaction()
			const stashRows = await getUserStash(transaction.query, message.author.id, true)
			const userStashData = getItems(stashRows)
			const itemToWithdraw = userStashData.items.find(itm => itm.row.id === itemID)

			if (!itemToWithdraw) {
				await transaction.commit()

				await reply(message, {
					content: `❌ You don't have an item with that ID in your stash. You can find the IDs of items in your \`${prefix}stash\`.`
				})
				return
			}

			await removeItemFromStash(transaction.query, itemToWithdraw.row.id)
			await addItemToBackpack(transaction.query, message.author.id, itemToWithdraw.row.id)
			await transaction.commit()

			await reply(message, {
				content: `Successfully moved ${getItemDisplay(itemToWithdraw.item, itemToWithdraw.row)} from your stash to your backpack.`
			})
			return
		}
		else if (!member && args.length) {
			await reply(message, {
				content: '❌ Could not find anyone matching that description!\nYou can mention someone, use their Discord#tag, or type their user ID'
			})
			return
		}
		else if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await reply(message, {
					content: `❌ **${member.username}#${member.discriminator}** does not have an account!`
				})
				return
			}

			const userStash = await getUserStash(query, member.id)
			const pages = generatePages(member, userStash, userData, prefix)

			if (pages.length === 1) {
				await reply(message, {
					embed: pages[0].embed
				})
			}
			else {
				await app.btnCollector.paginateEmbeds(message, pages)
			}
			return
		}

		const userData = (await getUserRow(query, message.author.id))!
		const userStash = await getUserStash(query, message.author.id)
		const pages = generatePages(message.member, userStash, userData, prefix)

		if (pages.length === 1) {
			await reply(message, {
				embed: pages[0].embed
			})
		}
		else {
			await app.btnCollector.paginateEmbeds(message, pages)
		}
	}
}

function generatePages (member: Member, rows: ItemRow[], userData: UserRow, prefix: string): Embed[] {
	const itemData = getItems(rows)
	const pages = []
	const maxPage = Math.ceil(itemData.items.length / ITEMS_PER_PAGE) || 1

	for (let i = 1; i < maxPage + 1; i++) {
		const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
		const indexLast = ITEMS_PER_PAGE * i
		const filteredItems = itemData.items.slice(indexFirst, indexLast)

		const embed = new Embed()
			.setAuthor(`${member.username}#${member.discriminator}'s Stash Inventory`, member.avatarURL)
			.setDescription(`__**Stash Info**__\n**Rubles**: ${formatNumber(userData.money)}\n` +
				`**Number of Items**: ${itemData.items.length}\n\n` +
				`__**Items in Stash**__ (Space: ${itemData.slotsUsed} / ${userData.stashSlots})\n` +
				`${filteredItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || `No items found. Move items from your backpack to your stash with \`${prefix}stash put <item id>\`.`}`)

		pages.push(embed)
	}

	return pages
}
