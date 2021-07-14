import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { getUserRow } from '../utils/db/players'
import { query } from '../utils/db/mysql'
import { getMember } from '../utils/argParsers'
import { BackpackItemRow } from '../types/mysql'
import Embed from '../structures/Embed'
import { Member } from 'eris'
import { getUserBackpack } from '../utils/db/items'
import { getBackpackLimit, getEquips, getItems } from '../utils/itemUtils'

const ITEMS_PER_PAGE = 10

export const command: Command = {
	name: 'backpack',
	aliases: ['inventory', 'inv', 'bp'],
	examples: ['backpack @blobfysh'],
	description: 'View the items in your backpack. Your backpack is different from your stash in that the items in your backpack are taken with you into raids.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	worksInDMs: false,
	canBeUsedInRaid: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const member = getMember(message.channel.guild, args)

		if (!member && args.length) {
			await reply(message, {
				content: '❌ Could not find anyone matching that description!\nYou can mention someone, use their Discord#tag, or type their user ID'
			})
			return
		}
		else if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await reply(message, {
					content: `❌ **${member.username}#${member.discriminator}** does not have an account!`
				})
				return
			}

			const userBackpack = await getUserBackpack(query, member.id)
			const pages = generatePages(member, userBackpack, prefix)

			if (pages.length === 1) {
				await reply(message, {
					embed: pages[0].embed
				})
			}
			else {
				await app.btnCollector.paginate(message, pages)
			}
			return
		}

		const userBackpack = await getUserBackpack(query, message.author.id)
		const pages = generatePages(message.member, userBackpack, prefix)

		if (pages.length === 1) {
			await reply(message, {
				embed: pages[0].embed
			})
		}
		else {
			await app.btnCollector.paginate(message, pages)
		}
	}
}

function generatePages (member: Member, rows: BackpackItemRow[], prefix: string): Embed[] {
	const itemData = getItems(rows)
	const equips = getEquips(rows)
	const pages = []
	const maxPage = Math.ceil(itemData.items.length / ITEMS_PER_PAGE) || 1

	for (let i = 1; i < maxPage + 1; i++) {
		const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
		const indexLast = ITEMS_PER_PAGE * i
		const filteredItems = itemData.items.slice(indexFirst, indexLast)

		const embed = new Embed()
			.setAuthor(`${member.username}#${member.discriminator}'s Backpack Inventory`, member.avatarURL)
			.setDescription(`__**Equips**__\n**Backpack**: ${equips.backpack ? `${equips.backpack.item.icon}\`${equips.backpack.item.name}\` (ID: \`${equips.backpack.row.id}\`)` : `None, equip one with \`${prefix}equip <item id>\``}\n` +
				`**Helmet**: ${equips.helmet ? `${equips.helmet.item.icon}\`${equips.helmet.item.name}\` (ID: \`${equips.helmet.row.id}\`, **${equips.helmet.row.durability}** uses left)` : `None, equip one with \`${prefix}equip <item id>\``}\n` +
				`**Armor**: ${equips.armor ? `${equips.armor.item.icon}\`${equips.armor.item.name}\` (ID: \`${equips.armor.row.id}\`, **${equips.armor.row.durability}** uses left)` : `None, equip one with \`${prefix}equip <item id>\``}\n` +
				`**Weapon**: ${equips.weapon ? `${equips.weapon.item.icon}\`${equips.weapon.item.name}\` (ID: \`${equips.weapon.row.id}\`, **${equips.weapon.row.durability}** uses left)` : `None, equip one with \`${prefix}equip <item id>\``}\n\n` +
				`__**Items in Backpack**__ (Space: ${itemData.slotsUsed} / ${getBackpackLimit(equips.backpack?.item)})\n` +
				`${filteredItems.map(itm => `${itm.item.icon}\`${itm.item.name}\` (ID: \`${itm.row.id}\`${itm.row.durability ? `, **${itm.row.durability}** uses left` : ''})`).join('\n') || `No items found. Move items from your stash to your backpack with \`${prefix}stash take <item id>\`.`}`)

		pages.push(embed)
	}

	return pages
}
