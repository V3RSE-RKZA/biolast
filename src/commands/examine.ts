import { TextCommand } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { allLocations } from '../resources/raids'
import { getItem } from '../utils/argParsers'
import { allNPCs } from '../resources/npcs'
import { getItemDisplay } from '../utils/itemUtils'
import { quests } from '../resources/quests'
import { icons } from '../config'
import { combineArrayWithOr } from '../utils/stringUtils'

// yes this command is ugly its only for admins >:(

export const command: TextCommand = {
	name: 'examine',
	aliases: [],
	async execute (app, message, { args, prefix }) {
		const item = getItem(args)

		if (!item) {
			await reply(message, {
				content: `${icons.danger} Unable to find item with that name. \`=examine <item name>\``
			})
			return
		}

		const obtainedFromNpcs = []
		const obtainedFromChannels = []
		const obtainedFromQuests = []

		for (const loc of allLocations) {
			for (const chan of loc.channels) {
				if (chan.scavange) {
					if (chan.scavange.common.items.find(i => i.name === item.name)) {
						obtainedFromChannels.push(`\`${chan.name}\` ${chan.scavange.requiresKey ? `(requires ${combineArrayWithOr(chan.scavange.requiresKey.map(key => getItemDisplay(key)))} key to scavenge)` : ''} in **${loc.display}** (common 60% drop)`)
					}
					else if (chan.scavange.uncommon.items.find(i => i.name === item.name)) {
						obtainedFromChannels.push(`\`${chan.name}\` ${chan.scavange.requiresKey ? `(requires ${combineArrayWithOr(chan.scavange.requiresKey.map(key => getItemDisplay(key)))} key to scavenge)` : ''} in **${loc.display}** (uncommon 25% drop)`)
					}
					else if (chan.scavange.rare.items.find(i => i.name === item.name)) {
						obtainedFromChannels.push(`\`${chan.name}\` ${chan.scavange.requiresKey ? `(requires ${combineArrayWithOr(chan.scavange.requiresKey.map(key => getItemDisplay(key)))} key to scavenge)` : ''} in **${loc.display}** (rare 15% drop)`)
					}
					else if (chan.scavange.rarest?.items.find(i => i.name === item.name)) {
						obtainedFromChannels.push(`\`${chan.name}\` ${chan.scavange.requiresKey ? `(requires ${combineArrayWithOr(chan.scavange.requiresKey.map(key => getItemDisplay(key)))} key to scavenge)` : ''} in **${loc.display}** (rarest 5% drop)`)
					}

					if (chan.scavange.requiresKey && chan.scavange.keyIsOptional && chan.scavange.special.items.find(i => i.name === item.name)) {
						obtainedFromChannels.push(`\`${chan.name}\` in **${loc.display}** (special drop, requires ${combineArrayWithOr(chan.scavange.requiresKey.map(key => getItemDisplay(key)))} key to obtain)`)
					}
				}
			}
		}

		for (const npc of allNPCs) {
			if (npc.armor && npc.armor.name === item.name) {
				obtainedFromNpcs.push(`\`${npc.id}\` (${npc.type}) wears this as armor and will 100% drop it with random durability`)
			}
			else if (npc.helmet && npc.helmet.name === item.name) {
				obtainedFromNpcs.push(`\`${npc.id}\` (${npc.type}) wears this as a helmet and will 100% drop it with random durability`)
			}
			else if ((npc.type === 'raider' || npc.type === 'boss') && npc.weapon.name === item.name) {
				obtainedFromNpcs.push(`\`${npc.id}\` (${npc.type}) uses this as a weapon and will 100% drop it with random durability`)
			}
			else if ((npc.type === 'raider' || npc.type === 'boss') && npc.subtype === 'ranged' && npc.ammo.name === item.name) {
				obtainedFromNpcs.push(`\`${npc.id}\` (${npc.type}) uses this as ammo and will drop 1x - 3x of it`)
			}
			else if (npc.drops.common.find(i => i.name === item.name)) {
				obtainedFromNpcs.push(`\`${npc.id}\` (${npc.type}) drops this as a common 60% drop`)
			}
			else if (npc.drops.uncommon.find(i => i.name === item.name)) {
				obtainedFromNpcs.push(`\`${npc.id}\` (${npc.type}) drops this as a uncommon 25% drop`)
			}
			else if (npc.drops.rare.find(i => i.name === item.name)) {
				obtainedFromNpcs.push(`\`${npc.id}\` (${npc.type}) drops this as a rare 15% drop`)
			}
		}

		for (const quest of quests) {
			if (quest.rewards.item && quest.rewards.item.name === item.name) {
				obtainedFromQuests.push(`\`${quest.id}\` (quest type: ${quest.questType}) gives this as a reward. Quest eligible for players level **${quest.minLevel}** - **${quest.maxLevel}**`)
			}
		}

		await reply(message, {
			content: `${getItemDisplay(item)} can be obtained from:\n\n` +
				`**NPCS**:\n${obtainedFromNpcs.join('\n') || '❌ none'}\n\n` +
				`**Channels**:\n${obtainedFromChannels.join('\n') || '❌ none'}\n\n` +
				`**Quests**:\n${obtainedFromQuests.join('\n') || '❌ none'}`
		})
	}
}
