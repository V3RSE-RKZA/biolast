import { SlashCreator, CommandContext, Message, ComponentButton, ComponentType, ButtonStyle, InteractionResponseFlags } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { Quest, quests } from '../resources/quests'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { BackpackItemRow, ItemRow, QuestRow } from '../types/mysql'
import { createCooldown, formatTime, getCooldownRow, getCooldownTimeLeft } from '../utils/db/cooldowns'
import { addItemToStash, createItem, deleteItem, getUserBackpack, getUserStash } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addMoney, addXp, getUserRow } from '../utils/db/players'
import { createQuest, deleteQuest, getUserQuests, increaseProgress } from '../utils/db/quests'
import { getUsersRaid } from '../utils/db/raids'
import { combineArrayWithAnd, formatNumber } from '../utils/stringUtils'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { allItems } from '../resources/items'

// how long a user should have to complete their quests before they receive a new one
const questCooldown = 24 * 60 * 60

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
		const questCDRow = await getCooldownRow(transaction.query, ctx.user.id, 'quest', true)
		const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
		const userQuestRows = await getUserQuests(transaction.query, ctx.user.id, true)
		const userBackpackRows = await getUserBackpack(transaction.query, ctx.user.id)
		const userStashRows = await getUserStash(transaction.query, ctx.user.id)
		const userQuests = []
		let questCDTimeLeft

		// remove invalid quests
		for (let i = userQuestRows.length - 1; i >= 0; i--) {
			const quest = quests.find(q => q.id === userQuestRows[i].questId)

			if (!questCDRow || !quest || userData.level > quest.maxLevel) {
				await deleteQuest(transaction.query, userQuestRows[i].id)

				userQuestRows.splice(i, 1)
			}
			else {
				// have to unshift because loop is running backwards
				userQuests.unshift(quest)
			}
		}

		// users quest cooldown has expired, assign a new random quest
		if (!questCDRow) {
			const newQuest = this.fetchRandomQuest(userData.level)

			if (!newQuest) {
				// this should not happen, there should always be a quest available for a user
				await transaction.commit()
				throw new Error(`No eligible quest found for user (${ctx.user.id}, level ${userData.level})`)
			}

			const newQuestRow = await createQuest(transaction.query, ctx.user.id, newQuest, this.getQuestXpReward(userData.level))
			userQuestRows.push(newQuestRow)
			userQuests.push(newQuest)
			questCDTimeLeft = questCooldown * 1000
			await createCooldown(transaction.query, ctx.user.id, 'quest', questCooldown)
		}
		else {
			questCDTimeLeft = getCooldownTimeLeft(questCDRow.length, questCDRow.createdAt.getTime())
		}

		await transaction.commit()

		const questButtons: ComponentButton[] = []
		let questsEmbed = new Embed()
			.setAuthor('Your Quests', ctx.user.avatarURL)
			.setDescription(isInRaid ? `${icons.danger} You cannot complete quests while in a raid!` : `${icons.warning} You have **${formatTime(questCDTimeLeft)}** to complete this quest.`)

		for (let i = 0; i < userQuestRows.length; i++) {
			questsEmbed.addField(`__Quest #${userQuestRows[i].id}__`, this.getQuestDescription(userQuests[i], userQuestRows[i]))

			questButtons.push(this.getQuestButton(userQuests[i], userQuestRows[i], isInRaid ? true : !this.questCanBeCompleted(userQuests[i], userQuestRows[i], userBackpackRows, userStashRows)))
		}

		if (!userQuestRows.length) {
			questsEmbed.setDescription(`${icons.information} You've completed all of your quests! You will receive a new one in **${formatTime(questCDTimeLeft)}**.`)
		}

		const botMessage = await ctx.send({
			embeds: [questsEmbed.embed],
			components: questButtons.length ? [{
				type: ComponentType.ACTION_ROW,
				components: questButtons
			}] : []
		}) as Message

		const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 30000)

		collector.on('collect', async buttonCtx => {
			try {
				const completedQuestID = parseInt(buttonCtx.customID)
				const completedTransaction = await beginTransaction()
				const completedQuestCDRow = await getCooldownRow(completedTransaction.query, ctx.user.id, 'quest', true)
				const completedUserData = (await getUserRow(completedTransaction.query, ctx.user.id, true))!
				const completedUserQuestRows = await getUserQuests(completedTransaction.query, ctx.user.id, true)
				const completedQuestRow = completedUserQuestRows.find(row => row.id === completedQuestID)
				const completedQuest = quests.find(q => q.id === completedQuestRow?.questId)
				const completedUserBackpackRows = await getUserBackpack(completedTransaction.query, ctx.user.id, true)
				const completedUserStashRows = await getUserStash(completedTransaction.query, ctx.user.id, true)
				const validUserQuests = []

				if (
					!isInRaid &&
					completedQuestCDRow &&
					completedQuest &&
					completedUserData.level <= completedQuest.maxLevel &&
					completedQuestRow &&
					this.questCanBeCompleted(completedQuest, completedQuestRow, completedUserBackpackRows, completedUserStashRows)
				) {
					const newQuestButtons: ComponentButton[] = []
					const completedQuestCDTimeLeft = getCooldownTimeLeft(completedQuestCDRow.length, completedQuestCDRow.createdAt.getTime())

					if (
						completedQuest.questType === 'Retrieve Item' &&
						completedQuestRow.progress < completedQuestRow.progressGoal &&
						completedQuestCDRow
					) {
						const userBackpack = getItems(completedUserBackpackRows)
						const userStash = getItems(completedUserStashRows)
						const questItemToRemove = userBackpack.items.find(itm => itm.item.name === completedQuest.item.name) || userStash.items.find(itm => itm.item.name === completedQuest.item.name)

						if (!questItemToRemove) {
							await completedTransaction.commit()
							throw new Error('User not eligible to complete quest')
						}

						await increaseProgress(completedTransaction.query, completedQuestRow.id, 1)
						await deleteItem(completedTransaction.query, questItemToRemove.row.id)

						// remove invalid quests and add progress to retrieve item quest
						for (let i = completedUserQuestRows.length - 1; i >= 0; i--) {
							const quest = quests.find(q => q.id === completedUserQuestRows[i].questId)

							if (!quest || completedUserData.level > quest.maxLevel) {
								await deleteQuest(completedTransaction.query, completedUserQuestRows[i].id)

								completedUserQuestRows.splice(i, 1)
							}
							else if (completedUserQuestRows[i].id === completedQuestID) {
								completedUserQuestRows[i].progress += 1
								validUserQuests.unshift(quest)
							}
							else {
								validUserQuests.unshift(quest)
							}
						}

						questsEmbed = new Embed()
							.setAuthor('Your Quests', ctx.user.avatarURL)
							.setDescription(`${icons.warning} You have **${formatTime(completedQuestCDTimeLeft)}** to complete this quest.`)

						await completedTransaction.commit()

						for (let i = 0; i < completedUserQuestRows.length; i++) {
							questsEmbed.addField(`__Quest #${completedUserQuestRows[i].id}__`, this.getQuestDescription(validUserQuests[i], completedUserQuestRows[i]))

							newQuestButtons.push(this.getQuestButton(
								validUserQuests[i],
								completedUserQuestRows[i],
								!this.questCanBeCompleted(validUserQuests[i], completedUserQuestRows[i], completedUserBackpackRows.filter(r => r.id !== questItemToRemove.row.id), completedUserStashRows.filter(r => r.id !== questItemToRemove.row.id))
							))
						}

						await buttonCtx.editParent({
							content: `${icons.checkmark} Successfully turned in ${getItemDisplay(questItemToRemove.item, questItemToRemove.row, { showDurability: false, showEquipped: false })} for quest **#${completedQuestID}**.`,
							embeds: [questsEmbed.embed],
							components: newQuestButtons.length ? [{
								type: ComponentType.ACTION_ROW,
								components: newQuestButtons
							}] : []
						})
					}
					else {
						const rewardItem = allItems.find(i => i.name === completedQuestRow.itemReward)
						let itemRewardRow

						if (rewardItem) {
							const stashRows = await getUserStash(completedTransaction.query, ctx.user.id, true)
							const userStashData = getItems(stashRows)

							if (userStashData.slotsUsed + rewardItem.slotsUsed > userData.stashSlots) {
								await completedTransaction.commit()

								await ctx.send({
									content: `${icons.cancel} You don't have enough space in your stash to complete that quest. You need **${rewardItem.slotsUsed}** open slots in your stash. Sell items to clear up some space.`,
									flags: InteractionResponseFlags.EPHEMERAL
								})
								return
							}

							// user has enough space in stash for reward
							const itemRow = await createItem(completedTransaction.query, rewardItem.name, { durability: rewardItem.durability })
							await addItemToStash(completedTransaction.query, ctx.user.id, itemRow.id)

							itemRewardRow = itemRow
						}

						if (completedQuestRow.xpReward) {
							await addXp(completedTransaction.query, ctx.user.id, completedQuestRow.xpReward)
						}

						if (completedQuestRow.moneyReward) {
							await addMoney(completedTransaction.query, ctx.user.id, completedQuestRow.moneyReward)
						}

						// remove invalid and completed quests
						for (let i = completedUserQuestRows.length - 1; i >= 0; i--) {
							const quest = quests.find(q => q.id === completedUserQuestRows[i].questId)

							if (!quest || completedUserData.level > quest.maxLevel || completedUserQuestRows[i].id === completedQuestID) {
								await deleteQuest(completedTransaction.query, completedUserQuestRows[i].id)

								completedUserQuestRows.splice(i, 1)
							}
							else {
								validUserQuests.unshift(quest)
							}
						}

						questsEmbed = new Embed()
							.setAuthor('Your Quests', ctx.user.avatarURL)
							.setDescription(`${icons.warning} You have **${formatTime(completedQuestCDTimeLeft)}** to complete this quest.`)
							.addField(`__Quest #${completedQuestID}__`, 'Complete!')

						await completedTransaction.commit()

						if (!completedUserQuestRows.length) {
							questsEmbed.setDescription(`${icons.information} You've completed all of your quests! You will receive a new one in **${formatTime(completedQuestCDTimeLeft)}**.`)
						}

						for (let i = 0; i < completedUserQuestRows.length; i++) {
							questsEmbed.addField(`__Quest #${completedUserQuestRows[i].id}__`, this.getQuestDescription(validUserQuests[i], completedUserQuestRows[i]))

							newQuestButtons.push(this.getQuestButton(validUserQuests[i], completedUserQuestRows[i], !this.questCanBeCompleted(validUserQuests[i], completedUserQuestRows[i], completedUserBackpackRows, completedUserStashRows)))
						}

						await buttonCtx.editParent({
							content: `Quest **#${completedQuestID}** completed.`,
							embeds: [questsEmbed.embed],
							components: newQuestButtons.length ? [{
								type: ComponentType.ACTION_ROW,
								components: newQuestButtons
							}] : []
						})

						await ctx.send({
							content: `${icons.checkmark} Quest **#${completedQuestID}** complete! You received ${this.getRewardsString(completedQuestRow, itemRewardRow)}. Item rewards are added to your **stash**.`,
							flags: InteractionResponseFlags.EPHEMERAL
						})
					}
				}
				else {
					await completedTransaction.commit()
					stopCollector()
					throw new Error('User not eligible to complete quest')
				}
			}
			catch (err) {
				logger.warn(err)

				await ctx.editOriginal({
					content: `${icons.cancel} That quest cannot be completed (you may have leveled up and are no longer eligible or you are in a raid). Please re-run the command.`,
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

	getRewardsString (questRow: QuestRow, itemRewardRow?: ItemRow): string {
		const display = []
		const rewardItem = allItems.find(i => i.name === questRow.itemReward)

		if (questRow.moneyReward) {
			display.push(formatNumber(questRow.moneyReward))
		}

		if (questRow.xpReward) {
			display.push(`🌟 ${questRow.xpReward} XP`)
		}

		if (rewardItem) {
			display.push(`1x ${getItemDisplay(rewardItem, itemRewardRow)}`)
		}

		return combineArrayWithAnd(display)
	}

	getQuestDescription (quest: Quest, questRow: QuestRow): string {
		switch (quest.questType) {
			case 'Any Kills': {
				return `**Description**: Kill **${quest.progressGoal}** players or mobs.\n` +
					`**Progress**: ${questRow.progress} / ${questRow.progressGoal}\n` +
					`**Reward**: ${this.getRewardsString(questRow)}`
			}
			case 'Player Kills': {
				return `**Description**: Kill **${quest.progressGoal}** players.\n` +
					`**Progress**: ${questRow.progress} / ${questRow.progressGoal}\n` +
					`**Reward**: ${this.getRewardsString(questRow)}`
			}
			case 'Boss Kills': {
				return `**Description**: Kill **${quest.progressGoal}** bosses.\n` +
					`**Progress**: ${questRow.progress} / ${questRow.progressGoal}\n` +
					`**Reward**: ${this.getRewardsString(questRow)}`
			}
			case 'NPC Kills': {
				return `**Description**: Kill **${quest.progressGoal}** mobs (bosses count).\n` +
					`**Progress**: ${questRow.progress} / ${questRow.progressGoal}\n` +
					`**Reward**: ${this.getRewardsString(questRow)}`
			}
			case 'Evacs': {
				return `**Description**: Successfully evac **${quest.progressGoal}** times.\n` +
					`**Progress**: ${questRow.progress} / ${questRow.progressGoal}\n` +
					`**Reward**: ${this.getRewardsString(questRow)}`
			}
			case 'Scavenge With A Key': {
				return `**Description**: Scavenge an area using a ${getItemDisplay(quest.key)}.\n` +
					`**Progress**: ${questRow.progress} / ${questRow.progressGoal}\n` +
					`**Reward**: ${this.getRewardsString(questRow)}`
			}
			case 'Retrieve Item': {
				return `**Description**: Find and turn in ${questRow.progressGoal}x ${getItemDisplay(quest.item)}.\n` +
					`**Progress**: ${questRow.progress} / ${questRow.progressGoal} items\n` +
					`**Reward**: ${this.getRewardsString(questRow)}`
			}
		}
	}

	getQuestButton (quest: Quest, questRow: QuestRow, disabled: boolean): ComponentButton {
		if (quest.questType === 'Retrieve Item' && questRow.progress < questRow.progressGoal) {
			const iconID = quest.item.icon.match(/:([0-9]*)>/)

			return {
				type: ComponentType.BUTTON,
				label: `Quest #${questRow.id} - Turn in 1x ${quest.item.name}`,
				emoji: iconID ? {
					id: iconID[1]
				} : undefined,
				style: ButtonStyle.SECONDARY,
				custom_id: questRow.id.toString(),
				disabled
			}
		}

		return {
			type: ComponentType.BUTTON,
			label: `Complete Quest #${questRow.id}`,
			style: disabled ? ButtonStyle.SECONDARY : ButtonStyle.SUCCESS,
			custom_id: questRow.id.toString(),
			disabled
		}
	}

	questCanBeCompleted (quest: Quest, questRow: QuestRow, backpackRows: BackpackItemRow[], stashRows: ItemRow[]): boolean {
		if (questRow.progress >= questRow.progressGoal) {
			return true
		}
		else if (quest.questType === 'Retrieve Item') {
			const backpack = getItems(backpackRows)
			const stash = getItems(stashRows)

			if (backpack.items.find(itm => itm.item.name === quest.item.name)) {
				return true
			}
			else if (stash.items.find(itm => itm.item.name === quest.item.name)) {
				return true
			}
		}

		return false
	}

	/**
	 * @param playerLevel The players current level
	 * @returns The amount of XP user should receive for completing quest
	 */
	getQuestXpReward (playerLevel: number): number {
		switch (playerLevel) {
			case 1: return 100
			case 2: return 250
			case 3: return 400
			case 4: return 500
			case 5: return 900
			case 6: return 1000
			case 7: return 1250
			case 8: return 2000
			case 9: return 2500
			case 10: return 2800
			default: return 3000
		}
	}
}

export default QuestsCommand
