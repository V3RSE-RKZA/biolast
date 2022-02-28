import { CommandOptionType, SlashCreator, CommandContext, User } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons } from '../config'
import { isValidLocation, locations } from '../resources/locations'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { UserRow } from '../types/mysql'
import { getCooldown } from '../utils/db/cooldowns'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'

class CooldownCommand extends CustomSlashCommand<'cooldowns'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'cooldowns',
			description: 'View your current cooldowns.',
			longDescription: 'View your current cooldowns.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check cooldowns of.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
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

			const cdEmbed = await this.getCooldownsEmbed(member, userData)

			await ctx.send({
				embeds: [cdEmbed.embed]
			})
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!
		const cdEmbed = await this.getCooldownsEmbed(ctx.member || ctx.user, userData)

		await ctx.send({
			embeds: [cdEmbed.embed]
		})
	}

	async getCooldownsEmbed (member: ResolvedMember | User, userData: UserRow): Promise<Embed> {
		const userDisplay = 'user' in member ? member.displayName : `${member.username}#${member.username}`
		const currentLocation = isValidLocation(userData.currentLocation) ? locations[userData.currentLocation] : undefined
		const bossCD = currentLocation && await getCooldown(query, userData.userId, `boss-${currentLocation.display}`)
		const minibossCD = currentLocation && currentLocation.miniboss && await getCooldown(query, userData.userId, `miniboss-${currentLocation.display}`)
		const huntCD = await getCooldown(query, userData.userId, 'hunt')
		const scavengeCD = await getCooldown(query, userData.userId, 'scavenge')
		const travelCD = await getCooldown(query, userData.userId, 'travel')
		const tradeCD = await getCooldown(query, userData.userId, 'trade')
		const questCD = await getCooldown(query, userData.userId, 'quest')

		const embed = new Embed()
			.setAuthor(`${userDisplay}'s Cooldowns`, member.avatarURL)
			.addField('Hunt (`/hunt`)', huntCD || `${icons.checkmark} Ready!`, true)
			.addField('Scavenge (`/scavenge`)', scavengeCD || `${icons.checkmark} Ready!`, true)
			.addField('Travel (`/travel`)', travelCD || `${icons.checkmark} Ready!`, true)
			.addField('Trade (`/hunt`)', tradeCD || `${icons.checkmark} Ready!`, true)
			.addField('Quest (`/quest`)', questCD || `${icons.checkmark} Ready!`, true)

		if (currentLocation) {
			embed.addField(`${currentLocation.display} Boss (\`/boss\`)`, bossCD || `${icons.checkmark} Ready!`, true)
			embed.addField(`${currentLocation.display} Miniboss (\`/miniboss\`)`, minibossCD || `${icons.checkmark} Ready!`, true)
		}

		return embed
	}
}

export default CooldownCommand
