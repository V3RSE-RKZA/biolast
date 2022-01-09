import { CommandOptionType, SlashCreator, CommandContext, Message, ComponentType, InteractionResponseFlags, User } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow, removeMoney } from '../utils/db/players'
import { formatMoney, formatRedBar } from '../utils/stringUtils'
import { addStress, addXp, createCompanion, deleteCompanion, getCompanionRow, increaseFetches, increaseLevel, lowerHunger, lowerStress, setFetching } from '../utils/db/companions'
import { Companion, companions } from '../resources/companions'
import { getCompanionDisplay, getCompanionXp } from '../utils/companionUtils'
import { clearCooldown, createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { CONFIRM_BUTTONS, GRAY_BUTTON, GREEN_BUTTON } from '../utils/constants'
import { addItemToStash, createItem, deleteItem, getUserBackpack, getUserStash, lowerItemDurability } from '../utils/db/items'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { CompanionRow } from '../types/mysql'
import { allItems } from '../resources/items'
import { disableAllComponents } from '../utils/messageUtils'

// how much xp companion receives when played with
const XP_PER_PLAY = 15

// how much xp companion receives when completed fetch
const XP_PER_FETCH = 20

const STRESS_PER_FETCH = 20

class CompanionCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'companion',
			description: 'View your companion stats, assign them to a fetch mission, or complete their fetch mission.',
			longDescription: 'View your companion stats, assign them to a fetch mission, or complete their fetch mission.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'buy',
					description: 'Hire a companion. Check the companion shop to see who can be hired and their price.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'companion',
							description: 'Name of companion to hire.',
							required: true,
							choices: companions.sort((a, b) => b.price - a.price).map(c => ({
								name: `${c.name}`,
								value: c.name
							}))
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'view',
					description: 'View your companion stats, assign them to a fetch mission, or complete their fetch mission.',
					options: [
						{
							type: CommandOptionType.USER,
							name: 'user',
							description: 'User to check companion of.',
							required: false
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'shop',
					description: 'View the companion shop.'
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'play',
					description: 'Play with your companion. Reduces stress levels.',
					options: [
						{
							type: CommandOptionType.USER,
							name: 'user',
							description: 'User of companion you want to play with.',
							required: false
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'feed',
					description: 'Feed your companion using a Food item from your inventory or stash. Reduces hunger levels.',
					options: [
						{
							type: CommandOptionType.INTEGER,
							name: 'item',
							description: 'ID of item to feed companion.',
							required: true
						}
					]
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (ctx.options.buy) {
			const companion = companions.find(c => c.name === ctx.options.buy.companion)

			if (!companion) {
				await ctx.send({
					content: `${icons.danger} Could not find a companion with that name.`
				})
				return
			}

			const userData = (await getUserRow(query, ctx.user.id))!

			if (userData.money < companion.price) {
				await ctx.send({
					content: `${icons.danger} You don't have enough money. You need **${formatMoney(companion.price)}** but you only have **${formatMoney(userData.money)}**.`
				})
				return
			}

			const companionRow = await getCompanionRow(query, ctx.user.id)
			const companionRowC = companions.find(c => c.name === companionRow?.type)

			const botMessage = await ctx.send({
				content: `Hire **${companion.name}** for **${formatMoney(companion.price)}**?${companionRow && companionRowC ? ` ${icons.warning} Your current companion ${getCompanionDisplay(companionRow)} will be replaced.` : ''}`,
				components: CONFIRM_BUTTONS
			}) as Message

			try {
				const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

				if (confirmed.customID === 'confirmed') {
					// using transaction because users data will be updated
					const transaction = await beginTransaction()
					const userDataV = (await getUserRow(transaction.query, ctx.user.id, true))!
					const companionRowVerfied = await getCompanionRow(transaction.query, ctx.user.id, true)

					if (userData.money < companion.price) {
						await transaction.commit()

						await confirmed.editParent({
							content: `${icons.danger} You don't have enough money. You need **${formatMoney(companion.price)}** but you only have **${formatMoney(userData.money)}**.`,
							components: []
						})
						return
					}

					if (companionRowVerfied) {
						await deleteCompanion(transaction.query, ctx.user.id)
					}

					await removeMoney(transaction.query, ctx.user.id, companion.price)
					await createCompanion(transaction.query, ctx.user.id, companion.name)
					await transaction.commit()

					await confirmed.editParent({
						content: `${icons.checkmark} Hired **${companion.name}** for **${formatMoney(companion.price)}**.\n\n` +
							`${icons.information} You now have **${formatMoney(userDataV.money - companion.price)}**.`,
						components: []
					})
				}
				else {
					await botMessage.delete()
				}
			}
			catch (err) {
				await botMessage.edit({
					content: `${icons.danger} Command timed out.`,
					components: disableAllComponents(botMessage.components)
				})
			}
		}
		else if (ctx.options.feed) {
			const transaction = await beginTransaction()
			const companionRow = await getCompanionRow(transaction.query, ctx.user.id, true)
			const companion = companions.find(c => c.name === companionRow?.type)

			if (!companionRow || !companion || companionRow.hunger >= 100) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} You don't have a companion. Hire one from the \`/companion shop\`.`
				})
				return
			}

			const stashRows = await getUserStash(transaction.query, ctx.user.id, true)
			const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
			const userStashData = getItems(stashRows)
			const userBackpackData = getItems(backpackRows)
			const foundItem = userStashData.items.find(itm => itm.row.id === ctx.options.feed.item) || userBackpackData.items.find(itm => itm.row.id === ctx.options.feed.item)

			if (!foundItem) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} You don't have an item with the ID **${ctx.options.feed.item}** in your inventory or stash. You can find the IDs of items in your \`/inventory\` or \`/stash\`.`
				})
				return
			}
			else if (foundItem.item.type !== 'Food') {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} ${getItemDisplay(foundItem.item, foundItem.row, { showEquipped: false, showDurability: false })} is not a **Food** item.`
				})
				return
			}

			const maxHeal = Math.min(companionRow.hunger, foundItem.item.reducesHunger)

			if (maxHeal === 0) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.danger} Your companion isn't hungry!`
				})
				return
			}

			if (!foundItem.row.durability || foundItem.row.durability - 1 <= 0) {
				await deleteItem(transaction.query, foundItem.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, foundItem.row.id, 1)
			}

			await lowerHunger(transaction.query, ctx.user.id, maxHeal)
			await transaction.commit()

			const itemDisplay = getItemDisplay(foundItem.item, {
				...foundItem.row,
				durability: foundItem.row.durability ? foundItem.row.durability - 1 : undefined
			}, {
				showID: false,
				showEquipped: false
			})

			await ctx.send({
				content: `${icons.checkmark} You fed ${getCompanionDisplay(companionRow)} a ${itemDisplay}.` +
					` Your companions hunger level decreased from ${companionRow.hunger} to ${companionRow.hunger - maxHeal}.`
			})
		}
		else if (ctx.options.play) {
			const transaction = await beginTransaction()
			const member = ctx.members.get(ctx.options.play.user)

			if (member) {
				const playCD = await getCooldown(transaction.query, ctx.user.id, 'companion-play', true)
				const companionRow = await getCompanionRow(transaction.query, member.id, true)
				const companion = companions.find(c => c.name === companionRow?.type)

				if (member.id === ctx.user.id) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.warning} Specify someone besides yourself.`
					})
					return
				}
				else if (!companionRow || !companion || companionRow.hunger >= 100) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.warning} **${member.displayName}** does not have a companion.`
					})
					return
				}

				if (playCD) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.timer} You recently played with a companion.` +
							` You will have to wait **${playCD}** before you can play again.`
					})
					return
				}

				const maxHeal = Math.min(companionRow.stress, 10)

				if (maxHeal <= 0) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.warning} **${member.displayName}**'s companion ${getCompanionDisplay(companionRow)} isn't stressed!`
					})
					return
				}

				await lowerStress(transaction.query, ctx.user.id, maxHeal)
				await createCooldown(transaction.query, ctx.user.id, 'companion-play', 30 * 60)
				await transaction.commit()

				await ctx.send({
					content: `${icons.checkmark} You play with **${member.displayName}**'s companion ${getCompanionDisplay(companionRow)}!` +
						` Their stress level decreased from **${companionRow.stress}** to **${companionRow.stress - maxHeal}**.`
				})
			}
			else {
				const playCD = await getCooldown(transaction.query, ctx.user.id, 'self-companion-play', true)
				const companionRow = await getCompanionRow(transaction.query, ctx.user.id, true)
				const companion = companions.find(c => c.name === companionRow?.type)

				if (!companionRow || !companion || companionRow.hunger >= 100) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.warning} You don't have a companion. Hire one from the \`/companion shop\`.`
					})
					return
				}

				if (playCD) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.timer} You recently played with your companion.` +
							` You will have to wait **${playCD}** or have someone else play with your companion.`
					})
					return
				}

				const maxHeal = Math.min(companionRow.stress, 10)
				const companionNewLevel = this.getCompanionLevel(companionRow.xp + XP_PER_PLAY, companionRow.level)
				const companionXp = getCompanionXp(companionRow.xp + XP_PER_PLAY, companionNewLevel)
				let display = `${icons.checkmark} You play with ${getCompanionDisplay(companionRow)}!`

				await createCooldown(transaction.query, ctx.user.id, 'self-companion-play', 60 * 60)
				await addXp(transaction.query, ctx.user.id, XP_PER_PLAY)

				if (maxHeal > 0) {
					display += ` Their stress level decreased from **${companionRow.stress}** to **${companionRow.stress - maxHeal}**.`
					await lowerStress(transaction.query, ctx.user.id, maxHeal)
				}

				display += `\n\n${getCompanionDisplay(companionRow)} gained 🌟 ***+${XP_PER_PLAY}*** xp! (${companionXp.relativeLevelXp} / ${companionXp.levelTotalXpNeeded} xp until level ${companionNewLevel + 1})`

				if (companionRow.level !== companionNewLevel) {
					display += `\n**${getCompanionDisplay(companionRow)} leveled up!** (Lvl **${companionRow.level}** → **${companionNewLevel}**)`
					await increaseLevel(transaction.query, ctx.user.id, companionNewLevel - companionRow.level)
				}

				await transaction.commit()

				await ctx.send({
					content: display
				})
			}
		}
		else if (ctx.options.shop) {
			const shopEmbed = new Embed()
				.setTitle('Companion Shop')
				.setDescription('Use `/companion buy <name>` to hire a companion.')

			for (const companion of companions.sort((a, b) => b.price - a.price)) {
				shopEmbed.addField(companion.name, `Fetch Time: **${formatTime(companion.fetchTime * 1000)}**\nPrice: **${formatMoney(companion.price)}**`)
			}

			await ctx.send({
				embeds: [shopEmbed.embed]
			})
		}
		else {
			// viewing companion
			const member = ctx.members.get(ctx.options.view.user)

			if (member) {
				const userData = await getUserRow(query, member.id)

				if (!userData) {
					await ctx.send({
						content: `${icons.warning} **${member.displayName}** does not have an account!`
					})
					return
				}

				const companionRow = await getCompanionRow(query, member.id)
				const companion = companions.find(c => c.name === companionRow?.type)

				if (!companionRow || !companion || companionRow.hunger >= 100) {
					await ctx.send({
						content: `${icons.warning} **${member.displayName}** does not have a companion.`
					})
					return
				}

				const companionFetchCD = await getCooldown(query, member.id, 'companion-fetch')
				const companionEmbed = this.getCompanionEmbed(member.user, companion, companionRow, companionFetchCD)

				await ctx.send({
					embeds: [companionEmbed.embed]
				})
				return
			}

			const transaction = await beginTransaction()
			const companionRow = await getCompanionRow(transaction.query, ctx.user.id, true)
			const companion = companions.find(c => c.name === companionRow?.type)

			if (!companionRow || !companion) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} You don't have a companion. Hire one from the \`/companion shop\`.`
				})
				return
			}

			const companionFetchCD = await getCooldown(transaction.query, ctx.user.id, 'companion-fetch', true)

			// companion reached max hunger
			if (companionRow.hunger >= 100) {
				if (companionFetchCD) {
					await clearCooldown(transaction.query, ctx.user.id, 'companion-fetch')
				}

				await deleteCompanion(transaction.query, ctx.user.id)
				await transaction.commit()

				await ctx.send({
					content: `**${getCompanionDisplay(companionRow, true)} got too hungry and ran away!** Make sure you feed your companion to prevent this from happening.`
				})
				return
			}

			await transaction.commit()

			const companionEmbed = this.getCompanionEmbed(ctx.user, companion, companionRow, companionFetchCD)

			let buttons = [companionRow.fetching ? GREEN_BUTTON('Complete Fetch Mission', 'fetch-complete') : GRAY_BUTTON('Send Companion on Fetch Mission', 'fetch')]
			const botMessage = await ctx.send({
				embeds: [companionEmbed.embed],
				components: [{
					type: ComponentType.ACTION_ROW,
					components: buttons
				}]
			}) as Message

			const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 60000)

			collector.on('collect', async buttonCtx => {
				try {
					const completedTransaction = await beginTransaction()
					const completedCompanionRow = await getCompanionRow(completedTransaction.query, ctx.user.id, true)

					if (!completedCompanionRow || completedCompanionRow.type !== companion.name) {
						stopCollector()
						await completedTransaction.commit()
						await buttonCtx.send({
							content: `${icons.cancel} You don't own this companion anymore.`,
							flags: InteractionResponseFlags.EPHEMERAL
						})

						throw new Error('User does not own companion displayed in companion message')
					}

					const completedCompanionFetchCD = await getCooldown(completedTransaction.query, ctx.user.id, 'companion-fetch', true)

					if (buttonCtx.customID === 'fetch-complete') {
						if (!completedCompanionRow.fetching) {
							await completedTransaction.commit()

							if (completedCompanionFetchCD) {
								await clearCooldown(transaction.query, ctx.user.id, 'companion-fetch')
							}

							buttons = [GRAY_BUTTON('Send Companion on Fetch Mission', 'fetch')]

							await ctx.editOriginal({
								embeds: [this.getCompanionEmbed(ctx.user, companion, completedCompanionRow).embed],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: buttons
								}]
							})
							await buttonCtx.send({
								content: `${icons.cancel} Your companion is not fetching anything.`,
								flags: InteractionResponseFlags.EPHEMERAL
							})
							return
						}
						else if (completedCompanionFetchCD) {
							await completedTransaction.commit()
							await ctx.editOriginal({
								embeds: [this.getCompanionEmbed(ctx.user, companion, completedCompanionRow, completedCompanionFetchCD).embed],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: buttons
								}]
							})
							await buttonCtx.send({
								content: `${icons.cancel} Your companion still fetching. They will finish fetching in **${completedCompanionFetchCD}**.`,
								flags: InteractionResponseFlags.EPHEMERAL
							})
							return
						}

						const stashRows = await getUserStash(completedTransaction.query, ctx.user.id, true)
						const userStashData = getItems(stashRows)
						const completedUserData = (await getUserRow(completedTransaction.query, ctx.user.id, true))!

						if (userStashData.slotsUsed + companion.itemsFound > completedUserData.stashSlots) {
							await completedTransaction.commit()

							await buttonCtx.send({
								content: `${icons.cancel} You don't have enough space in your stash to collect the reward. You need **${companion.itemsFound}** open slots in your stash. Sell items to clear up some space.`,
								flags: InteractionResponseFlags.EPHEMERAL
							})
							return
						}

						const rewards = []
						const companionNewLevel = this.getCompanionLevel(completedCompanionRow.xp + XP_PER_FETCH, completedCompanionRow.level)
						const companionXp = getCompanionXp(completedCompanionRow.xp + XP_PER_FETCH, companionNewLevel)
						let possibleItems = allItems.filter(i => i.itemLevel <= completedCompanionRow.level + 1 && i.itemLevel > completedCompanionRow.level - 4)
						let loopI = 1
						let display = `${icons.checkmark} ${getCompanionDisplay(completedCompanionRow, true)} found the following:\n\n`

						buttons = [GRAY_BUTTON('Send Companion on Fetch Mission', 'fetch')]
						completedCompanionRow.fetching = 0

						// expand the item pool if there aren't many possible items, ensures that companion will find different a variety of items
						while (possibleItems.length < 4 + companion.itemsFound) {
							loopI++
							possibleItems = allItems.filter(i =>
								i.name !== 'dog_tags' &&
								i.itemLevel <= completedCompanionRow.level + 1 &&
								i.itemLevel > completedCompanionRow.level - (4 * loopI)
							)
						}

						for (let i = 0; i < companion.itemsFound; i++) {
							const item = possibleItems[Math.floor(Math.random() * possibleItems.length)]
							const itemRow = await createItem(completedTransaction.query, item.name, { durability: item.durability })

							await addItemToStash(completedTransaction.query, ctx.user.id, itemRow.id)

							rewards.push({
								item,
								row: itemRow
							})
						}

						const stressToAdd = Math.min(100 - completedCompanionRow.stress, STRESS_PER_FETCH)

						await addStress(completedTransaction.query, ctx.user.id, stressToAdd)
						await setFetching(completedTransaction.query, ctx.user.id, false)
						await addXp(completedTransaction.query, ctx.user.id, XP_PER_FETCH)
						await increaseFetches(completedTransaction.query, ctx.user.id, 1)
						completedCompanionRow.xp += XP_PER_FETCH
						completedCompanionRow.stress += stressToAdd
						display += `${rewards.map(itm => getItemDisplay(itm.item, itm.row)).join('\n')}\n\n` +
							`${icons.information} You can find this loot in your stash.\n\n` +
							`${getCompanionDisplay(completedCompanionRow)} gained 🌟 ***+${XP_PER_FETCH}*** xp! (${companionXp.relativeLevelXp} / ${companionXp.levelTotalXpNeeded} xp until level ${companionNewLevel + 1})`

						if (completedCompanionRow.level !== companionNewLevel) {
							display += `\n**${getCompanionDisplay(completedCompanionRow)} leveled up!** (Lvl **${completedCompanionRow.level}** → **${companionNewLevel}**)`
							await increaseLevel(completedTransaction.query, ctx.user.id, companionNewLevel - completedCompanionRow.level)
							completedCompanionRow.level = companionNewLevel
						}

						await completedTransaction.commit()

						await ctx.editOriginal({
							embeds: [this.getCompanionEmbed(ctx.user, companion, completedCompanionRow).embed],
							components: [{
								type: ComponentType.ACTION_ROW,
								components: buttons
							}]
						})
						await buttonCtx.send({
							content: display,
							flags: InteractionResponseFlags.EPHEMERAL
						})
					}
					else if (buttonCtx.customID === 'fetch') {
						if (completedCompanionRow.fetching && completedCompanionFetchCD) {
							await completedTransaction.commit()

							buttons = [GREEN_BUTTON('Complete Fetch Mission', 'fetch-complete')]

							await ctx.editOriginal({
								embeds: [this.getCompanionEmbed(ctx.user, companion, completedCompanionRow, completedCompanionFetchCD).embed],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: buttons
								}]
							})
							await buttonCtx.send({
								content: `${icons.cancel} Your companion is already fetching.`,
								flags: InteractionResponseFlags.EPHEMERAL
							})
							return
						}
						else if (completedCompanionRow.stress >= 100) {
							await completedTransaction.commit()

							await buttonCtx.send({
								content: `${icons.cancel} ${getCompanionDisplay(completedCompanionRow, true)} is too stressed to fetch anything! Play with them to lower their stress.`,
								flags: InteractionResponseFlags.EPHEMERAL
							})
							return
						}

						await setFetching(completedTransaction.query, ctx.user.id, true)
						await createCooldown(completedTransaction.query, ctx.user.id, 'companion-fetch', companion.fetchTime)
						completedCompanionRow.fetching = 1
						buttons = [GREEN_BUTTON('Complete Fetch Mission', 'fetch-complete')]
						await completedTransaction.commit()

						await ctx.editOriginal({
							embeds: [this.getCompanionEmbed(ctx.user, companion, completedCompanionRow, formatTime(companion.fetchTime * 1000)).embed],
							components: [{
								type: ComponentType.ACTION_ROW,
								components: buttons
							}]
						})
						await buttonCtx.send({
							content: `${icons.checkmark} ${getCompanionDisplay(completedCompanionRow, true)} is now looking for an item to fetch you and will complete their mission in **${formatTime(companion.fetchTime * 1000)}**.`,
							flags: InteractionResponseFlags.EPHEMERAL
						})
					}
				}
				catch (err) {
					logger.warn(err)

					await ctx.editOriginal({
						content: `${icons.cancel} There was an error trying to interact with your companion. Try running the command again.`,
						components: []
					})
				}
			})

			collector.on('end', async msg => {
				try {
					if (msg === 'time') {
						await ctx.editOriginal({
							content: 'Buttons timed out.',
							components: [{
								type: ComponentType.ACTION_ROW,
								components: disableAllComponents(buttons)
							}]
						})
					}
				}
				catch (err) {
					logger.error(err)
				}
			})
		}
	}

	/**
	 * Checks if a companion should be a higher level than they are
	 * @param xp Companions XP
	 * @param level Companions current level
	 * @returns The level companion should be
	 */
	getCompanionLevel (xp: number, level: number): number {
		// check if companion has enough xp to level up
		let companionXp = getCompanionXp(xp, level)
		let newLevel = level

		// check if user levels up multiple times (prevents sending multiple level-up messages)
		while (companionXp.xpUntilLevelUp <= 0) {
			newLevel += 1
			companionXp = getCompanionXp(xp, newLevel)
		}

		return newLevel
	}

	getCompanionEmbed (user: User, companion: Companion, companionRow: CompanionRow, fetchCD?: string): Embed {
		const companionXp = getCompanionXp(companionRow.xp, companionRow.level)
		const companionEmbed = new Embed()
			.setAuthor(`${user.username}#${user.discriminator}'s Companion`, user.avatarURL)
			.setDescription(`Level ${companionRow.level} ${getCompanionDisplay(companionRow)}`)
			.addField('__Companion Stats__', `**Level**: ${companionRow.level}\n` +
				`**XP**: ${companionXp.relativeLevelXp} / ${companionXp.levelTotalXpNeeded} xp\n` +
				`**Fetch Missions Completed**: ${companionRow.fetches}`, true)
			.addField('__Status__', `**Stress**: ${formatRedBar(companionRow.stress, 100)} ${companionRow.stress} / 100\n` +
				`**Hunger**: ${formatRedBar(companionRow.hunger, 100)} ${companionRow.hunger} / 100 (+2/hr)\n\n` +
				`${icons.warning} If hunger levels reach 100, your companion will leave you!`)
			.addField('__Fetch Mission Status__', companionRow.fetching ?
				fetchCD ?
					`${icons.timer} ${getCompanionDisplay(companionRow, true)} will complete their fetch mission in **${fetchCD}**.` :
					`${icons.checkmark} ${getCompanionDisplay(companionRow, true)} has found **${companion.itemsFound}** items!` :
				`**${getCompanionDisplay(companionRow, true)} is not fetching anything.**\n\n` +
				`${icons.information} Fetch missions allow companions to retrieve a random item based on their level. ${getCompanionDisplay(companionRow, true)} will take **${formatTime(companion.fetchTime * 1000)}** to complete a fetch mission. Fetch missions will increase companion stress levels.`)

		if (companion.image) {
			companionEmbed.setThumbnail(companion.image)
		}

		return companionEmbed
	}
}

export default CompanionCommand
