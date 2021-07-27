import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { getItem } from '../utils/argParsers'
import Embed from '../structures/Embed'
import formatNumber from '../utils/formatNumber'
import { allItems } from '../resources/items'
import { getItemDisplay } from '../utils/itemUtils'

export const command: Command = {
	name: 'item',
	aliases: ['info'],
	examples: ['item ai-2'],
	description: 'View information about an item.',
	shortDescription: 'View information about an item.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	cooldown: 2,
	worksInDMs: true,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const item = getItem(args)

		if (!args.length) {
			await reply(message, {
				content: `❌ You need to specify an item to search. \`${prefix}item <item name>\``
			})
			return
		}
		else if (!item) {
			await reply(message, {
				content: '❌ Could not find an item matching that name.'
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
			itemEmbed.addField('Sell Price', formatNumber(item.sellPrice), true)
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
			itemEmbed.addField('Attack Rate', '30 seconds', true)
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

		await reply(message, {
			embed: itemEmbed.embed
		})
	}
}
