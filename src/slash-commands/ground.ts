import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { GroundItemRow } from '../types/mysql'
import { formatTime } from '../utils/db/cooldowns'
import { addItemToBackpack, dropItemToGround, getGroundItems, getUserBackpack, removeItemFromBackpack, removeItemFromGround } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { backpackHasSpace, getItemDisplay, getItems } from '../utils/itemUtils'

const ITEMS_PER_PAGE = 10

class GroundCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'ground',
			description: 'View the items on the ground in a channel.',
			longDescription: 'View the items on the ground in a channel. You can drop items on the ground with the `drop` subcommand or pick up items from the ground using the `grab` subcommand.' +
				' Items on the ground expire after **10 - 15 minutes**.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'drop',
					description: 'Drop an item from your inventory onto the ground.',
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
					name: 'grab',
					description: 'Grab an item from the ground and put it in your inventory.',
					options: [
						{
							type: CommandOptionType.INTEGER,
							name: 'item',
							description: 'ID of item to grab.',
							required: true
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-2',
							description: 'ID of item to grab.',
							required: false
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item-3',
							description: 'ID of item to grab.',
							required: false
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'view',
					description: 'View the items on the ground in a channel.',
					options: []
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (ctx.options.drop) {
			const items: number[] = [ctx.options.drop.item, ctx.options.drop['item-2'], ctx.options.drop['item-3']].filter(Boolean)

			if ((new Set(items)).size !== items.length) {
				await ctx.send({
					content: `${icons.danger} You specified the same item multiple times! Are you trying to break me?? >:(`
				})
				return
			}

			const transaction = await beginTransaction()
			const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
			await getGroundItems(transaction.query, ctx.channelID, true)
			const userBackpackData = getItems(backpackRows)
			const itemsToDrop = []

			for (const i of items) {
				const foundItem = userBackpackData.items.find(itm => itm.row.id === i)

				// make sure user has item
				if (foundItem) {
					itemsToDrop.push(foundItem)
				}
				else {
					await transaction.commit()

					await ctx.send({
						content: `${icons.warning} You don't have an item with the ID **${i}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
					})
					return
				}
			}


			for (const i of itemsToDrop) {
				await removeItemFromBackpack(transaction.query, i.row.id)
				await dropItemToGround(transaction.query, ctx.channelID, i.row.id)
			}

			await transaction.commit()

			await ctx.send({
				content: `${icons.checkmark} Successfully dropped **${itemsToDrop.length}x** items onto the ground:\n\n${itemsToDrop.map(i => getItemDisplay(i.item, i.row, { showEquipped: false })).join('\n')}`
			})
			return
		}
		else if (ctx.options.grab) {
			const items: number[] = [ctx.options.grab.item, ctx.options.grab['item-2'], ctx.options.grab['item-3']].filter(Boolean)

			if ((new Set(items)).size !== items.length) {
				await ctx.send({
					content: `${icons.danger} You specified the same item multiple times! Are you trying to break me?? >:(`
				})
				return
			}

			const transaction = await beginTransaction()
			const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
			const groundRows = await getGroundItems(transaction.query, ctx.channelID, true)
			const groundItems = getItems(groundRows)
			const itemsToGrab = []
			let spaceNeeded = 0

			for (const i of items) {
				const foundItem = groundItems.items.find(itm => itm.row.id === i)

				// make sure ground has item
				if (foundItem) {
					itemsToGrab.push(foundItem)
					spaceNeeded += foundItem.item.slotsUsed
				}
				else {
					await transaction.commit()

					await ctx.send({
						content: `${icons.warning} Could not find an item with the ID **${i}** on the ground. You can find the IDs of ground items with \`/ground view\`.`
					})
					return
				}
			}

			if (!backpackHasSpace(backpackRows, spaceNeeded)) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.danger} You don't have enough space in your inventory. You need **${spaceNeeded}** open slots in your inventory. Drop items onto the ground to clear up some space.`
				})
				return
			}

			for (const i of itemsToGrab) {
				await removeItemFromGround(transaction.query, i.row.id)
				await addItemToBackpack(transaction.query, ctx.user.id, i.row.id)
			}

			await transaction.commit()

			await ctx.send({
				content: `${icons.checkmark} Successfully picked up **${itemsToGrab.length}x** items from the ground:\n\n${itemsToGrab.map(i => getItemDisplay(i.item, i.row)).join('\n')}`
			})
			return
		}

		// view items on ground
		const groundItems = await getGroundItems(query, ctx.channelID)
		const pages = this.generatePages(groundItems)

		if (!pages.length) {
			await ctx.send({
				content: `There are no items on the ground in this channel.\n\n${icons.information} You can drop an item from your inventory onto the ground with \`/ground drop <item id>\`.`
			})
		}
		else if (pages.length === 1) {
			await ctx.send({
				content: pages[0]
			})
		}
		else {
			await this.app.componentCollector.paginateContent(ctx, pages)
		}
	}

	generatePages (rows: GroundItemRow[]): string[] {
		const itemsDropped = getItems(rows).items.sort((a, b) => b.row.createdAt.getTime() - a.row.createdAt.getTime())
		const pages = []
		const maxPage = Math.ceil(itemsDropped.length / ITEMS_PER_PAGE)

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = itemsDropped.slice(indexFirst, indexLast)

			const content = `The following items are on the ground${maxPage > 1 ? ` (page ${i}/${maxPage})` : ''}:\n\n` +
				`${filteredItems.map(itm => `Dropped **${formatTime(Date.now() - itm.row.createdAt.getTime())}** ago - ${getItemDisplay(itm.item, itm.row)}`).join('\n')}\n\n` +
				`${icons.warning} Items on the ground will expire after **10 - 15 minutes**.\n` +
				`${icons.information} Pick up an item with \`/ground grab <item id>\` or drop an item from your inventory onto the ground with \`/ground drop <item id>\`.`

			pages.push(content)
		}

		return pages
	}
}

export default GroundCommand
