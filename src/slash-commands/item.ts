import { CommandOptionType, SlashCreator, CommandContext, AutocompleteContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { allItems } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Ammunition, Item } from '../types/Items'
import { getItem, getNumber } from '../utils/argParsers'
import { getUserBackpack } from '../utils/db/items'
import { query } from '../utils/db/mysql'
import { formatMoney } from '../utils/stringUtils'
import { getItemDisplay, getItems, sortItemsByAmmo } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { isRaidGuild } from '../utils/raidUtils'
import { formatTime } from '../utils/db/cooldowns'
import { allLocations } from '../resources/raids'
import { getEffectsDisplay } from '../utils/playerUtils'

const itemCorrector = new Corrector([...allItems.map(itm => itm.name.toLowerCase()), ...allItems.map(itm => itm.aliases.map(a => a.toLowerCase())).flat(1)])

class ItemCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'item',
			description: 'View information about an item.',
			longDescription: 'View information about an item.',
			options: [{
				type: CommandOptionType.STRING,
				name: 'item',
				description: 'Name of the item.',
				required: true,
				autocomplete: true
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const item = getItem([ctx.options.item])

		if (!item) {
			// check if user was specifying an item ID
			const itemID = getNumber(ctx.options.item)

			if (itemID) {
				const backpackRows = await getUserBackpack(query, ctx.user.id)
				const userBackpackData = getItems(backpackRows)
				const itemToCheck = userBackpackData.items.find(itm => itm.row.id === itemID)

				if (!itemToCheck) {
					await ctx.send({
						content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory. You can find the IDs of items in your \`/inventory\`.`
					})
					return
				}

				const itemEmbed = this.getItemEmbed(itemToCheck.item)

				await ctx.send({
					embeds: [itemEmbed.embed]
				})
			}
			else {
				const related = itemCorrector.getWord(ctx.options.item, 5)
				const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

				await ctx.send({
					content: relatedItem ? `${icons.information} Could not find an item matching that name. Did you mean ${getItemDisplay(relatedItem)}?` : `${icons.warning} Could not find an item matching that name.`
				})

				// auto-delete message if in raid server so that users can't use the slash command options to communicate with each other.
				if (isRaidGuild(ctx.guildID)) {
					setTimeout(async () => {
						try {
							await ctx.delete()
						}
						catch (err) {
							logger.warn(err)
						}
					}, 3000)
				}
			}

			return
		}

		const itemEmbed = this.getItemEmbed(item)

		await ctx.send({
			embeds: [itemEmbed.embed]
		})
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

		if (item.buyPrice) {
			itemEmbed.addField('Buy Price', formatMoney(item.buyPrice), true)
		}

		if (item.sellPrice) {
			itemEmbed.addField('Sell Price', formatMoney(Math.floor(item.sellPrice * this.app.shopSellMultiplier)), true)
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
				break
			}
			case 'Ranged Weapon': {
				const ammunition = sortItemsByAmmo(allItems.filter(itm => itm.type === 'Ammunition' && itm.ammoFor.includes(item))) as Ammunition[]

				itemEmbed.addField('Speed', `${item.speed}\n\nDetermines who turn order in duels.`, true)
				itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
				itemEmbed.addField('Compatible Ammo', ammunition.map(itm => `${getItemDisplay(itm)} (${itm.spreadsDamageToLimbs ? `**${Math.round(itm.damage / itm.spreadsDamageToLimbs)} x ${itm.spreadsDamageToLimbs}** damage` : `**${itm.damage}** damage`})`).join('\n'))
				break
			}
			case 'Body Armor': {
				itemEmbed.addField('Armor Level', item.level.toString(), true)
				break
			}
			case 'Helmet': {
				itemEmbed.addField('Armor Level', item.level.toString(), true)
				break
			}
			case 'Medical': {
				if (item.subtype === 'Stimulant') {
					const effectsDisplay = getEffectsDisplay(item.effects)

					itemEmbed.addField('Gives Effects', effectsDisplay.join('\n'), true)
				}
				else {
					const curesAfflictions = []

					itemEmbed.addField('Heals For', `${item.healsFor} health`, true)
					itemEmbed.addField('Healing Rate', formatTime(item.healRate * 1000), true)

					if (item.curesBitten) {
						curesAfflictions.push(`${icons.biohazard} Bitten`)
					}
					if (item.curesBrokenArm) {
						curesAfflictions.push('🦴 Broken Arm')
					}
					if (curesAfflictions.length) {
						itemEmbed.addField('Cures Afflictions', curesAfflictions.join('\n'), true)
					}
				}
				break
			}
			case 'Food': {
				itemEmbed.addField('Reduces Hunger', `Reduces companion hunger by **${item.reducesHunger}**`, true)
				break
			}
			case 'Key': {
				const usableChannels = []

				for (const location of allLocations) {
					for (const channel of location.channels) {
						if (channel.scavange && channel.scavange.requiresKey?.includes(item)) {
							usableChannels.push(channel)
						}
					}
				}

				itemEmbed.addField('Used to Scavenge', usableChannels.map(chan => chan.display).join('\n'), true)
			}
		}

		return itemEmbed
	}

	async autocomplete (ctx: AutocompleteContext): Promise<void> {
		const search = ctx.options[ctx.focused].replace(/ +/g, '_')
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
