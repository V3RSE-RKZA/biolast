import { CommandOptionType, SlashCreator, CommandContext, AutocompleteContext, Message, ComponentType, ComponentActionRow } from 'slash-create'
import App from '../app'
import { icons, shopBuyMultiplier, shopSellMultiplier } from '../config'
import { allItems } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Ammunition, Item, ItemType } from '../types/Items'
import { getItem, getNumber } from '../utils/argParsers'
import { getUserBackpack } from '../utils/db/items'
import { query } from '../utils/db/mysql'
import { combineArrayWithOr, formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItems, sortItemsByAmmo, sortItemsByLevel } from '../utils/itemUtils'
import { allLocations } from '../resources/locations'
import { getEffectsDisplay } from '../utils/playerUtils'
import { GRAY_BUTTON, NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { logger } from '../utils/logger'
import { getUserRow } from '../utils/db/players'

const itemCorrector = new Corrector([...allItems.map(itm => itm.name.toLowerCase()), ...allItems.map(itm => itm.aliases.map(a => a.toLowerCase())).flat(1)])
const ITEMS_PER_PAGE = 10

class ItemCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'item',
			description: 'View information about an item.',
			longDescription: 'View information about an item.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'list',
					description: 'View a list of all the items you\'ve discovered.',
					options: []
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'info',
					description: 'View information about a specific item.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'item',
							description: 'Name of the item.',
							required: true,
							autocomplete: true
						}
					]
				}
			],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (ctx.options.list) {
			const userData = (await getUserRow(query, ctx.user.id))!
			const categorySelectMenu: ComponentActionRow = {
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.SELECT,
						custom_id: 'category',
						placeholder: 'Filter items by category:',
						options: Array.from(new Set(allItems.map(i => i.type))).sort().map(c => ({
							label: c,
							value: c,
							description: this.getCategoryDescription(c)
						}))
					}
				]
			}
			let pages = this.generatePages(allItems.filter(i => i.itemLevel <= userData.level))
			let page = 0

			const botMessage = await ctx.send({
				embeds: [pages[0].embed],
				components: [
					categorySelectMenu,
					{
						type: ComponentType.ACTION_ROW,
						components: [
							PREVIOUS_BUTTON(true),
							NEXT_BUTTON(false)
						]
					}
				]
			}) as Message

			const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 80000)

			collector.on('collect', async buttonCtx => {
				try {
					await buttonCtx.acknowledge()

					if (buttonCtx.customID === 'previous' && page !== 0) {
						page--

						await buttonCtx.editParent({
							embeds: [pages[page].embed],
							components: [
								categorySelectMenu,
								{
									type: ComponentType.ACTION_ROW,
									components: [
										PREVIOUS_BUTTON(page === 0),
										NEXT_BUTTON(false)
									]
								}
							]
						})
					}
					else if (buttonCtx.customID === 'next' && page !== (pages.length - 1)) {
						page++

						await buttonCtx.editParent({
							embeds: [pages[page].embed],
							components: [
								categorySelectMenu,
								{
									type: ComponentType.ACTION_ROW,
									components: [
										PREVIOUS_BUTTON(false),
										NEXT_BUTTON(page === (pages.length - 1))
									]
								}
							]
						})
					}
					else if (buttonCtx.customID === 'category') {
						const newComponents: ComponentActionRow[] = [categorySelectMenu]
						pages = this.generatePages(allItems.filter(i => i.itemLevel <= userData.level && i.type === buttonCtx.values[0]), buttonCtx.values[0])
						page = 0

						if (pages.length > 1) {
							newComponents.push({
								type: ComponentType.ACTION_ROW,
								components: [
									PREVIOUS_BUTTON(true),
									NEXT_BUTTON(false)
								]
							})
						}

						await buttonCtx.editParent({
							embeds: [pages[0].embed],
							components: newComponents
						})
					}
				}
				catch (err) {
					// continue
				}
			})

			collector.on('end', async msg => {
				try {
					if (msg === 'time') {
						await botMessage.edit({
							content: `${icons.warning} Buttons timed out.`,
							embeds: [pages[page].embed],
							components: []
						})
					}
				}
				catch (err) {
					logger.warn(err)
				}
			})

			return
		}

		// item info command
		let item = getItem([ctx.options.info.item])

		if (!item) {
			// check if user was specifying an item ID
			const itemID = getNumber(ctx.options.info.item)

			if (!itemID) {
				const related = itemCorrector.getWord(ctx.options.info.item, 5)
				const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

				await ctx.send({
					content: relatedItem ? `${icons.information} Could not find an item matching that name. Did you mean ${getItemDisplay(relatedItem)}?` : `${icons.warning} Could not find an item matching that name.`
				})
				return
			}

			const backpackRows = await getUserBackpack(query, ctx.user.id)
			const userBackpackData = getItems(backpackRows)
			const itemToCheck = userBackpackData.items.find(itm => itm.row.id === itemID)

			if (!itemToCheck) {
				await ctx.send({
					content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
				})
				return
			}

			item = itemToCheck.item
		}

		const itemFixed = item
		const itemEmbed = this.getItemEmbed(itemFixed)
		const botMessage = await ctx.send({
			embeds: [itemEmbed.embed],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GRAY_BUTTON('Where can I find this item?', 'find')]
			}]
		}) as Message

		const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => true, 60000)

		collector.on('collect', async buttonCtx => {
			try {
				if (buttonCtx.customID === 'find') {
					const obtainedFrom: { [key: string]: string[] } = allLocations.reduce((prev, curr) => ({ ...prev, [curr.display]: [] }), {})

					for (const loc of allLocations) {
						for (const area of loc.areas) {
							if (area.loot.common.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Commonly found from scavenging **${area.display}**.`)
							}
							else if (area.loot.uncommon.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Uncommonly found from scavenging **${area.display}**.`)
							}
							else if (area.loot.rare.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Rarely found from scavenging **${area.display}**.`)
							}
							else if (area.loot.rarest?.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Very rarely found from scavenging **${area.display}**.`)
							}
							else if (area.requiresKey && area.keyIsOptional && area.specialLoot.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Commonly found from scavenging **${area.display}** if you have a ${combineArrayWithOr(area.requiresKey.map(key => getItemDisplay(key)))}.`)
							}

							if (area.npcSpawns) {
								for (const npc of area.npcSpawns) {
									if (
										(npc.armor && npc.armor.name === itemFixed.name) ||
										(npc.helmet && npc.helmet.name === itemFixed.name) ||
										(npc.type === 'raider' && npc.weapon.name === itemFixed.name) ||
										(npc.type === 'raider' && 'ammo' in npc && npc.ammo.name === itemFixed.name) ||
										(npc.drops.common.find(i => i.name === itemFixed.name)) ||
										(npc.drops.uncommon.find(i => i.name === itemFixed.name)) ||
										(npc.drops.rare.find(i => i.name === itemFixed.name))
									) {
										obtainedFrom[loc.display].push(`${npc.boss ? `**${npc.display}**` : `A **${npc.display}**`} was spotted at **${area.display}** with this item.`)
									}
								}
							}
						}

						if (
							(loc.boss.armor && loc.boss.armor.name === itemFixed.name) ||
							(loc.boss.helmet && loc.boss.helmet.name === itemFixed.name) ||
							(loc.boss.type === 'raider' && loc.boss.weapon.name === itemFixed.name) ||
							(loc.boss.type === 'raider' && 'ammo' in loc.boss && loc.boss.ammo.name === itemFixed.name) ||
							(loc.boss.drops.common.find(i => i.name === itemFixed.name)) ||
							(loc.boss.drops.uncommon.find(i => i.name === itemFixed.name)) ||
							(loc.boss.drops.rare.find(i => i.name === itemFixed.name))
						) {
							obtainedFrom[loc.display].push(`**${loc.boss.display}** was spotted with this item, good luck trying to get it.`)
						}
					}

					const placesFound = Object.keys(obtainedFrom).reduce((prev, curr) => prev + obtainedFrom[curr].length, 0)
					if (!placesFound) {
						await buttonCtx.send({
							content: `${getItemDisplay(itemFixed)} cannot be found from scavenging!`,
							ephemeral: true
						})
						return
					}

					await buttonCtx.send({
						content: `${getItemDisplay(itemFixed)} can be found in the following areas:\n\n` +
							`${Object.keys(obtainedFrom).filter(loc => obtainedFrom[loc].length).map(loc => `__${loc}__\n${obtainedFrom[loc].join('\n')}`).join('\n\n')}`,
						ephemeral: true
					})
				}
			}
			catch (err) {
				// continue
			}
		})

		collector.on('end', msg => {
			if (msg === 'time') {
				botMessage.edit({
					components: []
				})
			}
		})
	}

	generatePages (items: Item[], category?: string): Embed[] {
		const pages = []
		const maxPage = Math.ceil(items.length / ITEMS_PER_PAGE) || 1
		const sortedItems = sortItemsByLevel(items, false, false)

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = sortedItems.slice(indexFirst, indexLast)

			const embed = new Embed()
				.setDescription(`${icons.information} This list only includes items you are a high enough level to discover. Level up to expand this list.` +
					`\n\n__**${category ? `${category} Item List**__ (${items.length} total)` : `Item List**__ (${items.length} total)`}` +
					`\n${filteredItems.map(itm => `${getItemDisplay(itm)} (Level **${itm.itemLevel}** item)`).join('\n') ||
					`You are not a high enough level to discover any ${category ? `**${category}**` : ''} items`}`)

			if (maxPage > 1) {
				embed.setFooter(`Page ${i}/${maxPage}`)
			}

			pages.push(embed)
		}

		return pages
	}

	getItemEmbed (item: Item): Embed {
		const itemEmbed = new Embed()
			.setDescription(getItemDisplay(item))
			.addField('Item Type', item.type === 'Throwable Weapon' ? `${item.type} (${item.subtype})` : item.type)
			.addField('Item Level', `Level **${item.itemLevel}**`)

		if (item.description) {
			itemEmbed.addField('Description', item.description)
		}

		itemEmbed.addField('Item Weight', `Uses **${item.slotsUsed}** slot${item.slotsUsed === 1 ? '' : 's'}`, true)

		if (item.sellPrice) {
			if (item.type !== 'Collectible') {
				const potentialSell = {
					min: Math.floor(item.sellPrice * (shopSellMultiplier.min / 100)),
					max: Math.floor(item.sellPrice * (shopSellMultiplier.max / 100))
				}
				const potentialCost = {
					min: Math.floor(potentialSell.min * (shopBuyMultiplier.min / 100)),
					max: Math.floor(potentialSell.max * (shopBuyMultiplier.max / 100))
				}
				itemEmbed.addField('Buy Price', `Mint conditions seen in the market ranging from **${formatMoney(potentialCost.min)}** to **${formatMoney(potentialCost.max)}**`, true)
			}

			itemEmbed.addField('Sell Price', formatMoney(Math.floor(item.sellPrice * this.app.currentShopSellMultiplier)), true)
		}

		if (item.durability) {
			itemEmbed.addField('Max Uses', `Can be used up to **${item.durability}** times`, true)
		}

		switch (item.type) {
			case 'Backpack': {
				itemEmbed.addField('Carry Capacity', `Adds ***+${item.slots}*** slots`, true)
				break
			}
			case 'Ammunition': {
				if (item.spreadsDamageToLimbs) {
					itemEmbed.addField('Damage', `${item.damage} (${Math.round(item.damage / item.spreadsDamageToLimbs)} x ${item.spreadsDamageToLimbs} limbs)`, true)
					itemEmbed.addField('Special', `Spreads damage across **${item.spreadsDamageToLimbs}** limbs.`, true)
				}
				else {
					itemEmbed.addField('Damage', item.damage.toString(), true)
				}
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				itemEmbed.addField('Ammo For', item.ammoFor.map(itm => getItemDisplay(itm)).join('\n'), true)
				break
			}
			case 'Melee Weapon': {
				itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
				itemEmbed.addField('Damage', item.damage.toString(), true)
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				break
			}
			case 'Throwable Weapon': {
				itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
				if (item.spreadsDamageToLimbs) {
					itemEmbed.addField('Damage', `${item.damage} (${Math.round(item.damage / item.spreadsDamageToLimbs)} x ${item.spreadsDamageToLimbs} limbs)`, true)
					itemEmbed.addField('Special', `Spreads damage across **${item.spreadsDamageToLimbs}** limbs.`, true)
				}
				else {
					itemEmbed.addField('Damage', item.damage.toString(), true)
				}
				if (item.subtype === 'Incendiary Grenade') {
					itemEmbed.addField('Applies Affliction', `${icons.burning} Burning (+25% damage taken)`, true)
				}
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				break
			}
			case 'Ranged Weapon': {
				const ammunition = sortItemsByAmmo(allItems.filter(itm => itm.type === 'Ammunition' && itm.ammoFor.includes(item))) as Ammunition[]

				itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				itemEmbed.addField('Compatible Ammo', ammunition.map(itm => `${getItemDisplay(itm)} (${itm.spreadsDamageToLimbs ?
					`**${Math.round(itm.damage / itm.spreadsDamageToLimbs)} x ${itm.spreadsDamageToLimbs}** damage` :
					`**${itm.damage}** damage`}, **${itm.penetration}** armor penetration)`).join('\n'))
				break
			}
			case 'Body Armor': {
				itemEmbed.addField('Armor Level', `Level **${item.level}** protection.\n\n${icons.information} Reduces damage from weapons/ammo with a penetration below **${item.level.toFixed(2)}**`)
				break
			}
			case 'Helmet': {
				itemEmbed.addField('Armor Level', `Level **${item.level}** protection.\n\n${icons.information} Reduces damage from weapons/ammo with a penetration below **${item.level.toFixed(2)}**`)
				break
			}
			case 'Stimulant': {
				const effectsDisplay = getEffectsDisplay(item.effects)

				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				itemEmbed.addField('Gives Effects', effectsDisplay.join('\n'), true)
				break
			}
			case 'Medical': {
				const curesAfflictions = []

				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				itemEmbed.addField('Heals For', `${item.healsFor} health`, true)

				if (item.curesBitten) {
					curesAfflictions.push(`${icons.biohazard} Bitten`)
				}
				if (item.curesBrokenArm) {
					curesAfflictions.push('🦴 Broken Arm')
				}

				if (curesAfflictions.length) {
					itemEmbed.addField('Cures Afflictions', curesAfflictions.join('\n'), true)
				}
				break
			}
			case 'Food': {
				itemEmbed.addField('Reduces Hunger', `Reduces companion hunger by **${item.reducesHunger}**`, true)
				break
			}
			case 'Key': {
				const usableAreas = []

				for (const location of allLocations) {
					for (const area of location.areas) {
						if (area.requiresKey?.includes(item)) {
							usableAreas.push(`${area.display} (${location.display})`)
						}
					}
				}

				itemEmbed.addField('Used to Scavenge', usableAreas.join('\n'), true)
			}
		}

		return itemEmbed
	}

	getCategoryDescription (category: ItemType): string {
		switch (category) {
			case 'Ammunition': {
				return 'Ammo used to fire Ranged Weapons.'
			}
			case 'Backpack': {
				return 'Equippable items that increase inventory space.'
			}
			case 'Helmet':
			case 'Body Armor': {
				return 'Equippable items that reduce damage from attacks.'
			}
			case 'Collectible': {
				return 'Rare items worth collecting.'
			}
			case 'Food': {
				return 'Items used to feed your companion.'
			}
			case 'Key': {
				return 'Items used to scavenge locked areas.'
			}
			case 'Medical': {
				return 'Items used to heal yourself'
			}
			case 'Melee Weapon': {
				return 'Weapons that can be used without ammunition.'
			}
			case 'Ranged Weapon': {
				return 'Weapons that fire ammunition.'
			}
			case 'Throwable Weapon': {
				return 'Weapons such as grenades that can be thrown.'
			}
			case 'Stimulant': {
				return 'Injectors used for temporary stat boosts during fights.'
			}
		}
	}

	async autocomplete (ctx: AutocompleteContext): Promise<void> {
		const search = ctx.options.info[ctx.focused].replace(/ +/g, '_').toLowerCase()
		const items = allItems.filter(itm => itm.name.toLowerCase().includes(search) || itm.type.toLowerCase().includes(search))

		if (items.length) {
			await ctx.sendResults(items.slice(0, 25).map(itm => ({ name: `${itm.type} - ${itm.name.replace(/_/g, ' ')}`, value: itm.name })))
		}
		else {
			const related = itemCorrector.getWord(search, 5)
			const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

			if (relatedItem) {
				await ctx.sendResults([{ name: `${relatedItem.type} - ${relatedItem.name.replace(/_/g, ' ')}`, value: relatedItem.name }])
			}
			else {
				await ctx.sendResults([])
			}
		}
	}
}

export default ItemCommand
