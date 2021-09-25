import { TextCommand } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { allLocations } from '../resources/raids'
import { allNPCs } from '../resources/npcs'
import { getItemDisplay, sortItemsByType } from '../utils/itemUtils'
import { quests } from '../resources/quests'
import { allItems } from '../resources/items'
import { Item } from '../types/Items'

// yes this command is ugly its only for admins >:(

export const command: TextCommand = {
	name: 'unused',
	aliases: [],
	async execute (app, message, { args, prefix }) {
		const obtainable: Item[] = []

		for (const item of allItems) {
			for (const loc of allLocations) {
				for (const chan of loc.channels) {
					if (chan.scavange) {
						if (chan.scavange.common.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
						else if (chan.scavange.uncommon.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
						else if (chan.scavange.rare.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
						else if (chan.scavange.rarest?.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}

						if (chan.scavange.requiresKey && chan.scavange.keyIsOptional && chan.scavange.special.items.find(i => i.name === item.name)) {
							obtainable.push(item)
						}
					}
				}
			}

			for (const npc of allNPCs) {
				if (npc.armor && npc.armor.name === item.name) {
					obtainable.push(item)
				}
				else if (npc.helmet && npc.helmet.name === item.name) {
					obtainable.push(item)
				}
				else if ((npc.type === 'raider' || npc.type === 'boss') && npc.weapon.name === item.name) {
					obtainable.push(item)
				}
				else if ((npc.type === 'raider' || npc.type === 'boss') && npc.subtype === 'ranged' && npc.ammo.name === item.name) {
					obtainable.push(item)
				}
				else if (npc.drops.common.find(i => i.name === item.name)) {
					obtainable.push(item)
				}
				else if (npc.drops.uncommon.find(i => i.name === item.name)) {
					obtainable.push(item)
				}
				else if (npc.drops.rare.find(i => i.name === item.name)) {
					obtainable.push(item)
				}
			}

			for (const quest of quests) {
				if (quest.rewards.item && quest.rewards.item.name === item.name) {
					obtainable.push(item)
				}
			}
		}

		await reply(message, {
			content: `Unobtainable items:\n\n${sortItemsByType(allItems.filter(itm => !obtainable.includes(itm))).map(itm => `${getItemDisplay(itm)} (item level **${itm.itemLevel}**)`).join('\n')}`
		})
	}
}
