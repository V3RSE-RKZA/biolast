import { SlashCreator, CommandContext, Message, ComponentButton, ComponentType, ButtonStyle } from 'slash-create'
import App from '../app'
import { Quest, quests } from '../resources/quests'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { ItemRow } from '../types/mysql'
import { addItemToStash, createItem } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addMoney, addXp, getUserRow } from '../utils/db/players'
import { createQuest, deleteQuest, getUserQuests } from '../utils/db/quests'
import { getUsersRaid } from '../utils/db/raids'
import formatNumber from '../utils/formatNumber'
import { getItemDisplay } from '../utils/itemUtils'
import { logger } from '../utils/logger'

class QuestsCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'quests',
			description: 'Track your quest progress. Accept and complete new quests.',
			longDescription: 'Track your quest progress. Once you finish a quest, use this command to accept the reward!',
			options: [],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			guildIDs: [],
			deferEphemeral: true
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const transaction = await beginTransaction()
		const isInRaid = await getUsersRaid(transaction.query, ctx.user.id)
		const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
		const userQuestRows = await getUserQuests(transaction.query, ctx.user.id, true)
		const userQuests = []

		// remove invalid quests
		for (let i = userQuestRows.length - 1; i >= 0; i--) {
			const quest = quests.find(q => q.id === userQuestRows[i].questId)

			if (!quest || userData.level > quest.maxLevel) {
				await deleteQuest(transaction.query, userQuestRows[i].id)

				userQuestRows.splice(i, 1)
			}
			else {
				userQuests.push(quest)
			}
		}

		// user has no quests active, assign a new random quest
		if (!userQuestRows.length) {
			const newQuest = this.fetchRandomQuest(userData.level)

			if (!newQuest) {
				await transaction.commit()
				throw new Error(`No eligilbe quest found for user (${ctx.user.id}, level ${userData.level})`)
			}

			const newQuestRow = await createQuest(transaction.query, ctx.user.id, newQuest)
			userQuestRows.push(newQuestRow)
			userQuests.push(newQuest)
		}

		await transaction.commit()

		const questButtons: ComponentButton[] = []
		let questsEmbed = new Embed()
			.setAuthor(`${ctx.user.username}#${ctx.user.discriminator}'s Quests`, ctx.user.avatarURL)
			.setDescription(isInRaid ? '❗ You cannot complete quests while in a raid!' : '⚠️ You have **24 hours** to complete a quest and claim it\'s reward before the quest expires.')

		for (let i = 0; i < userQuestRows.length; i++) {
			questsEmbed.addField(`__Quest #${userQuestRows[i].id}__`,
				`**Description**: ${this.getQuestDescription(userQuests[i])}\n**Progress**: ${userQuestRows[i].progress} / ${userQuestRows[i].progressGoal}\n` +
				`**Reward**: ${this.getRewardsString(userQuests[i])}`
			)

			questButtons.push(this.getQuestButton(userQuestRows[i].id, isInRaid ? true : userQuestRows[i].progress < userQuestRows[i].progressGoal))
		}

		const botMessage = await ctx.send({
			embeds: [questsEmbed.embed],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: questButtons
			}]
		}) as Message

		const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 30000)

		collector.on('collect', async buttonCtx => {
			try {
				const completedQuestID = parseInt(buttonCtx.customID)
				const completedTransaction = await beginTransaction()
				const completedUserData = (await getUserRow(completedTransaction.query, ctx.user.id, true))!
				const completedUserQuestRows = await getUserQuests(completedTransaction.query, ctx.user.id, true)
				const completedQuestRow = completedUserQuestRows.find(row => row.id === completedQuestID)
				const completedQuest = quests.find(q => q.id === completedQuestRow?.questId)
				const validUserQuests = []

				if (
					completedQuest &&
					completedUserData.level <= completedQuest.maxLevel &&
					completedQuestRow &&
					completedQuestRow.progress >= completedQuestRow.progressGoal &&
					!isInRaid
				) {
					// quest completed, assign a new random quest
					const newQuest = this.fetchRandomQuest(completedUserData.level, completedQuest.id)
					const newQuestButtons: ComponentButton[] = []
					let itemRewardRow

					// remove invalid and completed quests
					for (let i = completedUserQuestRows.length - 1; i >= 0; i--) {
						const quest = quests.find(q => q.id === completedUserQuestRows[i].questId)

						if (!quest || completedUserData.level > quest.maxLevel || completedUserQuestRows[i].id === completedQuestID) {
							await deleteQuest(completedTransaction.query, completedUserQuestRows[i].id)

							completedUserQuestRows.splice(i, 1)
						}
						else {
							validUserQuests.push(quest)
						}
					}

					if (completedQuest.rewards.item) {
						const itemRow = await createItem(completedTransaction.query, completedQuest.rewards.item.name, completedQuest.rewards.item.durability)
						await addItemToStash(completedTransaction.query, ctx.user.id, itemRow.id)

						itemRewardRow = itemRow
					}

					if (completedQuest.rewards.xp) {
						await addXp(completedTransaction.query, ctx.user.id, completedQuest.rewards.xp)
					}

					if (completedQuest.rewards.money) {
						await addMoney(completedTransaction.query, ctx.user.id, completedQuest.rewards.money)
					}

					questsEmbed = new Embed()
						.setAuthor(`${ctx.user.username}#${ctx.user.discriminator}'s Quests`, ctx.user.avatarURL)
						.setDescription('⚠️ You have **24 hours** to complete a quest and claim it\'s reward before the quest expires.')
						.addField(`__Quest #${completedQuestID}__`, '✅ Complete!')

					if (newQuest) {
						const newQuestRow = await createQuest(completedTransaction.query, ctx.user.id, newQuest)
						completedUserQuestRows.push(newQuestRow)
						validUserQuests.push(newQuest)
					}

					await completedTransaction.commit()

					if (!completedUserQuestRows.length) {
						questsEmbed.setDescription('⚠️ You are not eligible for any quests right now.')
					}

					for (let i = 0; i < completedUserQuestRows.length; i++) {
						questsEmbed.addField(`__Quest #${completedUserQuestRows[i].id}__`,
							`**Description**: ${this.getQuestDescription(validUserQuests[i])}\n**Progress**: ${completedUserQuestRows[i].progress} / ${completedUserQuestRows[i].progressGoal}\n` +
							`**Reward**: ${this.getRewardsString(validUserQuests[i])}`
						)

						newQuestButtons.push(this.getQuestButton(completedUserQuestRows[i].id, completedUserQuestRows[i].progress < completedUserQuestRows[i].progressGoal))
					}

					await buttonCtx.editParent({
						content: `Quest **#${completedQuestID}** complete, assigning new quest...`,
						embeds: [questsEmbed.embed],
						components: newQuestButtons.length ? [{
							type: ComponentType.ACTION_ROW,
							components: newQuestButtons
						}] : []
					})

					await ctx.send({
						content: `Quest **#${completedQuestID}** complete! You received ${this.getRewardsString(completedQuest, itemRewardRow)}.`
					})
				}
				else {
					await completedTransaction.commit()

					throw new Error('User not eligible to complete quest')
				}
			}
			catch (err) {
				logger.warn(err)

				await ctx.editOriginal({
					content: '❌ That quest cannot be completed (you may have leveled up and are no longer eligible or you are in a raid). Please re-run the command.',
					embeds: [questsEmbed.embed],
					components: []
				})
			}
		})

		collector.on('end', async msg => {
			try {
				if (msg === 'time') {
					await ctx.editOriginal({
						content: 'Quest buttons timed out.',
						embeds: [questsEmbed.embed],
						components: []
					})
				}
			}
			catch (err) {
				logger.error(err)
			}
		})
	}

	/**
	 * @param userLevel The users level
	 * @param exceptQuestID An optional quest ID to ignore IF POSSIBLE (if this quest is the only quest user is eligible for, they will still receive it)
	 * @returns A quest object
	 */
	fetchRandomQuest (userLevel: number, exceptQuestID?: string): Quest | undefined {
		const possibleQuests = quests.filter(q => userLevel >= q.minLevel && userLevel <= q.maxLevel)
		const filteredQuests = possibleQuests.filter(q => q.id !== exceptQuestID)

		if (exceptQuestID && filteredQuests.length) {
			return filteredQuests[Math.floor(Math.random() * filteredQuests.length)]
		}
		else if (possibleQuests.length) {
			return possibleQuests[Math.floor(Math.random() * possibleQuests.length)]
		}
	}

	getRewardsString (quest: Quest, itemRewardRow?: ItemRow): string {
		const display = []

		if (quest.rewards.money) {
			display.push(formatNumber(quest.rewards.money))
		}

		if (quest.rewards.xp) {
			display.push(`🌟 ${quest.rewards.xp} XP`)
		}

		if (quest.rewards.item) {
			display.push(`1x ${getItemDisplay(quest.rewards.item, itemRewardRow)}`)
		}

		if (display.length === 1) {
			return display[0]
		}
		else if (display.length === 2) {
			return `${display[0]} and ${display[1]}`
		}

		const last = display.pop()
		return `${display.join(', ')}, and ${last}`
	}

	getQuestDescription (quest: Quest): string {
		switch (quest.questType) {
			case 'Any Kills': {
				return `Kill **${quest.progressGoal}** players or mobs.`
			}
			case 'Player Kills': {
				return `Kill **${quest.progressGoal}** players.`
			}
			case 'Boss Kills': {
				return `Kill **${quest.progressGoal}** bosses.`
			}
			case 'NPC Kills': {
				return `Kill **${quest.progressGoal}** mobs (bosses count).`
			}
			case 'Evacs': {
				return `Successfully evac **${quest.progressGoal}** times.`
			}
			case 'Scavenge With A Key': {
				return `Scavenge an area using a ${getItemDisplay(quest.key)}.`
			}
		}
	}

	getQuestButton (questNumber: number, disabled: boolean): ComponentButton {
		return {
			type: ComponentType.BUTTON,
			label: `Complete Quest #${questNumber}`,
			style: disabled ? ButtonStyle.SECONDARY : ButtonStyle.SUCCESS,
			custom_id: questNumber.toString(),
			disabled
		}
	}
}

export default QuestsCommand
