import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { allItems } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Item } from '../types/Items'
import { getItem, getNumber } from '../utils/argParsers'
import { getUserBackpack } from '../utils/db/items'
import { query } from '../utils/db/mysql'
import formatNumber from '../utils/formatNumber'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { isRaidGuild } from '../utils/raidUtils'

const itemCorrector = new Corrector([...allItems.map(itm => itm.name), ...allItems.map(itm => itm.aliases).flat(1)])

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
				required: true
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
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

				await ctx.send({
					content: related ? `${icons.information} Could not find an item matching that name. Did you mean \`${related}\`?` : `${icons.warning} Could not find an item matching that name.`
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
			.addField('Item Type', item.type)

		if (item.description) {
			itemEmbed.addField('Description', item.description)
		}

		itemEmbed.addField('Item Weight', `Uses **${item.slotsUsed}** slot${item.slotsUsed === 1 ? '' : 's'}`, true)
		itemEmbed.addField('Level Required to Purchase', `Level **${item.itemLevel}**`, true)

		if (item.buyPrice) {
			itemEmbed.addField('Buy Price', formatNumber(item.buyPrice), true)
		}

		if (item.sellPrice) {
			itemEmbed.addField('Sell Price', formatNumber(Math.floor(item.sellPrice * this.app.shopSellMultiplier)), true)
		}

		switch (item.type) {
			case 'Backpack': {
				itemEmbed.addField('Carry Capacity', `Adds ***+${item.slots}*** slots`, true)
				break
			}
			case 'Ammunition': {
				itemEmbed.addField('Damage', item.damage.toString(), true)
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				itemEmbed.addField('Ammo For', item.ammoFor.map(itm => getItemDisplay(itm)).join('\n'), true)
				break
			}
			case 'Melee Weapon': {
				itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
				itemEmbed.addField('Attack Rate', `${item.fireRate} seconds`, true)
				itemEmbed.addField('Damage', item.damage.toString(), true)
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				break
			}
			case 'Ranged Weapon': {
				const ammunition = allItems.filter(itm => itm.type === 'Ammunition' && itm.ammoFor.includes(item))

				itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
				itemEmbed.addField('Attack Rate', `${item.fireRate} seconds`, true)
				itemEmbed.addField('Compatible Ammo', ammunition.map(itm => getItemDisplay(itm)).join('\n'), true)
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
				itemEmbed.addField('Heals For', `${item.healsFor} health`, true)
				itemEmbed.addField('Healing Rate', `${item.healRate} seconds`, true)
			}
		}

		return itemEmbed
	}
}

export default ItemCommand
