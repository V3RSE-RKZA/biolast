import { SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { allNPCs } from '../resources/npcs'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { query } from '../utils/db/mysql'
import { getNPC } from '../utils/db/npcs'
import { formatHealth, formatNumber } from '../utils/stringUtils'
import { getItemDisplay } from '../utils/itemUtils'
import { getRaidType } from '../utils/raidUtils'

class SearchCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'search',
			description: 'Search the area for any NPCs such as walkers, raiders, or something worse...',
			longDescription: 'Search the area for any threats such as walkers, raiders, or something worse... You can choose to engage with mobs and try to steal their items.',
			options: [],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,

			// this is automatically populated with the ids of raid guilds since onlyWorksInRaidGuild is set to true
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const raidType = getRaidType(ctx.guildID as string)
		if (!raidType) {
			// raid type not found?? this shouldn't happen so throw error
			throw new Error('Could not find raid type')
		}
		const raidChannel = raidType.channels.find(ch => ch.name === this.app.bot.guilds.get(ctx.guildID as string)?.channels.get(ctx.channelID)?.name)
		if (!raidChannel) {
			// raid channel not found, was the channel not specified in the location?
			throw new Error('Could not find raid channel')
		}

		const npcRow = await getNPC(query, ctx.channelID)
		const npc = allNPCs.find(n => n.id === npcRow?.id)

		if (!npcRow || !npc) {
			await ctx.send({
				content: `${icons.checkmark} You examine the area thoroughly and find no threats. Now would be a good time to scavenge for items.`
			})
			return
		}

		let npcHealthDisplay = `${npcRow.health} / ${npc.health}`
		let npcNameDisplay = npc.display

		if (npc.type === 'boss' && npcRow.health >= npc.health) {
			// boss npc that has full health (means this boss hasn't been attacked yet)
			npcHealthDisplay = npcHealthDisplay.replace(/\w/g, '?')
			npcNameDisplay = npcNameDisplay.replace(/\w/g, '?')
		}

		const npcDescription = [
			`**Health**: ${formatHealth(npcRow.health, npc.health)} **${npcHealthDisplay}** HP`,
			`**Kill XP**: 🌟 ${formatNumber(npc.xp, true)}`
		]

		if (npc.type === 'raider' || (npc.type === 'boss' && npc.subtype !== 'walker')) {
			if (npc.subtype === 'ranged') {
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

		npcDescription.push(`**Damage**: ${npc.damage}`)

		await ctx.send({
			content: `Enemy spotted: ${npc.icon}__**${npcNameDisplay}**__\n\n${npcDescription.join('\n')}\n\n` +
				`Attack this ${npc.type} with \`/attack npc\`.`
		})
	}
}

export default SearchCommand
