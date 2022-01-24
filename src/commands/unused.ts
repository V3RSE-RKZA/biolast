import { TextCommand } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { allLocations } from '../resources/locations'
import { getItemDisplay, sortItemsByType } from '../utils/itemUtils'
import { allItems } from '../resources/items'
import { Item } from '../types/Items'

// yes this command is ugly its only for admins >:(
const ITEMS_PER_PAGE = 20

export const command: TextCommand = {
	name: 'unused',
	aliases: [],
	permissionLevel: 'admin',
	worksInDMs: true,
	async execute (app, message, { args, prefix }) {
		const obtainable: Item[] = []

		for (const item of allItems) {
			for (const loc of allLocations) {
				for (const chan of loc.areas) {
					if (chan.loot) {
						if (chan.loot.common.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
						else if (chan.loot.uncommon.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
						else if (chan.loot.rare.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
						else if (chan.loot.rarest?.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}

						if (chan.requiresKey && chan.keyIsOptional && chan.specialLoot.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
					}
				}
			}
		}

		const unobtainables = sortItemsByType(allItems.filter(itm => !obtainable.includes(itm)))
		const pages = generatePages(unobtainables)

		for (const page of pages) {
			await reply(message, {
				content: page
			})
		}
	}
}

function generatePages (items: Item[]): string[] {
	const pages = []
	const maxPage = Math.ceil(items.length / ITEMS_PER_PAGE) || 1

	for (let i = 1; i < maxPage + 1; i++) {
		const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
		const indexLast = ITEMS_PER_PAGE * i
		const filteredItems = items.slice(indexFirst, indexLast)

		pages.push(filteredItems.map(itm => `${getItemDisplay(itm)} (item level **${itm.itemLevel}**)`).join('\n'))
	}

	return pages
}
