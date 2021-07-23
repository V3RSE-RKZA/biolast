import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { query } from '../utils/db/mysql'
import { GroundItemRow } from '../types/mysql'
import { getGroundItems } from '../utils/db/items'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { formatTime } from '../utils/db/cooldowns'

const ITEMS_PER_PAGE = 10

export const command: Command = {
	name: 'ground',
	aliases: [],
	examples: [],
	description: 'View the items on the ground in a channel. You can drop items on the ground with the `drop` command or pick up items from the ground using the `grab` command. Items on the ground expire after **20 - 25 minutes**.',
	shortDescription: 'View the items on the ground in a channel.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const groundItems = await getGroundItems(query, message.channel.id)
		const pages = generatePages(groundItems, prefix)

		if (!pages.length) {
			await reply(message, {
				content: `There are no items on the ground in this channel. You can drop an item from your inventory onto the ground with \`${prefix}drop <item id>\`.`
			})
		}
		else if (pages.length === 1) {
			await reply(message, {
				content: pages[0]
			})
		}
		else {
			await app.componentCollector.paginateContent(message, pages)
		}
	}
}

function generatePages (rows: GroundItemRow[], prefix: string): string[] {
	const itemsDropped = getItems(rows).items.sort((a, b) => b.row.createdAt.getTime() - a.row.createdAt.getTime())
	const pages = []
	const maxPage = Math.ceil(itemsDropped.length / ITEMS_PER_PAGE)

	for (let i = 1; i < maxPage + 1; i++) {
		const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
		const indexLast = ITEMS_PER_PAGE * i
		const filteredItems = itemsDropped.slice(indexFirst, indexLast)

		const content = `The following items are on the ground${maxPage > 1 ? ` (page ${i}/${maxPage})` : ''}:\n\n` +
			`${filteredItems.map(itm => `Dropped **${formatTime(Date.now() - itm.row.createdAt.getTime())}** ago - ${getItemDisplay(itm.item, itm.row)}`).join('\n')}\n\n` +
			'⚠️ Items on the ground will expire after **20 - 25 minutes**.\n' +
			`❔ Pick up an item with \`${prefix}grab <item id>\` or drop an item from your inventory onto the ground with \`${prefix}drop <item id>\`.`

		pages.push(content)
	}

	return pages
}
