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
				}

				const npcsWithItem = loc.huntMobs.filter(mob => (
					(mob.armor && mob.armor.name === itemFixed.name) ||
					(mob.helmet && mob.helmet.name === itemFixed.name) ||
					(mob.type === 'raider' && mob.weapon.name === itemFixed.name) ||
					(mob.type === 'raider' && 'ammo' in mob && mob.ammo.name === itemFixed.name) ||
					(mob.drops.common.find(i => i.name === itemFixed.name)) ||
					(mob.drops.uncommon.find(i => i.name === itemFixed.name)) ||
					(mob.drops.rare.find(i => i.name === itemFixed.name))
				))

				if (npcsWithItem.length) {
					obtainable.push(itemFixed)
				}

				if (
					(loc.boss.npc.armor && loc.boss.npc.armor.name === itemFixed.name) ||
					(loc.boss.npc.helmet && loc.boss.npc.helmet.name === itemFixed.name) ||
					(loc.boss.npc.type === 'raider' && loc.boss.npc.weapon.name === itemFixed.name) ||
					(loc.boss.npc.type === 'raider' && 'ammo' in loc.boss.npc && loc.boss.npc.ammo.name === itemFixed.name) ||
					(loc.boss.npc.drops.common.find(i => i.name === itemFixed.name)) ||
					(loc.boss.npc.drops.uncommon.find(i => i.name === itemFixed.name)) ||
					(loc.boss.npc.drops.rare.find(i => i.name === itemFixed.name))
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
