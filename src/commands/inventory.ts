import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { getUserRow } from '../utils/db/players'
import { query } from '../utils/db/mysql'
import { getMember } from '../utils/argParsers'
import { BackpackItemRow, UserRow } from '../types/mysql'
import Embed from '../structures/Embed'
import { Member } from 'eris'
import { getUserBackpack } from '../utils/db/items'
import { getBackpackLimit, getEquips, getItemDisplay, getItems, sortItemsByName } from '../utils/itemUtils'
import formatHealth from '../utils/formatHealth'
import { getPlayerXp } from '../utils/playerUtils'

const ITEMS_PER_PAGE = 10

export const command: Command = {
	name: 'inventory',
	aliases: ['backpack', 'inv', 'bp'],
	examples: ['inventory @blobfysh'],
	description: 'View a players inventory. Your inventory is different from your stash in that the items in your inventory are taken with you into raids. If you die in a raid, you will lose the items in your inventory.',
	shortDescription: 'View your player inventory.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute (app, message, { args, prefix }) {
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
			const pages = generatePages(member, userBackpack, userData, prefix)

			if (pages.length === 1) {
				await reply(message, {
					embed: pages[0].embed
				})
			}
			else {
				await app.componentCollector.paginateEmbeds(message, pages)
			}
			return
		}

		const userData = (await getUserRow(query, message.author.id))!
		const userBackpack = await getUserBackpack(query, message.author.id)
		const pages = generatePages(message.member, userBackpack, userData, prefix)

		if (pages.length === 1) {
			await reply(message, {
				embed: pages[0].embed
			})
		}
		else {
			await app.componentCollector.paginateEmbeds(message, pages)
		}
	}
}

function generatePages (member: Member, rows: BackpackItemRow[], userData: UserRow, prefix: string): Embed[] {
	const itemData = getItems(rows)
	const playerXp = getPlayerXp(userData.xp, userData.level)
	const equips = getEquips(rows)
	const sortedItems = sortItemsByName(itemData.items, true)
	const pages = []
	const maxPage = Math.ceil(sortedItems.length / ITEMS_PER_PAGE) || 1

	for (let i = 1; i < maxPage + 1; i++) {
		const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
		const indexLast = ITEMS_PER_PAGE * i
		const filteredItems = sortedItems.slice(indexFirst, indexLast)

		const embed = new Embed()
			.setAuthor(`${member.username}#${member.discriminator}'s Inventory`, member.avatarURL)
			.addField('__Health__', `**${userData.health} / ${userData.maxHealth}** HP\n${formatHealth(userData.health, userData.maxHealth)}`, true)
			.addField('__Experience__', `**Level**: ${userData.level}\n**XP**: ${playerXp.relativeLevelXp} / ${playerXp.levelTotalXpNeeded} xp`, true)
			.addField('__Equips__', `Equip an item with \`${prefix}equip <item id>\`.\n` +
				`**Backpack**: ${equips.backpack ? getItemDisplay(equips.backpack.item, equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}\n` +
				`**Helmet**: ${equips.helmet ? getItemDisplay(equips.helmet.item, equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}\n` +
				`**Body Armor**: ${equips.armor ? getItemDisplay(equips.armor.item, equips.armor.row, { showEquipped: false, showID: false }) : 'None'}\n` +
				`**Weapon**: ${equips.weapon ? getItemDisplay(equips.weapon.item, equips.weapon.row, { showEquipped: false, showID: false }) : 'None'}`)
			.addField(`__Items in Inventory__ (Space: ${itemData.slotsUsed} / ${getBackpackLimit(equips.backpack?.item)})`, filteredItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || `No items found. Move items from your stash to your inventory with \`${prefix}stash take <item id>\`.`)
		pages.push(embed)
	}

	return pages
}
