import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { getUserBackpack, unequipItem } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { getEquips, getItemDisplay } from '../utils/itemUtils'

class UnequipCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'unequip',
			description: 'Unequip an equipped item from your scavenger.',
			longDescription: 'Unequip an equipped item from your scavenger.',
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'type',
					description: 'Type of item to unequip.',
					required: true,
					choices: [
						{
							name: 'Armor',
							value: 'armor'
						},
						{
							name: 'Helmet',
							value: 'helmet'
						},
						{
							name: 'Weapon',
							value: 'weapon'
						},
						{
							name: 'Backpack',
							value: 'backpack'
						}
					]
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const itemType = ctx.options.type

		const transaction = await beginTransaction()
		const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
		const equips = getEquips(backpackRows)

		let unequippedItem

		if (equips.backpack && itemType === 'backpack') {
			unequippedItem = equips.backpack
			await unequipItem(transaction.query, equips.backpack.row.id)
		}
		else if (equips.weapon && itemType === 'weapon') {
			unequippedItem = equips.weapon
			await unequipItem(transaction.query, equips.weapon.row.id)
		}
		else if (equips.helmet && itemType === 'helmet') {
			unequippedItem = equips.helmet
			await unequipItem(transaction.query, equips.helmet.row.id)
		}
		else if (equips.armor && itemType === 'armor') {
			unequippedItem = equips.armor
			await unequipItem(transaction.query, equips.armor.row.id)
		}

		if (!unequippedItem) {
			await transaction.commit()

			await ctx.send({
				content: `${icons.warning} You don't have an item of type **${itemType}** equipped. You can find your equipped items in your \`/inventory\`.`
			})
			return
		}

		await transaction.commit()

		await ctx.send({
			content: `${icons.checkmark} Successfully unequipped ${getItemDisplay(unequippedItem.item, unequippedItem.row, { showEquipped: false })}.`
		})
	}
}

export default UnequipCommand
