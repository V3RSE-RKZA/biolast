import { SlashCommand, SlashCommandOptions, SlashCreator } from 'slash-create'
import App from '../app'
import { allLocations } from '../resources/raids'

type CommandCategory = 'admin' | 'info' | 'items' | 'utility'

interface BaseCommandOptions {
	guildModsOnly: boolean

	/**
	 * Whether or not this command can be used while the user is in an active raid
	 */
	canBeUsedInRaid: boolean

	/**
	 * Whether this command can ONLY be used in a raid guild
	 */
	onlyWorksInRaidGuild: boolean

	category: CommandCategory
}

interface DMCommandOptions extends BaseCommandOptions {
	worksInDMs: true

	// guildModsOnly MUST be false for DM commands
	guildModsOnly: false

	// command must not be raid-only command
	onlyWorksInRaidGuild: false
}

interface GuildCommandOptions extends BaseCommandOptions {
	worksInDMs: false
	canBeUsedInRaid: false
	onlyWorksInRaidGuild: false
}

/**
 * Can be used in a raid server
 */
interface RaidCommandOptions extends BaseCommandOptions {
	worksInDMs: false
	canBeUsedInRaid: true
	onlyWorksInRaidGuild: boolean
}

type CommandOptions = DMCommandOptions | GuildCommandOptions | RaidCommandOptions

class CustomSlashCommand extends SlashCommand {
	app: App
	customOptions: CommandOptions

	constructor (
		creator: SlashCreator,
		app: App,
		slashOptions: SlashCommandOptions & CommandOptions
	) {
		// raid-only commands should only be registered to raid guilds
		if (slashOptions.onlyWorksInRaidGuild) {
			if (slashOptions.guildIDs) {
				slashOptions.guildIDs = [...slashOptions.guildIDs, ...allLocations.map(loc => loc.guilds).flat(1)]
			}
			else {
				slashOptions.guildIDs = allLocations.map(loc => loc.guilds).flat(1)
			}
		}

		super(creator, slashOptions)

		this.app = app
		this.customOptions = slashOptions
	}
}

export default CustomSlashCommand
