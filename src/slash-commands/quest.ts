import { SlashCreator, CommandContext, Message, ComponentButton, ComponentType, ButtonStyle } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { allQuests, sideQuests } from '../resources/quests'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { BackpackItemRow, ItemRow, QuestRow } from '../types/mysql'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'
import { addItemToBackpack, createItem, deleteItem, getUserBackpack, getUserStash } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { addMoney, addXp, getUserRow, increaseQuestsCompleted } from '../utils/db/players'
import { createQuest, deleteQuest, getUserQuest, increaseProgress } from '../utils/db/quests'
import { formatMoney, formatNumber, formatRedBar } from '../utils/stringUtils'
import { backpackHasSpace, getItemDisplay, getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { SideQuest, RegionQuest } from '../types/Quests'
import { disableAllComponents } from '../utils/messageUtils'
import { allLocations } from '../resources/locations'
import { GREEN_BUTTON, RED_BUTTON } from '../utils/constants'
import { allItems, items } from '../resources/items'
import getRandomInt from '../utils/randomInt'
import { LocationLevel } from '../types/Locations'
import { Item } from '../types/Items'

// how long before user can accept a new quest
const questCooldown = 60 * 60
const cancelID = icons.cancel.match(/:([0-9]*)>/)
const abandonButton: ComponentButton = {
	type: ComponentType.BUTTON,
	label: 'Abandon Quest',
	custom_id: 'abandon',
	style: ButtonStyle.SECONDARY,
	emoji: cancelID ? {
		name: 'Cancel',
		id: cancelID[1]
	} : undefined
}

class QuestCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'quest',
			description: 'Track your quest progress. Accept and complete new quests.',
			longDescription: 'Track your quest progress. Once you finish a quest, use this command to accept the reward!',
			options: [],
			category: 'scavenging',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const preTransaction = await beginTransaction()
		const preQuestCD = await getCooldown(preTransaction.query, ctx.user.id, 'quest', true)
		const preUserData = (await getUserRow(preTransaction.query, ctx.user.id, true))!
		const preUserBackpackRows = await getUserBackpack(preTransaction.query, ctx.user.id, true)
		const preUserStashRows = await getUserStash(preTransaction.query, ctx.user.id, true)
		let userQuestRow = await getUserQuest(preTransaction.query, ctx.user.id, true)
		let userQuest = allQuests.find(q => q.id === userQuestRow?.questId)
		let questMessage
		let questButton: ComponentButton
		let questEmbed: Embed

		if (!userQuestRow || !userQuest) {
			// quest was removed from resources
			if (userQuestRow) {
				userQuestRow = undefined

				await deleteQuest(preTransaction.query, ctx.user.id)
			}

			if (preQuestCD) {
				await preTransaction.commit()

				const cdEmbed = new Embed()
					.setDescription(`You cannot accept a new quest for **${preQuestCD}**.`)

				await ctx.send({
					embeds: [cdEmbed.embed]
				})
				return
			}

			await createCooldown(preTransaction.query, ctx.user.id, 'quest', 15 * 60)
			await preTransaction.commit()

			// quest prompt
			const userRegionQuests = allLocations.filter(l => l.locationLevel === preUserData.locationLevel).map(l => l.quests).flat(1)
			const assignedQuest = this.fetchRandomQuest(userRegionQuests)
			const xpReward = this.getQuestXpReward(preUserData.level)
			const moneyReward = assignedQuest.type === 'Region' && Math.random() < 0.75 ? this.getQuestMoneyReward(preUserData.locationLevel) : undefined
			const itemReward = assignedQuest.type === 'Region' && Math.random() < 0.5 ? this.getQuestItemReward(preUserData.locationLevel) : undefined
			const rewardsDisplay = [`🌟 ${formatNumber(xpReward)} XP`]

			if (moneyReward) {
				rewardsDisplay.push(formatMoney(moneyReward))
			}
			if (itemReward) {
				rewardsDisplay.push(`1x ${getItemDisplay(itemReward)}`)
			}

			const promptEmbed = new Embed()
				.setDescription(this.getQuestObjective(assignedQuest))
				.addField('__Reward__', `${rewardsDisplay.join('\n')}`, true)

			questMessage = await ctx.send({
				content: '**Do you accept this quest?** If you decline, you will have to wait **15 minutes** before you can accept another.',
				embeds: [promptEmbed.embed],
				components: [{
					type: ComponentType.ACTION_ROW,
					components: [GREEN_BUTTON('Accept', 'accept'), RED_BUTTON('Decline', 'decline')]
				}]
			}) as Message

			try {
				const accepted = (await this.app.componentCollector.awaitClicks(questMessage.id, i => i.user.id === ctx.user.id, 30000))[0]

				if (accepted.customID !== 'accept') {
					await accepted.editParent({
						content: '**You have declined this quest.** You will not be able to accept another quest for **15 minutes**.',
						components: []
					})
					return
				}

				const transaction = await beginTransaction()
				userQuestRow = await getUserQuest(transaction.query, ctx.user.id, true)
				userQuest = allQuests.find(q => q.id === userQuestRow?.questId)

				if (userQuestRow && userQuest) {
					await transaction.commit()

					await accepted.editParent({
						content: `${icons.danger} You have already accepted a quest.`,
						components: []
					})
				}
				else {
					userQuestRow = await createQuest(
						transaction.query,
						ctx.user.id,
						assignedQuest,
						xpReward,
						itemReward,
						moneyReward
					)
					await transaction.commit()

					userQuest = assignedQuest
					questButton = this.getQuestButton(
						userQuest,
						userQuestRow,
						!this.questCanBeCompleted(userQuest, userQuestRow, preUserBackpackRows, preUserStashRows)
					)
					questEmbed = new Embed()
						.setDescription(this.getQuestObjective(userQuest))
						.addField('__Reward__', `${this.getRewardsString(userQuestRow)}`, true)
						.addField('__Progress__', this.getQuestProgress(userQuestRow))
						.setFooter('You will receive a 1 hour cooldown from accepting quests if you abandon this quest.')

					await accepted.editParent({
						content: `${icons.checkmark} Quest accepted!`,
						embeds: [questEmbed.embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [questButton, abandonButton]
						}]
					})
				}
			}
			catch (err) {
				await questMessage.edit({
					content: '**You ran out of time to accept this quest.** You will not be able to accept another quest for **15 minutes**.',
					components: disableAllComponents(questMessage.components)
				})
				return
			}
		}
		else {
			await preTransaction.commit()
		}

		if (!questMessage) {
			questEmbed = new Embed()
				.setDescription(this.getQuestObjective(userQuest))
				.addField('__Reward__', `${this.getRewardsString(userQuestRow)}`, true)
				.addField('__Progress__', this.getQuestProgress(userQuestRow))
				.setFooter('You will receive a 1 hour cooldown from accepting quests if you abandon this quest.')
			questButton = this.getQuestButton(
				userQuest,
				userQuestRow,
				!this.questCanBeCompleted(userQuest, userQuestRow, preUserBackpackRows, preUserStashRows)
			)

			questMessage = await ctx.send({
				embeds: [questEmbed.embed],
				components: [{
					type: ComponentType.ACTION_ROW,
					components: [questButton, abandonButton]
				}]
			}) as Message
		}

		const { collector, stopCollector } = this.app.componentCollector.createCollector(questMessage.id, c => c.user.id === ctx.user.id, 40000)
		const fixedQuest = userQuest
		let fixedQuestRow = userQuestRow

		collector.on('collect', async buttonCtx => {
			try {
				await buttonCtx.acknowledge()

				const transaction = await beginTransaction()
				const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
				const userQuestRowV = await getUserQuest(transaction.query, ctx.user.id, true)
				const userBackpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
				const userStashRows = await getUserStash(transaction.query, ctx.user.id, true)

				if (!userQuestRowV || userQuestRowV.questId !== fixedQuestRow.questId) {
					await transaction.commit()
					stopCollector()

					await buttonCtx.editParent({
						content: `${icons.danger} This quest has expired. Please re-run the command.`,
						components: [],
						embeds: []
					})
				}
				else if (userData.fighting) {
					await transaction.commit()
					stopCollector()

					await buttonCtx.editParent({
						content: `${icons.danger} You cannot complete or abandon quests while in a duel.`,
						components: [],
						embeds: []
					})
				}
				else if (buttonCtx.customID === 'abandon') {
					const questCD = await getCooldown(transaction.query, ctx.user.id, 'quest', true)

					if (!questCD) {
						await createCooldown(transaction.query, ctx.user.id, 'quest', questCooldown)
					}

					await deleteQuest(transaction.query, ctx.user.id)
					await transaction.commit()
					stopCollector()

					await buttonCtx.editParent({
						content: `${icons.checkmark} **You have abandoned this quest.** You will not be able to accept a new quest for **${questCD || '1 hour'}**.`,
						components: []
					})
				}
				else if (buttonCtx.customID === 'turn in' && fixedQuest.questType === 'Retrieve Item') {
					const userBackpack = getItems(userBackpackRows)
					const userStash = getItems(userStashRows)
					const questItemToRemove = userBackpack.items.find(itm => itm.item.name === fixedQuest.item.name) || userStash.items.find(itm => itm.item.name === fixedQuest.item.name)

					if (!questItemToRemove) {
						await transaction.commit()

						questButton = this.getQuestButton(
							fixedQuest,
							fixedQuestRow,
							userData.fighting ?
								true :
								!this.questCanBeCompleted(fixedQuest, fixedQuestRow, userBackpackRows, userStashRows)
						)

						await buttonCtx.send({
							content: `${icons.danger} You don't have a ${getItemDisplay(fixedQuest.item)} in your inventory or stash to turn in.`,
							ephemeral: true
						})
						return
					}

					await increaseProgress(transaction.query, ctx.user.id, 1)
					await deleteItem(transaction.query, questItemToRemove.row.id)
					await transaction.commit()

					fixedQuestRow = { ...fixedQuestRow, progress: fixedQuestRow.progress + 1 }

					questEmbed = new Embed()
						.setDescription(this.getQuestObjective(fixedQuest))
						.addField('__Reward__', `${this.getRewardsString(fixedQuestRow)}`)
						.addField('__Progress__', this.getQuestProgress(fixedQuestRow))
						.setFooter('You will receive a 1 hour cooldown from accepting quests if you abandon this quest.')
					questButton = this.getQuestButton(
						fixedQuest,
						fixedQuestRow,
						userData.fighting ?
							true :
							!this.questCanBeCompleted(fixedQuest, fixedQuestRow, userBackpackRows.filter(r => r.id !== questItemToRemove.row.id), userStashRows.filter(r => r.id !== questItemToRemove.row.id))
					)

					questMessage = await buttonCtx.editParent({
						content: `${icons.checkmark} Turned in ${getItemDisplay(questItemToRemove.item, questItemToRemove.row, { showDurability: false, showEquipped: false })}.`,
						embeds: [questEmbed.embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [questButton, abandonButton]
						}]
					}) as Message
				}
				else if (!this.questCanBeCompleted(fixedQuest, fixedQuestRow, userBackpackRows, userStashRows)) {
					await transaction.commit()
					stopCollector()

					questButton = this.getQuestButton(
						fixedQuest,
						fixedQuestRow,
						userData.fighting ?
							true :
							!this.questCanBeCompleted(fixedQuest, fixedQuestRow, userBackpackRows, userStashRows)
					)

					await buttonCtx.editParent({
						content: `${icons.danger} You cannot complete this quest.`,
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [questButton, abandonButton]
						}]
					})
				}
				else if (buttonCtx.customID === 'complete') {
					const rewardItem = allItems.find(i => i.name === fixedQuestRow.itemReward)
					let itemReward

					if (rewardItem) {
						if (!backpackHasSpace(userBackpackRows, rewardItem.slotsUsed)) {
							await transaction.commit()

							await ctx.send({
								content: `${icons.cancel} You don't have enough space in your inventory to claim the reward for that quest. You need **${rewardItem.slotsUsed}** open slots in your inventory.` +
									'\n\nSell items to clear up some space.',
								ephemeral: true
							})
							return
						}

						const itemRow = await createItem(transaction.query, rewardItem.name, { durability: rewardItem.durability })
						await addItemToBackpack(transaction.query, ctx.user.id, itemRow.id)

						itemReward = itemRow
					}

					if (fixedQuestRow.moneyReward) {
						await addMoney(transaction.query, ctx.user.id, fixedQuestRow.moneyReward)
					}

					await addXp(transaction.query, ctx.user.id, fixedQuestRow.xpReward)
					await increaseQuestsCompleted(transaction.query, ctx.user.id, 1)
					await deleteQuest(transaction.query, ctx.user.id)
					await transaction.commit()
					stopCollector()

					await buttonCtx.editParent({
						content: `${icons.checkmark} **Quest complete!** You received:\n\n${this.getRewardsString(fixedQuestRow, itemReward)}.` +
							`${itemReward ? '\n\nItem rewards can be found in your **inventory**.' : ''}`,
						components: [],
						embeds: []
					})
				}
				else {
					await transaction.commit()

					await buttonCtx.send({
						content: `${icons.danger} There was an error completing your quest! Try again later? idk`,
						ephemeral: true
					})
				}
			}
			catch (err) {
				logger.warn(err)
			}
		})

		collector.on('end', async msg => {
			try {
				if (msg === 'time') {
					await ctx.editOriginal({
						content: 'Quest buttons timed out.',
						embeds: [questEmbed.embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components: disableAllComponents([questButton, abandonButton])
						}]
					})
				}
			}
			catch (err) {
				logger.error(err)
			}
		})
	}

	fetchRandomQuest (regionQuests: RegionQuest[]): RegionQuest | SideQuest {
		if (regionQuests.length && Math.random() < 0.4) {
			return regionQuests[Math.floor(Math.random() * regionQuests.length)]
		}

		return sideQuests[Math.floor(Math.random() * sideQuests.length)]
	}

	getRewardsString (questRow: QuestRow, itemRewardRow?: ItemRow): string {
		const display = [`🌟 ${formatNumber(questRow.xpReward)} XP`]
		const rewardItem = allItems.find(i => i.name === questRow.itemReward)

		if (questRow.moneyReward) {
			display.push(formatMoney(questRow.moneyReward))
		}


		if (rewardItem) {
			display.push(getItemDisplay(rewardItem, itemRewardRow))
		}

		return display.join('\n')
	}

	getQuestObjective (quest: RegionQuest | SideQuest): string {
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
			case 'Scavenge': {
				return `Scavenge **${quest.progressGoal}** times.`
			}
			case 'Scavenge With A Key': {
				return `Scavenge an area using a ${getItemDisplay(quest.key)}.`
			}
			case 'Retrieve Item': {
				return `Find and turn in ${quest.progressGoal}x ${getItemDisplay(quest.item)}.`
			}
		}
	}

	getQuestProgress (questRow: QuestRow): string {
		switch (questRow.questType) {
			case 'Retrieve Item': {
				return `${formatRedBar(questRow.progress, questRow.progressGoal)} ${questRow.progress} / ${questRow.progressGoal} items`
			}
			default: {
				return `${formatRedBar(questRow.progress, questRow.progressGoal)} ${questRow.progress} / ${questRow.progressGoal}`
			}
		}
	}

	getQuestButton (quest: RegionQuest | SideQuest, questRow: QuestRow, disabled: boolean): ComponentButton {
		if (quest.questType === 'Retrieve Item' && questRow.progress < questRow.progressGoal) {
			const iconID = quest.item.icon.match(/:([0-9]*)>/)

			return {
				type: ComponentType.BUTTON,
				label: `Turn in 1x ${quest.item.name}`,
				emoji: iconID ? {
					id: iconID[1],
					name: 'item'
				} : undefined,
				style: ButtonStyle.SECONDARY,
				custom_id: 'turn in'
			}
		}

		return {
			type: ComponentType.BUTTON,
			label: 'Complete Quest',
			style: disabled ? ButtonStyle.SECONDARY : ButtonStyle.SUCCESS,
			custom_id: 'complete',
			disabled
		}
	}

	questCanBeCompleted (quest: RegionQuest | SideQuest, questRow: QuestRow, backpackRows: BackpackItemRow[], stashRows: ItemRow[]): boolean {
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

	getQuestItemReward (playerLocationLevel: LocationLevel): Item {
		switch (playerLocationLevel) {
			case 1: {
				const possibleItems = [items.cloth_armor, items.cloth_helmet, items.luger, items['.22LR_bullet']]
				return possibleItems[Math.floor(Math.random() * possibleItems.length)]
			}
			case 2: {
				const possibleItems = [items.wooden_armor, items.wooden_helmet, items['glock-17'], items['9mm_FMJ_bullet']]
				return possibleItems[Math.floor(Math.random() * possibleItems.length)]
			}
			case 3: {
				const possibleItems = [items.adderall, items.aramid_armor, items.aramid_helmet, items.P320, items['9mm_HP_bullet'], items['9mm_FMJ_bullet']]
				return possibleItems[Math.floor(Math.random() * possibleItems.length)]
			}
			case 4: {
				const possibleItems = [items.steel_armor, items.steel_helmet, items.bobwhite_g2, items['20-gauge_buckshot'], items.hyfin_chest_seal]
				return possibleItems[Math.floor(Math.random() * possibleItems.length)]
			}
		}
	}

	getQuestMoneyReward (playerLocationLevel: LocationLevel): number {
		switch (playerLocationLevel) {
			case 1: {
				return getRandomInt(100, 200)
			}
			case 2: {
				return getRandomInt(250, 500)
			}
			case 3: {
				return getRandomInt(750, 1250)
			}
			case 4: {
				return getRandomInt(1200, 2000)
			}
		}
	}
}

export default QuestCommand
