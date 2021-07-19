import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { beginTransaction, query } from '../utils/db/mysql'
import { addUserToRaid, getAllUsers, getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { Location, allLocations } from '../resources/raids'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { formatTime } from '../utils/db/cooldowns'
import { getUserBackpack } from '../utils/db/items'
import Embed from '../structures/Embed'

export const command: Command = {
	name: 'raid',
	aliases: ['explore'],
	examples: ['raid the suburbs'],
	description: 'Used to join a raid. Raids are where you go to scavenge for loot and fight other players.' +
		' You will take everything in your backpack with you, and if you die you will lose all the items you took (your stash remains unaffected).' +
		' **This command will try to DM you a server invite link. If you have DMs disabled the bot will try sending the link to the channel, although it is highly suggested you open your DMs.**',
	shortDescription: 'Used to join a raid.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const isInRaid = await getUsersRaid(query, message.author.id)

		if (isInRaid) {
			const botMessage = await reply(message, {
				content: '⚠️ You are already in a raid. Are you looking for the invite link?',
				components: CONFIRM_BUTTONS
			})

			try {
				const confirmed = (await app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === message.author.id))[0]

				if (confirmed.customID === 'confirmed') {
					await confirmed.send({
						content: `https://discord.gg/${isInRaid.invite}`,
						ephemeral: true
					})

					await confirmed.editParent({
						content: '✅ Sent invite link!',
						components: []
					})
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

			return
		}

		const choice = getRaidChoice(args)

		if (!choice) {
			await reply(message, {
				content: '❌ You need to specify a location you want to raid. The following locations are available:',
				embed: getLocationsEmbed().embed
			})
			return
		}

		const botMessage = await reply(message, {
			content: `Join a raid in **${choice.display}**? The raid will last **${formatTime(choice.raidLength * 1000)}**.`,
			components: CONFIRM_BUTTONS
		})

		try {
			const confirmed = (await app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === message.author.id))[0]

			if (confirmed.customID === 'confirmed') {
				// using transaction because users data will be updated
				const transaction = await beginTransaction()
				const userRaid = await getUsersRaid(transaction.query, message.author.id, true)
				let raidGuildID

				if (userRaid) {
					await transaction.commit()

					await confirmed.editParent({
						content: '❌ You are already in an active raid!',
						components: []
					})
					return
				}

				// find a raid with room for players
				for (const id of choice.guilds) {
					const players = await getAllUsers(transaction.query, id)

					if (players.length <= choice.playerLimit) {
						raidGuildID = id
					}
				}

				// a raid with room for players was not found
				if (!raidGuildID) {
					await transaction.commit()

					await confirmed.editParent({
						content: `❌ All of the **${choice.display}** raids are full! Try again in 5 - 10 minutes after some players have left the raid.`,
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

				const invite = await app.bot.createChannelInvite(inviteChannel.id, { maxAge: choice.raidLength }, 'User started raid')

				await addUserToRaid(transaction.query, message.author.id, raidGuild.id, invite.code, choice.raidLength)
				await transaction.commit()

				app.activeRaids.push({
					userID: message.author.id,
					timeout: setTimeout(async () => {
						try {
							const expiredTransaction = await beginTransaction()
							await getUsersRaid(expiredTransaction.query, message.author.id, true)
							await getUserBackpack(expiredTransaction.query, message.author.id, true)
							await removeUserFromRaid(expiredTransaction.query, message.author.id)

							// remove items from backpack since user didn't evac
							await expiredTransaction.query('DELETE items FROM items INNER JOIN backpack_items ON items.id = backpack_items.itemId WHERE userId = ?', [message.author.id])
							await expiredTransaction.commit()

							await app.bot.kickGuildMember(raidGuild.id, message.author.id, 'Raid time ran out')
						}
						catch (err) {
							// unable to kick user?
						}
					}, choice.raidLength * 1000)
				})

				await confirmed.send({
					content: `You have **${formatTime(choice.raidLength * 1000)}** to join this raid and evac with whatever loot you can find.` +
						` You can use \`${prefix}raidtime\` to view how much time you have left.\n\nhttps://discord.gg/${invite.code}`,
					ephemeral: true
				})

				await confirmed.editParent({
					content: `✅ **${choice.display}** raid started!`,
					components: []
				})
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

function getLocationsEmbed (): Embed {
	const locationsEmb = new Embed()
		.setTitle('Available Locations')
		.setDescription('The bot is in early access, expect more locations to be added.')

	for (const loc of allLocations) {
		locationsEmb.addField(loc.display, `Level Required: **${loc.requirements.level}**\nMax Players: **${loc.playerLimit}**\nRaid Time: **${formatTime(loc.raidLength * 1000)}**`)
	}

	return locationsEmb
}

function getRaidChoice (args: string[]): Location | undefined {
	for (const loc of allLocations) {
		if (args.join(' ').toLowerCase() === loc.display.toLowerCase()) {
			return loc
		}
	}
}
