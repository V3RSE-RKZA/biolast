import { CommandOptionType, SlashCreator, CommandContext, User } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { ItemRow, UserRow } from '../types/mysql'
import { addItemToBackpack, addItemToStash, getUserBackpack, getUserStash, removeItemFromBackpack, removeItemFromStash } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import formatNumber from '../utils/formatNumber'
import { getItemDisplay, getItems, sortItemsByName } from '../utils/itemUtils'

const ITEMS_PER_PAGE = 10

class StashCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'stash',
			description: 'View the items in your stash or transfer items to it using the put/take sub-commands.',
			longDescription: 'View the items in your stash. Your stash holds much more than your inventory but can only be altered when out of raid. ' +
				'You can put items from your inventory into your stash using `/stash put <item id>` or take items from your stash and put them into your inventory with `/stash take <item id>`.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'put',
					description: 'Move an item from your inventory into your stash.',
					options: [
						{
							type: CommandOptionType.INTEGER,
							name: 'item',
							description: 'ID of item to put in stash.',
							required: true
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-2',
							description: 'ID of item to put in stash.',
							required: false
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-3',
							description: 'ID of item to put in stash.',
							required: false
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'take',
					description: 'Move an item from your stash into your inventory.',
					options: [
						{
							type: CommandOptionType.INTEGER,
							name: 'item',
							description: 'ID of item to take from stash.',
							required: true
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-2',
							description: 'ID of item to take from stash.',
							required: false
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-3',
							description: 'ID of item to take from stash.',
							required: false
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'view',
					description: 'View the items in your stash.',
					options: [{
						type: CommandOptionType.USER,
						name: 'user',
						description: 'User to check stash of.',
						required: false
					}]
				}
			],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (ctx.options.put) {
			const items: number[] = [ctx.options.put.item, ctx.options.put['item-2'], ctx.options.put['item-3']].filter(Boolean)

			if ((new Set(items)).size !== items.length) {
				await ctx.send({
					content: '❌ You specified the same item multiple times! Are you trying to break me?? >:('
				})
				return
			}

			const transaction = await beginTransaction()
			const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
			const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
			const stashRows = await getUserStash(transaction.query, ctx.user.id, true)
			const userStashData = getItems(stashRows)
			const userBackpackData = getItems(backpackRows)
			const itemsToDeposit = []

			for (const i of items) {
				const foundItem = userBackpackData.items.find(itm => itm.row.id === i)

				// make sure user has item
				if (foundItem) {
					itemsToDeposit.push(foundItem)
				}
				else {
					await transaction.commit()

					await ctx.send({
						content: `❌ You don't have an item with the ID **${i}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
					})
					return
				}
			}

			const slotsNeeded = itemsToDeposit.reduce((prev, curr) => prev + curr.item.slotsUsed, 0)
			if (userStashData.slotsUsed + slotsNeeded > userData.stashSlots) {
				await ctx.send({
					content: `❌ You don't have enough space in your stash. You need **${slotsNeeded}** open slots in your stash. Sell items to clear up some space.`
				})
				return
			}

			for (const i of itemsToDeposit) {
				await removeItemFromBackpack(transaction.query, i.row.id)
				await addItemToStash(transaction.query, ctx.user.id, i.row.id)
			}

			await transaction.commit()

			await ctx.send({
				content: `Successfully moved the following from your inventory to your stash:\n\n${itemsToDeposit.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}`
			})
			return
		}
		else if (ctx.options.take) {
			const items: number[] = [ctx.options.take.item, ctx.options.take['item-2'], ctx.options.take['item-3']].filter(Boolean)

			if ((new Set(items)).size !== items.length) {
				await ctx.send({
					content: '❌ You specified the same item multiple times! Are you trying to break me?? >:('
				})
				return
			}

			const transaction = await beginTransaction()
			const stashRows = await getUserStash(transaction.query, ctx.user.id, true)
			const userStashData = getItems(stashRows)
			const itemsToWithdraw = []

			for (const i of items) {
				const foundItem = userStashData.items.find(itm => itm.row.id === i)

				// make sure user has item
				if (foundItem) {
					itemsToWithdraw.push(foundItem)
				}
				else {
					await transaction.commit()

					await ctx.send({
						content: `❌ You don't have an item with the ID **${i}** in your stash. You can find the IDs of items in your \`/stash\`.`
					})
					return
				}
			}


			for (const i of itemsToWithdraw) {
				await removeItemFromStash(transaction.query, i.row.id)
				await addItemToBackpack(transaction.query, ctx.user.id, i.row.id)
			}

			await transaction.commit()

			await ctx.send({
				content: `Successfully moved the following from your stash to your inventory:\n\n${itemsToWithdraw.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}`
			})
			return
		}

		// view player stash
		const member = ctx.members.get(ctx.options.view && ctx.options.view.user)

		if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await ctx.send({
					content: `❌ **${member.user.username}#${member.user.discriminator}** does not have an account!`
				})
				return
			}

			const userStash = await getUserStash(query, member.id)
			const pages = this.generatePages(member, userStash, userData)

			if (pages.length === 1) {
				await ctx.send({
					embeds: [pages[0].embed]
				})
			}
			else {
				await this.app.componentCollector.paginateEmbeds(ctx, pages)
			}
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!
		const userStash = await getUserStash(query, ctx.user.id)
		const pages = this.generatePages(ctx.user, userStash, userData)

		if (pages.length === 1) {
			await ctx.send({
				embeds: [pages[0].embed]
			})
		}
		else {
			await this.app.componentCollector.paginateEmbeds(ctx, pages)
		}
	}

	generatePages (member: ResolvedMember | User, rows: ItemRow[], userData: UserRow): Embed[] {
		const user = 'user' in member ? member.user : member
		const itemData = getItems(rows)
		const sortedItems = sortItemsByName(itemData.items, true)
		const pages = []
		const maxPage = Math.ceil(itemData.items.length / ITEMS_PER_PAGE) || 1

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = sortedItems.slice(indexFirst, indexLast)

			const embed = new Embed()
				.setAuthor(`${user.username}#${user.discriminator}'s Stash`, user.avatarURL)
				.addField('__Stash Info__', `**Rubles**: ${formatNumber(userData.money)}\n` +
				`**Number of Items**: ${itemData.items.length}`)
				.addField(`__Items in Stash__ (Space: ${itemData.slotsUsed} / ${userData.stashSlots})`,
					filteredItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || 'No items found. Move items from your inventory to your stash with `/stash put <item id>`.')
			pages.push(embed)
		}

		return pages
	}
}

export default StashCommand
