import { GuildTextableChannel, Message, Constants } from 'eris'
import { prefix, adminUsers, icons } from '../config'
import { logger } from '../utils/logger'
import { reply } from '../utils/messageUtils'
import { EventHandler } from '../types/Events'

export default {
	name: 'messageCreate',
	async run (message) {
		try {
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

			// check if channel is uncached, and fetch if so
			else if (!('type' in message.channel)) {
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
				// channel type wasn't a DM and wasn't cached? group DMs shouldn't be possible since they require users to be friends with the bot
				return
			}

			else if ('guild' in message.channel) {
				const botPerms = message.channel.permissionsOf(this.bot.user.id)

				if (!botPerms.has('sendMessages') || !botPerms.has('externalEmojis')) {
					// bot doesnt have permission to send messages or use emojis, just return since text commands are optional
					return
				}
			}

			const args = message.content.slice(prefixUsed.length).trimStart().split(/ +/)
			const commandName = args.shift()?.toLowerCase()

			const command = this.commands.find(cmd => cmd.name === commandName || (cmd.aliases.length && cmd.aliases.includes(commandName ?? '')))

			// no command was found
			if (!command) {
				if (prefixUsed !== prefix) {
					// player mentioned bot, maybe they need help?
					await reply(message as Message, {
						content: `${icons.wave} Do you need help? Try running \`/help\`!`
					})
				}
				return
			}

			else if (command.permissionLevel === 'admin' && !adminUsers.includes(message.author.id)) {
				return
			}

			else if (command.permissionLevel === 'bot mods' && !adminUsers.includes(message.author.id)) {
				return
			}

			if (!command.worksInDMs && message.channel.type === Constants.ChannelTypes.DM) {
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
		catch (err) {
			// probly discord server error when sending message
			logger.warn(err)
		}
	}
} as EventHandler<'messageCreate'>
