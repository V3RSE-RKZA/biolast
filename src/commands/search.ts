import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { query } from '../utils/db/mysql'
import { getRaidType } from '../utils/raidUtils'
import { getItemDisplay } from '../utils/itemUtils'
import { getNPC } from '../utils/db/npcs'
import { allNPCs } from '../resources/npcs'
import formatHealth from '../utils/formatHealth'

export const command: Command = {
	name: 'search',
	aliases: ['examine', 'mob', 'npc', 'boss'],
	examples: [],
	description: 'Search the area for any threats such as walkers, raiders, or something worse... You can choose to engage with mobs and try to steal their items.',
	shortDescription: 'Search the area for any threats such as walkers, raiders, or something worse...',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const raidType = getRaidType(message.channel.guild.id)
		if (!raidType) {
			// raid type not found?? this shouldn't happen so throw error
			throw new Error('Could not find raid type')
		}

		const raidChannel = raidType.channels.find(ch => ch.name === message.channel.name)
		if (!raidChannel) {
			// raid channel not found, was the channel not specified in the location?
			throw new Error('Could not find raid channel')
		}

		const npcRow = await getNPC(query, message.channel.id)
		const npc = allNPCs.find(n => n.id === npcRow?.id)

		if (!npcRow || !npc) {
			await reply(message, {
				content: 'You examine the area thoroughly and find no threats. Now would be a good time to scavenge for items.'
			})
			return
		}

		const npcDescription = [
			`**Health**: ${formatHealth(npc.health, npc.health)} **${npc.health} / ${npc.health}**`
		]

		if (npc.type === 'raider') {
			if (npc.ammo) {
				npcDescription.push(`**Weapon**: ${getItemDisplay(npc.weapon)} (ammo: ${getItemDisplay(npc.ammo)})`)
			}
			else {
				npcDescription.push(`**Weapon**: ${getItemDisplay(npc.weapon)}`)
			}

			if (npc.helmet) {
				npcDescription.push(`**Helmet**: ${getItemDisplay(npc.helmet)}`)
			}

			if (npc.armor) {
				npcDescription.push(`**Armor**: ${getItemDisplay(npc.armor)}`)
			}
		}

		await reply(message, {
			content: `__**${npc.display}**__\n${npcDescription.join('\n')}\n\n` +
				`Attack this ${npc.type} with \`${prefix}attack ${npc.type}\`.`
		})
	}
}
