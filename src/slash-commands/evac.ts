import { SlashCreator, CommandContext, Message } from 'slash-create'
import App from '../app'
import { icons, raidCooldown } from '../config'
import { allNPCs } from '../resources/npcs'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { clearCooldown, createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getNPC } from '../utils/db/npcs'
import { getUserRow, increaseDeaths } from '../utils/db/players'
import { getUserQuests, increaseProgress } from '../utils/db/quests'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { messageUser } from '../utils/messageUtils'
import { getRaidType } from '../utils/raidUtils'

class EvacCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'evac',
			description: 'Use this command in an evac channel to escape from a raid with the loot in your inventory.',
			longDescription: 'Use this command in an evac channel to escape from a raid with the loot in your inventory.',
			options: [],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,
			worksDuringDuel: true,

			// this is automatically populated with the ids of raid guilds since onlyWorksInRaidGuild is set to true
			guildIDs: []
		})

		this.filePath = __filename
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
		else if (!ctx.member) {
			throw new Error('Member not attached to interaction')
		}

		if (raidChannel.type !== 'EvacChannel') {
			await ctx.send({
				content: `${icons.warning} You can't evac from this channel. Look for an evac channel to escape this raid.`
			})
			return
		}

		const preTransaction = await beginTransaction()
		const userBackpack = await getUserBackpack(preTransaction.query, ctx.user.id, true)
		const userBackpackData = getItems(userBackpack)
		const evacNeeded = raidChannel.evac.requiresKey
		const evacItem = sortItemsByDurability(userBackpackData.items, true).reverse().find(i => i.item.name === evacNeeded?.name)
		const npcRow = await getNPC(preTransaction.query, ctx.channelID, true)
		const npc = allNPCs.find(n => n.id === npcRow?.id)

		if (evacNeeded && !evacItem) {
			await preTransaction.commit()

			await ctx.send({
				content: `${icons.information} Using this evac requires you to have a ${getItemDisplay(evacNeeded)} in your inventory.`
			})
			return
		}
		else if (npc) {
			const userData = (await getUserRow(preTransaction.query, ctx.user.id, true))!
			const attackResult = await this.app.npcHandler.attackPlayer(preTransaction.query, ctx.member, userData, userBackpack, npc, ctx.channelID, [], raidType)

			if (userData.health - attackResult.damage <= 0) {
				await increaseDeaths(preTransaction.query, ctx.user.id, 1)
			}

			await preTransaction.commit()

			await ctx.send({
				content: `${icons.danger} You try to evac but there was a threat roaming the area!`
			})

			setTimeout(async () => {
				try {
					await ctx.send({
						content: attackResult.messages.join('\n')
					})
				}
				catch (err) {
					logger.error(err)
				}
			}, 1000)

			if (userData.health - attackResult.damage <= 0) {
				// player died
				try {
					const member = await this.app.fetchMember(guild, ctx.user.id)
					this.app.clearRaidTimer(ctx.user.id)

					if (member) {
						await member.kick(`User was killed by NPC while trying to evac: ${npc.type} (${npc.display})`)
					}
				}
				catch (err) {
					logger.error(err)
				}

				const erisUser = await this.app.fetchUser(ctx.user.id)
				if (erisUser) {
					await messageUser(erisUser, {
						content: `${icons.danger} Raid failed!\n\n` +
							`You were killed by ${npc.type === 'boss' ? npc.display : `a ${npc.type}`} who hit you for **${attackResult.damage}** damage. Next time search the area before you evac.\n` +
							`You lost all the items in your inventory (**${userBackpackData.items.length - attackResult.removedItems}** items).`,
						embeds: attackResult.lootEmbed ? [attackResult.lootEmbed.embed] : undefined
					})
				}
			}

			return
		}

		await preTransaction.commit()

		const botMessage = await ctx.send({
			content: `Are you sure you want to evac here${evacItem ? ` using your ${getItemDisplay(evacItem.item, evacItem.row)}` : ''}?` +
				` The escape will take **${formatTime(raidChannel.evac.time * 1000)}**. Using this evac will also remove any PvP protection you have.`,
			components: CONFIRM_BUTTONS
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

			if (confirmed.customID === 'confirmed') {
				if (this.app.extractingUsers.has(ctx.user.id)) {
					await confirmed.editParent({
						content: `${icons.danger} You are currently evacuating this raid.`,
						components: []
					})
					return
				}

				this.app.extractingUsers.add(ctx.user.id)

				const transaction = await beginTransaction()

				if (evacItem) {
					const userBackpackVerified = await getUserBackpack(transaction.query, ctx.user.id, true)
					const userBackpackDataVerified = getItems(userBackpackVerified)

					// get the item with the highest durability and use it
					const evacItemVerified = sortItemsByDurability(userBackpackDataVerified.items, true).find(i => i.item.name === evacItem.item.name)

					if (!evacItemVerified) {
						await transaction.commit()

						await confirmed.editParent({
							content: `${icons.information} Using this evac requires you to have a ${getItemDisplay(evacItem.item)} in your inventory.`,
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
				}

				// check if user has PvP protection and remove it if they evac
				if (await getCooldown(transaction.query, ctx.user.id, 'attack-shield')) {
					await clearCooldown(transaction.query, ctx.user.id, 'attack-shield')
				}

				await transaction.commit()

				setTimeout(async () => {
					try {
						const member = await this.app.fetchMember(guild, ctx.user.id)

						if (member) {
							await ctx.send({
								content: `<@${member.id}>, ${icons.warning} **${formatTime((raidChannel.evac.time - (raidChannel.evac.time / 3)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						logger.error(err)
					}
				}, (raidChannel.evac.time / 3) * 1000)

				setTimeout(async () => {
					try {
						const member = await this.app.fetchMember(guild, ctx.user.id)

						if (member) {
							await ctx.send({
								content: `<@${member.id}>, ${icons.warning} **${formatTime((raidChannel.evac.time - ((raidChannel.evac.time / 3) * 2)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						logger.error(err)
					}
				}, ((raidChannel.evac.time / 3) * 2) * 1000)

				setTimeout(async () => {
					try {
						this.app.extractingUsers.delete(ctx.user.id)

						const member = await this.app.fetchMember(guild, ctx.user.id)
						const userRaid = await getUsersRaid(query, ctx.user.id)

						if (member && userRaid) {
							const evacTransaction = await beginTransaction()
							const userQuests = (await getUserQuests(evacTransaction.query, ctx.user.id, true)).filter(q => q.questType === 'Evacs')
							const userBackpackV = await getUserBackpack(evacTransaction.query, ctx.user.id)
							const userBackpackDataV = getItems(userBackpackV)

							// check if user had any evac quests
							for (const quest of userQuests) {
								if (quest.progress < quest.progressGoal) {
									await increaseProgress(evacTransaction.query, quest.id, 1)
								}
							}

							this.app.clearRaidTimer(ctx.user.id)
							await createCooldown(evacTransaction.query, ctx.user.id, `raid-${raidType.id}`, raidCooldown)
							await removeUserFromRaid(evacTransaction.query, ctx.user.id)

							await evacTransaction.commit()

							try {
								await member.kick('User evacuated')

								await messageUser(member.user, {
									content: `${icons.checkmark} **${raidType.display}** raid successful!\n\n` +
										`You spent a total of **${formatTime(Date.now() - userRaid.startedAt.getTime())}** in raid and managed to evac with **${userBackpackDataV.items.length}** items in your inventory.`
								})
							}
							catch (err) {
								logger.error(err)
							}
						}
					}
					catch (err) {
						logger.error(err)
					}
				}, raidChannel.evac.time * 1000)

				await confirmed.editParent({
					content: `${icons.checkmark} Escaping this raid in **${formatTime(raidChannel.evac.time * 1000)}**. Try not to die in that time.`,
					components: []
				})
			}
			else {
				await ctx.delete()
			}
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} Command timed out.`,
				components: []
			})
		}
	}
}

export default EvacCommand
