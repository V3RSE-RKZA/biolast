import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { allItems } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { getItem } from '../utils/argParsers'
import formatNumber from '../utils/formatNumber'
import { getItemDisplay } from '../utils/itemUtils'

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
			const related = itemCorrector.getWord(ctx.options.item, 5)

			// TODO show results for items that were related to users input (if any)
			await ctx.send({
				content: related ? `❌ Could not find an item matching that name. Did you mean \`${related}\`?` : '❌ Could not find an item matching that name.'
			})
			return
		}

		const itemEmbed = new Embed()
			.setDescription(getItemDisplay(item))
			.addField('Item Type', item.type)

		if (item.description) {
			itemEmbed.addField('Description', item.description)
		}

		itemEmbed.addField('Item Weight', `Uses **${item.slotsUsed}** slot${item.slotsUsed === 1 ? '' : 's'}`, true)

		if (item.buyPrice) {
			itemEmbed.addField('Buy Price', formatNumber(item.buyPrice), true)
		}

		if (item.sellPrice) {
			itemEmbed.addField('Sell Price', formatNumber(Math.floor(item.sellPrice * this.app.shopSellMultiplier)), true)
		}

		if (item.type === 'Backpack') {
			itemEmbed.addField('Carry Capacity', `Adds ***+${item.slots}*** slots`, true)
		}

		if (item.type === 'Ammunition') {
			itemEmbed.addField('Damage', item.damage.toString(), true)
			itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
			itemEmbed.addField('Ammo For', item.ammoFor.map(itm => getItemDisplay(itm)).join('\n'), true)
		}

		if (item.type === 'Melee Weapon') {
			itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
			itemEmbed.addField('Attack Rate', `${item.fireRate} seconds`, true)
			itemEmbed.addField('Damage', item.damage.toString(), true)
			itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
		}

		if (item.type === 'Ranged Weapon') {
			const ammunition = allItems.filter(itm => itm.type === 'Ammunition' && itm.ammoFor.includes(item))

			itemEmbed.addField('Accuracy', `${item.accuracy}%`, true)
			itemEmbed.addField('Attack Rate', `${item.fireRate} seconds`, true)
			itemEmbed.addField('Compatible Ammo', ammunition.map(itm => getItemDisplay(itm)).join('\n'), true)
		}

		if (item.type === 'Body Armor') {
			itemEmbed.addField('Armor Level', item.level.toString(), true)
		}

		if (item.type === 'Helmet') {
			itemEmbed.addField('Armor Level', item.level.toString(), true)
		}

		if (item.type === 'Medical') {
			itemEmbed.addField('Heals For', `${item.healsFor} health`, true)
			itemEmbed.addField('Healing Rate', `${item.healRate} seconds`, true)
		}

		await ctx.send({
			embeds: [itemEmbed.embed]
		})
	}
}

export default ItemCommand
