import { Message, GuildTextableChannel, TextableChannel, Constants } from 'eris'
import App from '../app'

interface CommandArguments {
	prefix: string
	args: string[]
}

export type CommandPermission = keyof typeof Constants.Permissions

type CommandCategory = 'admin' | 'info' | 'items' | 'utility'

interface BaseCommand {
	name: string
	aliases: string[]
	examples: string[]
	description: string
	shortDescription: string
	guildModsOnly: boolean

	/**
	 * The cooldown for this command in seconds. THIS DOES NOT PROVIDE FUNCTIONALITY, IT IS ONLY FOR DISPLAY IN THE HELP COMMAND
	 *
	 * Most commands will be 2 seconds which is just the default spam cooldown
	 */
	cooldown: number

	/**
	 * Whether or not this command can be used while the user is in an active raid
	 */
	canBeUsedInRaid: boolean

	/**
	 * Whether this command can ONLY be used in a raid guild
	 */
	onlyWorksInRaidGuild: boolean

	category: CommandCategory
	permissions: CommandPermission[]
}

// Discriminating union based on worksInDMs field which allows me to get the correct message channel types
interface DMCommand extends BaseCommand {
	worksInDMs: true

	// guildModsOnly MUST be false for DM commands
	guildModsOnly: false

	// command must not be raid-only command
	onlyWorksInRaidGuild: false
	execute(app: App, message: Message<TextableChannel>, commandArgs: CommandArguments): Promise<void>
}
interface GuildCommand extends BaseCommand {
	worksInDMs: false
	canBeUsedInRaid: false
	onlyWorksInRaidGuild: false
	execute(app: App, message: Message<GuildTextableChannel>, commandArgs: CommandArguments): Promise<void>
}

/**
 * Can be used in a raid server
 */
interface RaidCommand extends BaseCommand {
	worksInDMs: false
	canBeUsedInRaid: true
	onlyWorksInRaidGuild: boolean
	execute(app: App, message: Message<GuildTextableChannel>, commandArgs: CommandArguments): Promise<void>
}

export type Command = DMCommand | GuildCommand | RaidCommand
