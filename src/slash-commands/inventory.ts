import { CommandOptionType, SlashCreator, CommandContext, User } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { BackpackItemRow, UserRow } from '../types/mysql'
import { getUserBackpack } from '../utils/db/items'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { formatHealth } from '../utils/stringUtils'
import { getBackpackLimit, getEquips, getItemDisplay, getItems, sortItemsByName } from '../utils/itemUtils'
import { getPlayerXp } from '../utils/playerUtils'

const ITEMS_PER_PAGE = 10

class InventoryCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'inventory',
			description: 'View your player inventory including items, equips, health, and level.',
			longDescription: 'View your player inventory. Your inventory is different from your stash in that the items in your inventory are taken with you into raids.' +
				' If you die in a raid, you will lose the items in your inventory.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check inventory of.',
				required: false
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
		// using resolved members instead of users to enforce the user being in same guild command is used in
		// this resolved data is REALLY nice btw
		const member = ctx.members.get(ctx.options.user)

		if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await ctx.send({
					content: `${icons.warning} **${member.displayName}** does not have an account!`
				})
				return
			}

			const userBackpack = await getUserBackpack(query, member.id)
			const pages = this.generatePages(member, userBackpack, userData)

			if (pages.length === 1) {
				await ctx.send({
					embeds: [pages[0].embed]
				})
			}
			else {
				await this.app.componentCollector.paginateEmbeds(ctx, pages)
			}
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!
		const userBackpack = await getUserBackpack(query, ctx.user.id)
		const pages = this.generatePages(ctx.member || ctx.user, userBackpack, userData)

		if (pages.length === 1) {
			await ctx.send({
				embeds: [pages[0].embed]
			})
		}
		else {
			await this.app.componentCollector.paginateEmbeds(ctx, pages)
		}
	}

	generatePages (member: ResolvedMember | User, rows: BackpackItemRow[], userData: UserRow): Embed[] {
		const user = 'user' in member ? member.user : member
		const userDisplay = 'user' in member ? member.displayName : `${user.username}#${user.discriminator}`
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
				.setAuthor(`${userDisplay}'s Inventory`, user.avatarURL)
				.addField('__Health__', `**${userData.health} / ${userData.maxHealth}** HP (+5HP/5 mins)\n${formatHealth(userData.health, userData.maxHealth)}`, true)
				.addField('__Experience__', `**Level**: ${userData.level}\n**XP**: ${playerXp.relativeLevelXp} / ${playerXp.levelTotalXpNeeded} xp`, true)
				.addField('__Equips__', 'Equip an item with `/equip <item id>`.\n' +
					`**Backpack**: ${equips.backpack ? getItemDisplay(equips.backpack.item, equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}\n` +
					`**Helmet**: ${equips.helmet ? getItemDisplay(equips.helmet.item, equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}\n` +
					`**Body Armor**: ${equips.armor ? getItemDisplay(equips.armor.item, equips.armor.row, { showEquipped: false, showID: false }) : 'None'}\n` +
					`**Weapon**: ${equips.weapon ? getItemDisplay(equips.weapon.item, equips.weapon.row, { showEquipped: false, showID: false }) : 'None'}`)
				.addField(`__Items in Inventory__ (Space: ${itemData.slotsUsed} / ${getBackpackLimit(equips.backpack?.item)})`, filteredItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n') || 'No items found. Move items from your stash to your inventory with `/stash take <item id>`.')
			pages.push(embed)
		}

		return pages
	}
}

export default InventoryCommand
