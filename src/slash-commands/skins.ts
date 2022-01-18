import { CommandOptionType, SlashCreator, CommandContext, User, Message } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { SkinRow } from '../types/mysql'
import { getUserBackpack, getUserStash, setSkin } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { getItemDisplay, getItems } from '../utils/itemUtils'
import { deleteSkin, getUserSkins } from '../utils/db/skins'
import { getSkinAmounts, getSkinDisplay, getSkins } from '../utils/skinUtils'
import { skins } from '../resources/skins'
import { getSkin } from '../utils/argParsers'
import { getRarityDisplay } from '../utils/stringUtils'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { disableAllComponents } from '../utils/messageUtils'

const SKINS_PER_PAGE = 12

class SkinsCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'skins',
			description: 'View your skin inventory.',
			longDescription: 'View your skin inventory and apply skins to your items. Once you apply a skin to an item it **cannot** be removed.' +
				' Skins and items with skins can be traded to other players.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'inventory',
					description: 'View your skin inventory. Note: this only includes skins you have not applied to items.',
					options: [{
						type: CommandOptionType.USER,
						name: 'user',
						description: 'User to check skins of.',
						required: false
					}]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'apply',
					description: 'Apply a skin to an item in your inventory or stash.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'skin',
							description: 'Name of the skin.',
							required: true
						},
						{
							type: CommandOptionType.INTEGER,
							name: 'item',
							description: 'ID of the item.',
							required: true
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'info',
					description: 'View information about a skin such as rarity and who drew it.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'skin',
							description: 'Name of the skin.',
							required: true
						}
					]
				}
			],
			category: 'equipment',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (ctx.options.inventory) {
			const member = ctx.members.get(ctx.options.inventory.user)

			if (member) {
				const userData = await getUserRow(query, member.id)

				if (!userData) {
					await ctx.send({
						content: `${icons.warning} **${member.displayName}** does not have an account!`
					})
					return
				}

				const userSkins = await getUserSkins(query, member.id)
				const pages = this.generatePages(member, userSkins, false)

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

			const userSkins = await getUserSkins(query, ctx.user.id)
			const pages = this.generatePages(ctx.member || ctx.user, userSkins, true)

			if (pages.length === 1) {
				await ctx.send({
					embeds: [pages[0].embed]
				})
			}
			else {
				await this.app.componentCollector.paginateEmbeds(ctx, pages)
			}
		}
		else if (ctx.options.apply) {
			const skin = getSkin([ctx.options.apply.skin])
			const itemID = ctx.options.apply.item

			if (!skin) {
				await ctx.send({
					content: `${icons.warning} Could not find a skin matching that name. Check your skin inventory with \`/skins inventory\`.`
				})
				return
			}

			const preSkinRows = await getUserSkins(query, ctx.user.id)
			const preBackpackRows = await getUserBackpack(query, ctx.user.id)
			const preStashRows = await getUserStash(query, ctx.user.id)
			const preSkinData = getSkins(preSkinRows)
			const preStashData = getItems(preStashRows)
			const preBackpackData = getItems(preBackpackRows)
			const preSkinToUse = preSkinData.find(r => r.skin.name === skin.name)
			const preItemToSkin = preBackpackData.items.find(itm => itm.row.id === itemID) || preStashData.items.find(itm => itm.row.id === itemID)

			if (!preItemToSkin) {
				await ctx.send({
					content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory or stash. You can find the IDs of items in your \`/inventory\` or \`/stash\`.`
				})
				return
			}
			else if (!preSkinToUse) {
				await ctx.send({
					content: `${icons.warning} You own 0x ${getSkinDisplay(skin)} skins.`
				})
				return
			}
			else if (preSkinToUse.skin.skinFor.name !== preItemToSkin.item.name) {
				await ctx.send({
					content: `${icons.warning} The ${getSkinDisplay(skin)} skin can only be applied to ${getItemDisplay(preSkinToUse.skin.skinFor)}'s, not ${getItemDisplay(preItemToSkin.item)}'s.`
				})
				return
			}
			else if (preItemToSkin.row.skin === preSkinToUse.skin.name) {
				await ctx.send({
					content: `${icons.warning} Your ${getItemDisplay(preItemToSkin.item, preItemToSkin.row, { showEquipped: false, showDurability: false })} already has that skin.`
				})
				return
			}

			const botMessage = await ctx.send({
				content: `Apply ${getSkinDisplay(preSkinToUse.skin)} to your ${getItemDisplay(preItemToSkin.item, preItemToSkin.row, { showEquipped: false, showDurability: false })}?` +
					`\n\n${icons.warning} This action will remove **1x** ${getSkinDisplay(preSkinToUse.skin)} from your skin inventory, and **cannot be undone**.`,
				components: CONFIRM_BUTTONS
			}) as Message

			try {
				const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

				if (confirmed.customID === 'confirmed') {
					const transaction = await beginTransaction()
					const skinRows = await getUserSkins(transaction.query, ctx.user.id, true)
					const backpackRows = await getUserBackpack(transaction.query, ctx.user.id, true)
					const stashRows = await getUserStash(transaction.query, ctx.user.id, true)
					const userSkinData = getSkins(skinRows)
					const userStashData = getItems(stashRows)
					const userBackpackData = getItems(backpackRows)
					const skinToUse = userSkinData.find(r => r.skin.name === skin.name)
					const itemToSkin = userBackpackData.items.find(itm => itm.row.id === itemID) || userStashData.items.find(itm => itm.row.id === itemID)

					if (!itemToSkin) {
						await transaction.commit()

						await confirmed.editParent({
							content: `${icons.warning} You don't have an item with the ID **${itemID}** in your inventory or stash. You can find the IDs of items in your \`/inventory\` or \`/stash\`.`,
							components: []
						})
						return
					}
					else if (!skinToUse) {
						await transaction.commit()

						await confirmed.editParent({
							content: `${icons.warning} You own 0x ${getSkinDisplay(skin)} skins.`,
							components: []
						})
						return
					}
					else if (itemToSkin.row.skin === skinToUse.skin.name) {
						await transaction.commit()

						await confirmed.editParent({
							content: `${icons.warning} Your ${getItemDisplay(itemToSkin.item, itemToSkin.row, { showEquipped: false, showDurability: false })} already has that skin.`,
							components: []
						})
						return
					}

					await deleteSkin(transaction.query, skinToUse.row.id)
					await setSkin(transaction.query, itemToSkin.row.id, skinToUse.skin.name)
					await transaction.commit()

					const itemDisplay = getItemDisplay(itemToSkin.item, {
						...itemToSkin.row,
						skin: skinToUse.skin.name
					}, { showEquipped: false, showDurability: false })

					await confirmed.editParent({
						content: `${icons.checkmark} Applied the ${getSkinDisplay(skin)} skin to your ${itemDisplay}.`,
						components: []
					})
				}
				else {
					await botMessage.delete()
				}
			}
			catch (err) {
				await botMessage.edit({
					content: `${icons.danger} Command timed out.`,
					components: disableAllComponents(botMessage.components)
				})
			}
		}
		else if (ctx.options.info) {
			const skin = getSkin([ctx.options.info.skin])

			if (!skin) {
				await ctx.send({
					content: `${icons.warning} Could not find a skin matching that name.`
				})
				return
			}

			const skinRows = await getUserSkins(query, ctx.user.id)
			const skinsOwned = getSkinAmounts(skinRows)
			const skinArtist = skin.artist && await this.app.fetchUser(skin.artist)

			const skinEmbed = new Embed()
				.setDescription(`${getSkinDisplay(skin)} (You own **${skinsOwned[skin.name] || 0}x**)`)
				.setFooter('Feel free to join the official server and submit your own skins!')
				.addField('Rarity', getRarityDisplay(skin.rarity))
				.addField('Skin For', getItemDisplay(skin.skinFor), true)

			if (skinArtist) {
				skinEmbed.addField('Artist', `Made by **${skinArtist.username}#${skinArtist.discriminator}**`, true)
			}

			await ctx.send({
				embeds: [skinEmbed.embed]
			})
		}
	}

	generatePages (member: ResolvedMember | User, rows: SkinRow[], isSelf: boolean): Embed[] {
		const user = 'user' in member ? member.user : member
		const userDisplay = 'user' in member ? member.displayName : `${user.username}#${user.discriminator}`
		const skinsOwned = getSkins(rows)
		const skinData = getSkinAmounts(rows)
		const sortedSkinNames = Object.keys(skinData).sort((a, b) => a.localeCompare(b))
		const pages = []
		const maxPage = Math.ceil(sortedSkinNames.length / SKINS_PER_PAGE) || 1

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (SKINS_PER_PAGE * i) - SKINS_PER_PAGE
			const indexLast = SKINS_PER_PAGE * i
			const filteredSkins = sortedSkinNames.slice(indexFirst, indexLast)
			const skinsDisplay = filteredSkins.map(skn => {
				const skin = skins.find(s => s.name === skn)

				if (skin) {
					return `**${skinData[skn]}x** ${getSkinDisplay(skin)} (skin for ${getItemDisplay(skin.skinFor)})`
				}
			}).filter(Boolean)

			const embed = new Embed()
				.setAuthor(`${userDisplay}'s Skin Inventory`, user.avatarURL)
				.setDescription(`**Number of Skins Owned**: ${skinsOwned.length}` +
				`\n\n${skinsDisplay.join('\n') || `${isSelf ? 'You don\'t own any skins.' : `${userDisplay} does not own any skins.`}`}`)

			if (isSelf) {
				embed.setFooter('Use /skins apply to apply a skin to an item.')
			}

			pages.push(embed)
		}

		return pages
	}
}

export default SkinsCommand
