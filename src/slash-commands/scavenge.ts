import { SlashCreator, CommandContext, ComponentType, Message, ButtonStyle, ComponentButton } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { isValidLocation, locations } from '../resources/locations'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { Item } from '../types/Items'
import { Area, Location } from '../types/Locations'
import { addItemToBackpack, createItem, deleteItem, getUserBackpack, lowerItemDurability } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addXp, getUserRow } from '../utils/db/players'
import { getUserQuest, increaseProgress } from '../utils/db/quests'
import { backpackHasSpace, getBackpackLimit, getEquips, getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { getRarityDisplay } from '../utils/stringUtils'
import { ItemRow } from '../types/mysql'
import { GRAY_BUTTON, GREEN_BUTTON } from '../utils/constants'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'
import { allQuests } from '../resources/quests'
import { disableAllComponents } from '../utils/messageUtils'
import SellCommand from './sell'

class ScavengeCommand extends CustomSlashCommand<'scavenge'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'scavenge',
			description: 'Explore your region for items.',
			longDescription: 'Search your region for areas to explore. Some areas may require you to use a key to scavenge them.' +
				' Once you\'ve scavenged enough, try to fight the region boss with `/boss` and progress to regions with better items.',
			category: 'scavenging',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			starterTip: 'This is the main way to find gear. Choose an area to scavenge for items or fight the mobs protecting areas.' +
				` Once you kill a mob, you'll be able to scavenge the area they were gaurding.\n\n${icons.information} *You can also skip the navigation menu` +
				' by doing `/scavenge area`, for all you command spammers out there :)*'
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.member) {
			throw new Error('Member not attached to interaction')
		}

		// have to use transaction here to prevent users from running the command multiple times to get different area choices (since some areas are rare and have better drops)
		const preTransaction = await beginTransaction()
		const preUserData = (await getUserRow(preTransaction.query, ctx.user.id, true))!
		let botMessage: Message | undefined

		if (!isValidLocation(preUserData.currentLocation)) {
			await preTransaction.commit()

			await ctx.send({
				content: `${icons.warning} You need to travel to a region. Use the \`/travel\` command to travel to a region you want to scavenge.`
			})
			return
		}

		const preAreaCD = await getCooldown(preTransaction.query, ctx.user.id, 'scavenge', true)

		if (preAreaCD) {
			await preTransaction.commit()

			await ctx.send({
				content: `${icons.timer} You recently scavenged an area. You can scavenge again in **${preAreaCD}**.\n\n*You can reset this cooldown instantly by defeating a mob using the \`/hunt\` command.*`
			})
			return
		}

		const preBackpackRows = await getUserBackpack(preTransaction.query, ctx.user.id, true)

		if (!backpackHasSpace(preBackpackRows, 0)) {
			await preTransaction.commit()

			botMessage = await ctx.editOriginal({
				content: `${icons.warning} You are overweight, you will need to clear some space in your inventory before scavenging.`,
				components: [{
					type: ComponentType.ACTION_ROW,
					components: [GRAY_BUTTON('Sell Items', 'sell')]
				}]
			})

			try {
				const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

				if (confirmed.customID === 'sell') {
					const sellCommand = new SellCommand(this.app.slashCreator, this.app)

					await confirmed.editParent({
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GREEN_BUTTON('Sell Items', 'sell', true)]
						}]
					})
					await sellCommand.run(ctx)
				}
			}
			catch (err) {
				// continue
				await botMessage.edit({
					components: disableAllComponents(botMessage.components)
				})
			}
			return
		}

		await createCooldown(preTransaction.query, ctx.user.id, 'scavenge', 60 * 3)
		await preTransaction.commit()

		const location = locations[preUserData.currentLocation]
		let areaChoice: Area | undefined

		try {
			const choice = await this.getAreaChoice(ctx, location)
			botMessage = await ctx.fetch()
			areaChoice = choice
		}
		catch (err) {
			return
		}

		const transaction = await beginTransaction()
		const userData = (await getUserRow(transaction.query, ctx.user.id, true))!

		if (userData.fighting) {
			await transaction.commit()

			await ctx.editOriginal({
				content: `${icons.danger} You cannot scavenge while in a duel.`,
				components: [],
				embeds: []
			})
			return
		}

		const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
		const preUserQuest = await getUserQuest(transaction.query, ctx.user.id, true)
		const backpackData = getItems(backpackRows)
		const userEquips = getEquips(backpackRows)
		const keyRequired = areaChoice.requiresKey
		const hasRequiredKey = sortItemsByDurability(backpackData.items, true).reverse().find(i => i.item.name === keyRequired?.name)
		const backpackLimit = getBackpackLimit(userEquips.backpack?.item)

		// verify user has space needed to scavenge area, factoring in if they will lose a key from the scavenge
		if (
			backpackData.slotsUsed -
			(
				hasRequiredKey &&
				(!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) ? hasRequiredKey.item.slotsUsed : 0
			) > backpackLimit
		) {
			await transaction.commit()

			await ctx.editOriginal({
				content: `${icons.danger} You don't have enough space in your inventory to scavenge **${areaChoice.display}**. Sell items to clear up some space.`,
				components: [],
				embeds: []
			})
			return
		}

		else if (keyRequired && !hasRequiredKey) {
			await transaction.commit()

			await ctx.editOriginal({
				content: `${icons.information} You need a ${getItemDisplay(keyRequired)} to scavenge **${areaChoice.display}**.`,
				components: [],
				embeds: []
			})
			return
		}

		// lower durability or remove key
		else if (hasRequiredKey) {
			if (!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) {
				await deleteItem(transaction.query, hasRequiredKey.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, hasRequiredKey.row.id, 1)
			}
		}

		if (preUserQuest?.questType === 'Scavenge With A Key' || preUserQuest?.questType === 'Scavenge') {
			const quest = allQuests.find(q => q.id === preUserQuest.questId)

			if (preUserQuest.progress < preUserQuest.progressGoal) {
				if (
					(
						quest &&
						quest.questType === 'Scavenge With A Key' &&
						hasRequiredKey &&
						quest.key.name === hasRequiredKey.item.name
					) ||
					preUserQuest.questType === 'Scavenge'
				) {
					await increaseProgress(transaction.query, ctx.user.id, 1)
				}
			}
		}

		const scavengedLoot: { rarity: string, item: Item, row: ItemRow }[] = []
		const missedLoot: { rarity: string, item: Item, row?: undefined }[] = []
		let xpEarned = 0

		for (let i = 0; i < areaChoice.loot.rolls; i++) {
			const randomLoot = this.getRandomItem(areaChoice)

			if (randomLoot.item) {
				const invOutOfSpace = backpackData.slotsUsed + scavengedLoot.reduce((prev, curr) => prev + curr.item.slotsUsed, 0) - (
					hasRequiredKey &&
					(!hasRequiredKey.row.durability || hasRequiredKey.row.durability - 1 <= 0) ? hasRequiredKey.item.slotsUsed : 0
				) >= backpackLimit

				// check if users backpack has space for another item
				if (invOutOfSpace && i !== 0) {
					missedLoot.push({
						item: randomLoot.item,
						rarity: randomLoot.rarityDisplay
					})
				}
				else {
					const itemRow = await createItem(transaction.query, randomLoot.item.name, { durability: randomLoot.item.durability })

					xpEarned += randomLoot.xp

					scavengedLoot.push({
						item: randomLoot.item,
						row: itemRow,
						rarity: randomLoot.rarityDisplay
					})

					await addItemToBackpack(transaction.query, ctx.user.id, itemRow.id)
				}
			}
		}

		await addXp(transaction.query, ctx.user.id, xpEarned)
		await transaction.commit()

		if (!scavengedLoot.length) {
			await ctx.editOriginal({
				content: `You ${hasRequiredKey ?
					`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
					''}scavenge **${areaChoice.display}** and find:\n\n**nothing of value!**\n${icons.xp_star}***+${xpEarned}** xp!*`,
				components: [],
				embeds: []
			})
			return
		}

		const combinedLoot = [...scavengedLoot, ...missedLoot]

		botMessage = await ctx.editOriginal({
			content: `You ${hasRequiredKey ?
				`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
				''}scavenge **${areaChoice.display}** and find:\n\n${combinedLoot.map(itm => `${icons.loading} ${itm.rarity} *examining...*`).join('\n')}` +
				`\n${icons.xp_star}***+???** xp!*`,
			components: [],
			embeds: []
		})

		for (let i = 0; i < combinedLoot.length; i++) {
			setTimeout(async () => {
				try {
					const unhiddenItems = combinedLoot.slice(0, i + 1)
					const hiddenItems = combinedLoot.slice(i + 1)
					const lootedMessage = `You ${hasRequiredKey ?
						`use your ${getItemDisplay(hasRequiredKey.item, { ...hasRequiredKey.row, durability: hasRequiredKey.row.durability ? hasRequiredKey.row.durability - 1 : undefined })} to ` :
						''}scavenge **${areaChoice!.display}** and find:\n\n${unhiddenItems.map(itm => itm.row ? `${itm.rarity} ${getItemDisplay(itm.item, itm.row)}` : `You saw a ${itm.rarity} ${getItemDisplay(itm.item)}, but you didn't have enough space to take it.`).join('\n')}` +
						`${hiddenItems.length ? `\n${hiddenItems.map(itm => `${icons.loading} ${itm.rarity} *examining...*`).join('\n')}` : ''}` +
						`\n${unhiddenItems.length === combinedLoot.length ? `${icons.xp_star}***+${xpEarned}** xp!*` : `${icons.xp_star}***+???** xp!*`}`

					await ctx.editOriginal({
						content: `${lootedMessage}` +
							`${unhiddenItems.length === combinedLoot.length ? `\n\n${icons.checkmark} These items were added to your inventory.` : ''}`,
						components: [],
						embeds: []
					})
				}
				catch (err) {
					logger.warn(err)
				}
			}, 1500 * (i + 1))
		}
	}

	async getAreaChoice (ctx: CommandContext, location: Location): Promise<Area> {
		const chosenAreas = location.areas.sort(() => 0.5 - Math.random()).slice(0, 3)
		const buttons: ComponentButton[] = []

		for (const area of chosenAreas) {
			if (area.requiresKey) {
				const iconID = area.requiresKey.icon.match(/:([0-9]*)>/)

				buttons.push({
					type: ComponentType.BUTTON,
					label: `${area.display} (requires key)`,
					custom_id: area.display,
					style: ButtonStyle.SECONDARY,
					emoji: iconID ? {
						id: iconID[1],
						name: area.requiresKey.name
					} : undefined
				})
			}
			else {
				buttons.push({
					type: ComponentType.BUTTON,
					label: area.display,
					custom_id: area.display,
					style: ButtonStyle.SECONDARY
				})
			}
		}

		const botMessage = await ctx.editOriginal({
			content: `Scavenging **${location.display}** - Which area do you want to scavenge?`,
			components: [{
				type: ComponentType.ACTION_ROW,
				components: buttons
			}]
		})

		return new Promise((resolve, reject) => {
			const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 60000)

			collector.on('collect', async c => {
				try {
					const areaChoice = location.areas.find(a => a.display === c.customID)

					await c.acknowledge()

					if (!areaChoice) {
						stopCollector()

						await c.editParent({
							content: `${icons.danger} Unable to find that area.`,
							components: []
						})

						reject(new Error('not a valid area'))
						return
					}

					else if (areaChoice.requiresKey) {
						const preBackpackRows = await getUserBackpack(query, ctx.user.id)
						const userBackpack = getItems(preBackpackRows)
						const keyUsed = sortItemsByDurability(userBackpack.items, true).reverse().find(i => i.item.name === areaChoice.requiresKey.name)

						if (!keyUsed) {
							await c.send({
								content: `${icons.warning} You need a ${getItemDisplay(areaChoice.requiresKey)} in your backpack to scavenge **${areaChoice.display}**.`,
								components: [],
								ephemeral: true
							})
							return
						}
					}

					stopCollector()
					resolve(areaChoice)
				}
				catch (err) {
					// continue
				}
			})

			collector.on('end', async msg => {
				try {
					if (msg === 'time') {
						await botMessage.edit({
							content: `${icons.danger} You decide against scavenging (ran out of time to select an area).`,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: disableAllComponents(buttons)
							}]
						})

						reject(msg)
					}
				}
				catch (err) {
					logger.warn(err)
				}
			})
		})
	}

	/**
	 * Gets a random scavenged item from an area
	 * @param area The area to get scavenge loot for
	 * @returns An item
	 */
	getRandomItem (area: Area): { item: Item | undefined, xp: number, rarityDisplay: string } {
		const rand = Math.random()
		let randomItem
		let xpEarned
		let rarityDisplay

		if (area.loot.rarest && rand < 0.05) {
			xpEarned = area.loot.rarest.xp
			randomItem = area.loot.rarest.items[Math.floor(Math.random() * area.loot.rarest.items.length)]
			rarityDisplay = getRarityDisplay('Insanely Rare')
		}
		else if (rand < 0.60) {
			xpEarned = area.loot.common.xp
			randomItem = area.loot.common.items[Math.floor(Math.random() * area.loot.common.items.length)]
			rarityDisplay = getRarityDisplay('Common')
		}
		else if (rand < 0.85) {
			xpEarned = area.loot.uncommon.xp
			randomItem = area.loot.uncommon.items[Math.floor(Math.random() * area.loot.uncommon.items.length)]
			rarityDisplay = getRarityDisplay('Uncommon')
		}
		else {
			xpEarned = area.loot.rare.xp
			randomItem = area.loot.rare.items[Math.floor(Math.random() * area.loot.rare.items.length)]
			rarityDisplay = getRarityDisplay('Rare')
		}

		return {
			item: randomItem,
			xp: xpEarned,
			rarityDisplay
		}
	}
}

export default ScavengeCommand
