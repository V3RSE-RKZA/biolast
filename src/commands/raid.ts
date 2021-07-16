import { Command } from '../types/Commands'
import { messageUser, reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { addUserToRaid, getAllUsers, getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { customs, Location } from '../resources/raids'
import { customsGuilds } from '../config'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { formatTime } from '../utils/db/cooldowns'
import { getUserBackpack } from '../utils/db/items'

export const command: Command = {
	name: 'raid',
	aliases: [],
	examples: ['raid customs'],
	description: 'Used to join a raid. Raids are where you go to scavenge for loot and fight other players.' +
		' You will take everything in your backpack with you, and if you die you will lose all the items you took (your stash remains unaffected).' +
		' **This command will try to DM you a server invite link, if you have DMs disabled the bot will try sending the link to the channel. It is highly suggested you open your DMs though.**',
	shortDescription: 'Used to join a raid.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: false,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const choice = args[0]

		if (!choice) {
			await reply(message, {
				content: '❌ You need to specify a location you want to raid. The following locations are available:\n\n' +
					'**Customs** - Medium-size raid, max 20 players per raid, raid lasts 20 minutes.\n\n' +
					'The bot is in early access, expect more locations to be added.'
			})
			return
		}
		else if (!['customs'].includes(choice.toLowerCase())) {
			await reply(message, {
				content: '❌ That\'s not a valid raid location. The following locations are available:\n\n' +
				'**Customs** - Medium-size raid, max 20 players per raid, raid lasts 20 minutes.\n\n' +
				'The bot is in early access, expect more locations to be added.'
			})
			return
		}

		let location: {
			guilds: string[]
			info: Location
		}
		switch (choice.toLowerCase()) {
			default: location = { guilds: customsGuilds, info: customs }; break
		}

		const botMessage = await reply(message, {
			content: `Join a raid in **${location.info.display}**? The raid will last **${formatTime(location.info.raidLength * 1000)}**.`,
			components: CONFIRM_BUTTONS
		})

		try {
			const confirmed = (await app.btnCollector.awaitClicks(botMessage.id, i => i.user.id === message.author.id))[0]

			if (confirmed.customID === 'confirmed') {
				// using transaction because users data will be updated
				const transaction = await beginTransaction()
				const userRaid = await getUsersRaid(transaction.query, message.author.id, true)
				let raidGuildID

				if (userRaid) {
					await transaction.commit()

					await confirmed.editParent({
						content: `❌ You are already in an active raid! You can join it here: https://discord.gg/${userRaid.invite}`,
						components: []
					})
					return
				}

				// find a raid with room for players
				for (const id of location.guilds) {
					const players = await getAllUsers(transaction.query, id)

					if (players.length <= location.info.playerLimit) {
						raidGuildID = id
					}
				}

				// a raid with room for players was not found
				if (!raidGuildID) {
					await transaction.commit()

					await confirmed.editParent({
						content: `❌ All of the **${location.info.display}** raids are full! Try again in 5 - 10 minutes after some players have extracted.`,
						components: []
					})
					return
				}

				const raidGuild = app.bot.guilds.get(raidGuildID)

				if (!raidGuild) {
					await transaction.commit()

					throw new Error('Could not find raid guild')
				}

				const inviteChannel = raidGuild.channels.find(ch => ch.name === 'welcome')

				if (!inviteChannel) {
					await transaction.commit()

					throw new Error(`Could not find welcome channel in guild: ${raidGuild.id}`)
				}

				const invite = await app.bot.createChannelInvite(inviteChannel.id, { maxAge: location.info.raidLength }, 'User started raid')

				await addUserToRaid(transaction.query, message.author.id, raidGuild.id, invite.code, location.info.raidLength)
				await transaction.commit()

				app.activeRaids.push({
					userID: message.author.id,
					timeout: setTimeout(async () => {
						try {
							const expiredTransaction = await beginTransaction()
							await getUsersRaid(expiredTransaction.query, message.author.id, true)
							await getUserBackpack(expiredTransaction.query, message.author.id, true)
							await removeUserFromRaid(expiredTransaction.query, message.author.id)

							// remove items from backpack since user didn't extract
							await expiredTransaction.query('DELETE items FROM items INNER JOIN backpack_items ON items.id = backpack_items.itemId WHERE userId = ?', [message.author.id])
							await expiredTransaction.commit()

							await app.bot.kickGuildMember(raidGuild.id, message.author.id, 'Raid time ran out')
						}
						catch (err) {
							// unable to kick user?
						}
					}, location.info.raidLength * 1000)
				})

				try {
					await messageUser(message.author, {
						content: `Once you join this server, you will have **${formatTime(location.info.raidLength * 1000)}** to extract with whatever loot you can find.` +
							` You can use \`${prefix}raidtime\` to view how much time you have left.\n\nhttps://discord.gg/${invite.code}`
					}, true)

					await confirmed.editParent({
						content: '✅ Raid started! Check your DMs for the invite.',
						components: []
					})
				}
				catch (err) {
					await confirmed.editParent({
						content: `✅ Raid started! Once you join this server, you will have **${formatTime(location.info.raidLength * 1000)}** to extract with whatever loot you can find.` +
							` You can use \`${prefix}raidtime\` to view how much time you have left.\n\nhttps://discord.gg/${invite.code}`,
						components: []
					})
				}
			}
			else {
				await botMessage.delete()
			}
		}
		catch (err) {
			await botMessage.edit({
				content: '❌ Command timed out.',
				components: []
			})
		}
	}
}
