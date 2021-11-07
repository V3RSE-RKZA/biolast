import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { StimulantMedical } from '../types/Items'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { getItemDisplay } from '../utils/itemUtils'
import { getActiveStimulants, getAfflictions, getAfflictionsDisplay } from '../utils/playerUtils'
import { formatHealth } from '../utils/stringUtils'

class HealthCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'status',
			description: 'View your current health and status effects.',
			longDescription: 'View your current health and status effects.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check status of.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const member = ctx.members.get(ctx.options.user)

		if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await ctx.send({
					content: `${icons.warning} **${member.displayName}** does not have an account!`
				})
				return
			}

			const activeStimulants = await getActiveStimulants(query, member.id)
			const activeAfflictions = await getAfflictions(query, member.id)
			const effectsDisplay = this.getStimulantsDisplay(activeStimulants)
			const afflictionsDisplay = getAfflictionsDisplay(activeAfflictions)

			await ctx.send({
				content: `**${member.displayName}** currently has ${formatHealth(userData.health, userData.maxHealth)} **${userData.health} / ${userData.maxHealth}** HP` +
					`\n\n__**Stimulants**__\n${effectsDisplay || 'None active'}` +
					`\n\n__**Afflictions**__\n${afflictionsDisplay || 'No afflictions'}`
			})
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!
		const activeStimulants = await getActiveStimulants(query, ctx.user.id)
		const activeAfflictions = await getAfflictions(query, ctx.user.id)
		const effectsDisplay = this.getStimulantsDisplay(activeStimulants)
		const afflictionsDisplay = getAfflictionsDisplay(activeAfflictions)

		await ctx.send({
			content: `You currently have ${formatHealth(userData.health, userData.maxHealth)} **${userData.health} / ${userData.maxHealth}** HP` +
				`\n\n__**Stimulants**__\n${effectsDisplay || 'None active'}` +
				`\n\n__**Afflictions**__\n${afflictionsDisplay || 'No afflictions'}`
		})
	}

	getStimulantsDisplay (activeStimulants: { cooldown: string, stimulant: StimulantMedical }[]): string {
		const effectsDisplay = []

		for (const stim of activeStimulants) {
			const effects = []

			if (stim.stimulant.effects.accuracyBonus) {
				effects.push(`${stim.stimulant.effects.accuracyBonus > 0 ? '+' : ''}${stim.stimulant.effects.accuracyBonus}% accuracy`)
			}
			if (stim.stimulant.effects.damageBonus) {
				effects.push(`${stim.stimulant.effects.damageBonus > 0 ? '+' : ''}${stim.stimulant.effects.damageBonus}% damage dealt`)
			}
			if (stim.stimulant.effects.weightBonus) {
				effects.push(`${stim.stimulant.effects.weightBonus > 0 ? '+' : ''}${stim.stimulant.effects.weightBonus} inventory slots`)
			}
			if (stim.stimulant.effects.fireRate) {
				effects.push(`${stim.stimulant.effects.fireRate > 0 ? '-' : '+'}${Math.abs(stim.stimulant.effects.fireRate)}% attack cooldown`)
			}
			if (stim.stimulant.effects.damageReduction) {
				effects.push(`${stim.stimulant.effects.damageReduction > 0 ? '-' : '+'}${Math.abs(stim.stimulant.effects.damageReduction)}% damage taken from attacks`)
			}

			effectsDisplay.push(`${getItemDisplay(stim.stimulant)} (${effects.join(', ')}) **${stim.cooldown}** left`)
		}

		return effectsDisplay.join('\n')
	}
}

export default HealthCommand
