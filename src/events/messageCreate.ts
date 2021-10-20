import { GuildTextableChannel, Message } from 'eris'
import { prefix, adminUsers } from '../config'
import App from '../app'
import { logger } from '../utils/logger'
import { isRaidGuild } from '../utils/raidUtils'

export async function run (this: App, message: Message): Promise<void> {
	// deletes messages sent by users in raid guilds
	if (!message.author.bot && isRaidGuild(message.guildID)) {
		await message.delete()
	}

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
		logger.error(err)
		message.channel.createMessage('Command failed to execute!')
	}
}
