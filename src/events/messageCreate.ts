import { GuildTextableChannel, Message } from 'eris'
import { prefix, adminUsers } from '../config'
import App from '../app'

export async function run (this: App, message: Message): Promise<void> {
	if (message.author.bot || !this.acceptingCommands) {
		return
	}

	else if (!message.content.toLowerCase().startsWith(prefix)) {
		return
	}

	const args = message.content.slice(prefix.length).split(/ +/)
	const commandName = args.shift()?.toLowerCase()

	const command = this.commands.find(cmd => cmd.name === commandName || (cmd.aliases.length && cmd.aliases.includes(commandName ?? '')))

	// no command was found
	if (!command) {
		return
	}

	// commands that rely on message.content can only be used by bot admins
	else if (!adminUsers.includes(message.author.id)) {
		return
	}

	// execute command
	try {
		await command.execute(this, <Message<GuildTextableChannel>>message, { args, prefix })
	}
	catch (err) {
		console.error(err)
		message.channel.createMessage('Command failed to execute!')
	}
}
