import { Message, TextableChannel, Constants } from 'eris'
import App from '../app'

interface CommandArguments {
	prefix: string
	args: string[]
}

export type CommandPermission = keyof typeof Constants.Permissions

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

export type CommandOptions = DMCommandOptions | GuildCommandOptions | RaidCommandOptions

/**
 * Text commands rely on message.content
 *
 * They will only be used by bot admins for testing
 */
export interface TextCommand {
	name: string
	aliases: string[]
	execute(app: App, message: Message<TextableChannel>, commandArgs: CommandArguments): Promise<void>
}
