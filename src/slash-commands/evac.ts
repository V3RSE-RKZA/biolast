import { SlashCreator, CommandContext, Message } from 'slash-create'
import App from '../app'
import { allNPCs } from '../resources/npcs'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { formatTime } from '../utils/db/cooldowns'
import { getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getNPC } from '../utils/db/npcs'
import { getUserRow } from '../utils/db/players'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'
import { messageUser } from '../utils/messageUtils'
import { getRaidType } from '../utils/raidUtils'

class EvacCommand extends CustomSlashCommand {
	/**
	 * IDs of users currently extracting
	 */
	extractions: Set<string>

	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'evac',
			description: 'Use this command in an evac channel to escape from a raid with the loot in your inventory.',
			options: [],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,

			// this is automatically populated with the ids of raid guilds since onlyWorksInRaidGuild is set to true
			guildIDs: []
		})

		this.filePath = __filename
		this.extractions = new Set()
	}

	async run (ctx: CommandContext): Promise<void> {
		const raidType = getRaidType(ctx.guildID as string)
		if (!raidType) {
			// raid type not found?? this shouldn't happen so throw error
			throw new Error('Could not find raid type')
		}
		const guild = this.app.bot.guilds.get(ctx.guildID as string)
		if (!guild) {
			throw new Error('Guild not found in Eris cache')
		}
		const raidChannel = raidType.channels.find(ch => ch.name === guild.channels.get(ctx.channelID)?.name)
		if (!raidChannel) {
			// raid channel not found, was the channel not specified in the location?
			throw new Error('Could not find raid channel')
		}

		if (raidChannel.type !== 'EvacChannel') {
			await ctx.send({
				content: '❌ You can\'t evac from this channel. Look for an evac channel to escape this raid.'
			})
			return
		}

		const preTransaction = await beginTransaction()
		const userBackpack = await getUserBackpack(preTransaction.query, ctx.user.id, true)
		const userBackpackData = getItems(userBackpack)
		const evacNeeded = raidChannel.evac.requiresKey
		const evacItem = sortItemsByDurability(userBackpackData.items, true).find(i => i.item.name === evacNeeded?.name)
		const npcRow = await getNPC(preTransaction.query, ctx.channelID, true)
		const npc = allNPCs.find(n => n.id === npcRow?.id)

		if (evacNeeded && !evacItem) {
			await preTransaction.commit()

			await ctx.send({
				content: `❌ Using this evac requires you to have a ${getItemDisplay(evacNeeded)} in your inventory.`
			})
			return
		}
		else if (npc) {
			const userData = (await getUserRow(preTransaction.query, ctx.user.id, true))!
			const attackResult = await this.app.npcHandler.attackPlayer(preTransaction.query, ctx.user, userData, userBackpack, npc, ctx.channelID, [])
			await preTransaction.commit()

			await ctx.send({
				content: 'You try to evac but there was a threat roaming the area!'
			})

			setTimeout(async () => {
				try {
					await ctx.send({
						content: attackResult.messages.join('\n')
					})
				}
				catch (err) {
					console.error(err)
				}
			}, 1000)

			if (userData.health - attackResult.damage <= 0) {
				// player died
				try {
					const member = await this.app.fetchMember(guild, ctx.user.id)

					if (member) {
						await member.kick(`User was killed by NPC while trying to evac: ${npc.type} (${npc.display})`)
					}
				}
				catch (err) {
					console.error(err)
				}

				const erisUser = await this.app.fetchUser(ctx.user.id)
				if (erisUser) {
					await messageUser(erisUser, {
						content: '❌ Raid failed!\n\n' +
							`You were killed by a \`${npc.type}\` who hit you for **${attackResult.damage}** damage. Next time search the area before you evac.\n` +
							`You lost all the items in your inventory (**${userBackpackData.items.length - attackResult.removedItems}** items).`
					})
				}
			}

			return
		}

		await preTransaction.commit()

		const botMessage = await ctx.send({
			content: `Are you sure you want to evac here${evacItem ? ` using your ${getItemDisplay(evacItem.item, evacItem.row)}` : ''}? The escape will take **${formatTime(raidChannel.evac.time * 1000)}**.`,
			components: CONFIRM_BUTTONS
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

			if (confirmed.customID === 'confirmed') {
				if (this.extractions.has(ctx.user.id)) {
					await confirmed.editParent({
						content: '❌ You are currently evacuating this raid.',
						components: []
					})
					return
				}

				this.extractions.add(ctx.user.id)

				if (evacItem) {
					const transaction = await beginTransaction()
					const userBackpackVerified = await getUserBackpack(transaction.query, ctx.user.id, true)
					const userBackpackDataVerified = getItems(userBackpackVerified)

					// get the item with the highest durability and use it
					const evacItemVerified = sortItemsByDurability(userBackpackDataVerified.items, true).find(i => i.item.name === evacItem.item.name)

					if (!evacItemVerified) {
						await transaction.commit()

						await confirmed.editParent({
							content: `❌ Using this evac requires you to have a ${getItemDisplay(evacItem.item)} in your inventory.`,
							components: []
						})
						return
					}

					// lower durability or remove item if durability ran out
					if (!evacItemVerified.row.durability || evacItemVerified.row.durability - 1 <= 0) {
						await removeItemFromBackpack(transaction.query, evacItemVerified.row.id)
					}
					else {
						await lowerItemDurability(transaction.query, evacItemVerified.row.id, 1)
					}

					await transaction.commit()
				}

				setTimeout(async () => {
					try {
						const member = await this.app.fetchMember(guild, ctx.user.id)

						if (member) {
							await ctx.send({
								content: `<@${member.id}>, **${formatTime((raidChannel.evac.time - (raidChannel.evac.time / 3)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						console.error(err)
					}
				}, (raidChannel.evac.time / 3) * 1000)

				setTimeout(async () => {
					try {
						const member = await this.app.fetchMember(guild, ctx.user.id)

						if (member) {
							await ctx.send({
								content: `<@${member.id}>, **${formatTime((raidChannel.evac.time - ((raidChannel.evac.time / 3) * 2)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						console.error(err)
					}
				}, ((raidChannel.evac.time / 3) * 2) * 1000)

				setTimeout(async () => {
					try {
						this.extractions.delete(ctx.user.id)

						const member = await this.app.fetchMember(guild, ctx.user.id)
						const activeRaid = this.app.activeRaids.find(raid => raid.userID === ctx.user.id)
						const userRaid = await getUsersRaid(query, ctx.user.id)

						if (member && activeRaid && userRaid) {
							const userBackpackV = await getUserBackpack(query, ctx.user.id)
							const userBackpackDataV = getItems(userBackpackV)

							clearTimeout(activeRaid.timeout)
							await removeUserFromRaid(query, ctx.user.id)

							try {
								await member.kick('User evacuated')

								await messageUser(member.user, {
									content: `✅ **${raidType.display}** raid successful!\n\n` +
										`You spent a total of **${formatTime(Date.now() - userRaid.startedAt.getTime())}** in raid and managed to evac with **${userBackpackDataV.items.length}** items in your inventory.`
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
				}, raidChannel.evac.time * 1000)

				await confirmed.editParent({
					content: `✅ Escaping this raid in **${formatTime(raidChannel.evac.time * 1000)}**. Try not to die in that time.`,
					components: []
				})
			}
			else {
				await ctx.delete()
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

export default EvacCommand
