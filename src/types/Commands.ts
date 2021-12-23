import { Message, TextableChannel } from 'eris'
import App from '../app'

interface CommandArguments {
	prefix: string
	args: string[]
}

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
