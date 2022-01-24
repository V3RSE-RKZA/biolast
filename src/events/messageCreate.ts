import { GuildTextableChannel, Message, PossiblyUncachedTextableChannel, Constants } from 'eris'
import { prefix, adminUsers, icons } from '../config'
import App from '../app'
import { logger } from '../utils/logger'
import { reply } from '../utils/messageUtils'

export async function run (this: App, message: Message<PossiblyUncachedTextableChannel>): Promise<void> {
	if (message.author.bot || !this.acceptingCommands || !message.content) {
		return
	}

	const prefixUsed = message.content.startsWith(prefix) ?
		prefix :
		message.content.startsWith(`<@${this.bot.user.id}>`) ?
			`<@${this.bot.user.id}>` :
			message.content.startsWith(`<@!${this.bot.user.id}>`) ?
				`<@!${this.bot.user.id}>` :
				undefined

	// verify bot prefix was used or bot was mentioned
	if (!prefixUsed) {
		return
	}

	const args = message.content.slice(prefixUsed.length).trimStart().split(/ +/)
	const commandName = args.shift()?.toLowerCase()

	const command = this.commands.find(cmd => cmd.name === commandName || (cmd.aliases.length && cmd.aliases.includes(commandName ?? '')))

	// no command was found
	if (!command) {
		return
	}

	else if (command.permissionLevel === 'admin' && !adminUsers.includes(message.author.id)) {
		return
	}

	else if (command.permissionLevel === 'bot mods' && !adminUsers.includes(message.author.id)) {
		return
	}

	// check if channel is uncached, and fetch if so
	if (!('type' in message.channel)) {
		const fetchedChannel = await this.bot.getRESTChannel(message.channel.id)

		if (fetchedChannel.type === Constants.ChannelTypes.DM) {
			message.channel = fetchedChannel
			this.bot.privateChannels.add(fetchedChannel)
			this.bot.privateChannelMap[fetchedChannel.id] = message.author.id
		}
		else {
			return
		}
	}

	if (!('type' in message.channel)) {
		return
	}
	else if (!command.worksInDMs && message.channel.type === Constants.ChannelTypes.DM) {
		await reply(message as Message, {
			content: `${icons.error_pain} That command can't be used in DMs!`
		})
		return
	}

	// execute command
	try {
		await command.execute(this, <Message<GuildTextableChannel>>message, { args, prefix: prefixUsed })
	}
	catch (err) {
		logger.error(err)
		message.channel.createMessage('Command failed to execute!').catch(e => { logger.warn(e) })
	}
}
