import { Command } from '../types/Commands'
import { messageUser, reply } from '../utils/messageUtils'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { getRaidType } from '../utils/raidUtils'
import { formatTime } from '../utils/db/cooldowns'
import { getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'
import { items } from '../resources/items'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'

const EXTRACTIONS = new Set()

export const command: Command = {
	name: 'extract',
	aliases: ['exfil'],
	examples: [],
	description: 'Use this command in an exfil channel to extract from a raid with the loot in your backpack.',
	shortDescription: 'Use this command to extract from a raid.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const raidType = getRaidType(message.channel.guild.id)
		if (!raidType) {
			// raid type not found?? this shouldn't happen so throw error
			throw new Error('Could not find raid type')
		}

		const raidChannel = raidType.channels.find(ch => ch.name === message.channel.name)
		if (!raidChannel) {
			// raid channel not found, was the channel not specified in the location?
			throw new Error('Could not find raid channel')
		}

		if (raidChannel.type !== 'ExtractChannel') {
			await reply(message, {
				content: '❌ You can\'t extract from this channel. Look for an exfil channel to extract from.'
			})
			return
		}

		const userBackpack = await getUserBackpack(query, message.author.id)
		const userBackpackData = getItems(userBackpack)
		const extractNeeded = items.find(i => i.name === raidChannel.extract.requiresKey)
		const extractItem = sortItemsByDurability(userBackpackData.items, true).find(i => i.item.name === extractNeeded?.name)

		if (extractNeeded && !extractItem) {
			await reply(message, {
				content: `❌ Extracting here requires you to have a ${getItemDisplay(extractNeeded)} in your backpack.`
			})
			return
		}

		const botMessage = await reply(message, {
			content: `Are you sure you want to extract here${extractItem ? ` using your ${getItemDisplay(extractItem.item, extractItem.row)}` : ''}? The extraction will take **${formatTime(raidChannel.extract.time * 1000)}**.`,
			components: CONFIRM_BUTTONS
		})

		try {
			const confirmed = (await app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === message.author.id))[0]

			if (confirmed.customID === 'confirmed') {
				if (EXTRACTIONS.has(message.author.id)) {
					await confirmed.editParent({
						content: '❌ You are currently extracting.',
						components: []
					})
					return
				}

				EXTRACTIONS.add(message.author.id)

				if (extractItem) {
					const transaction = await beginTransaction()
					const userBackpackVerified = await getUserBackpack(transaction.query, message.author.id, true)
					const userBackpackDataVerified = getItems(userBackpackVerified)

					// get the item with the highest durability and use it
					const extractItemVerified = sortItemsByDurability(userBackpackDataVerified.items, true).find(i => i.item.name === extractItem.item.name)

					if (!extractItemVerified) {
						await transaction.commit()

						await confirmed.editParent({
							content: `❌ Extracting here requires you to have a ${getItemDisplay(extractItem.item)} in your backpack.`,
							components: []
						})
						return
					}

					// lower durability or remove item if durability ran out
					if (!extractItemVerified.row.durability || extractItemVerified.row.durability - 1 <= 0) {
						await removeItemFromBackpack(transaction.query, extractItemVerified.row.id)
					}
					else {
						await lowerItemDurability(transaction.query, extractItemVerified.row.id, 1)
					}

					await transaction.commit()
				}

				setTimeout(async () => {
					try {
						const member = message.channel.guild.members.get(message.author.id)

						if (member) {
							await message.channel.createMessage({
								content: `<@${member.id}>, **${formatTime((raidChannel.extract.time - (raidChannel.extract.time / 3)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						console.error(err)
					}
				}, (raidChannel.extract.time / 3) * 1000)

				setTimeout(async () => {
					try {
						const member = message.channel.guild.members.get(message.author.id)

						if (member) {
							await message.channel.createMessage({
								content: `<@${member.id}>, **${formatTime((raidChannel.extract.time - ((raidChannel.extract.time / 3) * 2)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						console.error(err)
					}
				}, ((raidChannel.extract.time / 3) * 2) * 1000)

				setTimeout(async () => {
					try {
						const member = message.channel.guild.members.get(message.author.id)
						const activeRaid = app.activeRaids.find(raid => raid.userID === message.author.id)
						const userRaid = await getUsersRaid(query, message.author.id)

						if (member && activeRaid && userRaid) {
							const userBackpackV = await getUserBackpack(query, message.author.id)
							const userBackpackDataV = getItems(userBackpackV)

							clearTimeout(activeRaid.timeout)
							await removeUserFromRaid(query, message.author.id)

							try {
								await member.kick('User extracted')

								await messageUser(member.user, {
									content: `✅ **${raidType.display}** raid successful!\n\n` +
										`You spent a total of **${formatTime(Date.now() - userRaid.startedAt.getTime())}** in raid and managed to extract with **${userBackpackDataV.items.length}** items in your backpack.`
								})
							}
							catch (err) {
								console.error(err)
							}
						}
					}
					catch (err) {
						console.error(err)
					}
				}, raidChannel.extract.time * 1000)

				await confirmed.editParent({
					content: `✅ Extracting in **${formatTime(raidChannel.extract.time * 1000)}**. Try not to die in that time.`,
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
