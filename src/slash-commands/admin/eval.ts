import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import { inspect } from 'util'
import App from '../../app'
import { allItems } from '../../resources/items'
import { allLocations } from '../../resources/raids'
import CustomSlashCommand from '../../structures/CustomSlashCommand'
import Embed from '../../structures/Embed'
import { query } from '../../utils/db/mysql'

class EvalCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'eval',
			description: 'Eval stuff...',
			longDescription: 'Eval stuff...',
			options: [{
				// TODO update this once discord releases full text input
				type: CommandOptionType.STRING,
				name: 'input',
				description: 'yes.',
				required: true
			}],
			category: 'admin',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			guildIDs: ['497302646521069568'],
			deferEphemeral: true
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const test = {
			allLocations,
			allItems,
			query
		}
		let commandInput = ctx.options.input

		if (commandInput.startsWith('```')) {
			// remove the first and last lines from code block
			commandInput = commandInput.split('\n').slice(1, -1).join('\n')
		}

		try {
			const start = new Date().getTime()
			// eslint-disable-next-line no-eval
			let evaled = await eval(commandInput)
			const end = new Date().getTime()

			if (typeof evaled !== 'string') evaled = inspect(evaled)

			const segments = evaled.match(/[\s\S]{1,1500}/g)

			if (segments.length === 1) {
				const evalEmbed = new Embed()
					.setDescription(`\`\`\`js\n${segments[0]}\`\`\``)
					.setColor(12118406)
					.setFooter(`${end - start}ms`)

				await ctx.send({
					embeds: [evalEmbed.embed]
				})
			}
			else {
				for (let i = 0; i < (segments.length < 5 ? segments.length : 5); i++) {
					await ctx.send({
						content: `\`\`\`js\n${segments[i]}\`\`\``
					})
				}
			}
		}
		catch (err) {
			const evalEmbed = new Embed()
				.setTitle('Something went wrong.')
				.setDescription(`\`\`\`js\n${err}\`\`\``)
				.setColor(13914967)

			await ctx.send({
				embeds: [evalEmbed.embed]
			})
		}
	}
}

export default EvalCommand
