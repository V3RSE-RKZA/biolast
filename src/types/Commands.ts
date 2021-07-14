import { Message, GuildTextableChannel, TextableChannel, Constants } from 'eris'
import App from '../app'

interface CommandArguments {
	prefix: string
	args: string[]
}

export type CommandPermission = keyof typeof Constants.Permissions

type CommandCategory = 'admin' | 'info' | 'games' | 'economy' | 'utility'

interface BaseCommand {
	name: string
	aliases: string[]
	examples: string[]
	description: string
	guildModsOnly: boolean

	/**
	 * Whether or not this command can be used while the user is in an active raid
	 */
	canBeUsedInRaid: boolean

	category: CommandCategory
	permissions: CommandPermission[]
}

// Discriminating union based on worksInDMs field which allows me to get the correct message channel types
interface DMCommand extends BaseCommand {
	worksInDMs: true

	// guildModsOnly MUST be false for DM commands
	guildModsOnly: false
	execute(app: App, message: Message<TextableChannel>, commandArgs: CommandArguments): Promise<void>
}
interface GuildCommand extends BaseCommand {
	worksInDMs: false
	execute(app: App, message: Message<GuildTextableChannel>, commandArgs: CommandArguments): Promise<void>
}

export type Command = DMCommand | GuildCommand
