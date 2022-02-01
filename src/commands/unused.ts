import { TextCommand } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { allLocations } from '../resources/locations'
import { getItemDisplay, sortItemsByType } from '../utils/itemUtils'
import { allItems } from '../resources/items'
import { Item } from '../types/Items'
import { merchantTrades } from '../resources/trades'

// yes this command is ugly its only for admins >:(
const ITEMS_PER_PAGE = 20

export const command: TextCommand = {
	name: 'unused',
	aliases: [],
	permissionLevel: 'admin',
	worksInDMs: true,
	async execute (app, message, { args, prefix }) {
		const obtainable: Item[] = []

		for (const itemFixed of allItems) {
			for (const loc of allLocations) {
				for (const area of loc.areas) {
					if (area.loot.common.items.find(i => i.name === itemFixed.name)) {
						obtainable.push(itemFixed)
					}
					else if (area.loot.uncommon.items.find(i => i.name === itemFixed.name)) {
						obtainable.push(itemFixed)
					}
					else if (area.loot.rare.items.find(i => i.name === itemFixed.name)) {
						obtainable.push(itemFixed)
					}
					else if (area.loot.rarest?.items.find(i => i.name === itemFixed.name)) {
						obtainable.push(itemFixed)
					}

					if (
						area.npc &&
						(
							(area.npc.armor && area.npc.armor.name === itemFixed.name) ||
							(area.npc.helmet && area.npc.helmet.name === itemFixed.name) ||
							(area.npc.type === 'raider' && area.npc.weapon.name === itemFixed.name) ||
							(area.npc.type === 'raider' && 'ammo' in area.npc && area.npc.ammo.name === itemFixed.name) ||
							(area.npc.drops.common.find(i => i.name === itemFixed.name)) ||
							(area.npc.drops.uncommon.find(i => i.name === itemFixed.name)) ||
							(area.npc.drops.rare.find(i => i.name === itemFixed.name))
						)
					) {
						obtainable.push(itemFixed)
					}
				}

				if (
					(loc.boss.armor && loc.boss.armor.name === itemFixed.name) ||
					(loc.boss.helmet && loc.boss.helmet.name === itemFixed.name) ||
					(loc.boss.type === 'raider' && loc.boss.weapon.name === itemFixed.name) ||
					(loc.boss.type === 'raider' && 'ammo' in loc.boss && loc.boss.ammo.name === itemFixed.name) ||
					(loc.boss.drops.common.find(i => i.name === itemFixed.name)) ||
					(loc.boss.drops.uncommon.find(i => i.name === itemFixed.name)) ||
					(loc.boss.drops.rare.find(i => i.name === itemFixed.name))
				) {
					obtainable.push(itemFixed)
				}
			}

			for (const trade of merchantTrades) {
				if (trade.offer.item.name === itemFixed.name) {
					obtainable.push(trade.offer.item)
				}
			}
		}

		const unobtainables = sortItemsByType(allItems.filter(itm => itm.name !== 'dog_tags' && !obtainable.includes(itm)))
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
