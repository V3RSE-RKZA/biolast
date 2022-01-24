import { GuildTextableChannel, Message, TextableChannel } from 'eris'
import App from '../app'

interface CommandArguments {
	prefix: string
	args: string[]
}

type TextCommandPermissionLevel = 'admin' | 'bot mods' | 'anyone'

interface BaseTextCommand {
	name: string
	aliases: string[]
	permissionLevel: TextCommandPermissionLevel
	worksInDMs: boolean
}

export interface DMTextCommand extends BaseTextCommand {
	worksInDMs: true
	execute(app: App, message: Message<TextableChannel>, commandArgs: CommandArguments): Promise<void>
}

export interface GuildTextCommand extends BaseTextCommand {
	worksInDMs: false
	execute(app: App, message: Message<GuildTextableChannel>, commandArgs: CommandArguments): Promise<void>
}

export type TextCommand = DMTextCommand | GuildTextCommand
