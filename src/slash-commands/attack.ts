import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { allItems } from '../resources/items'
import { allNPCs } from '../resources/npcs'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Ammunition } from '../types/Items'
import { createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { createItem, deleteItem, dropItemToGround, getGroundItems, getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { deleteNPC, getNPC, lowerHealth as lowerNPCHealth } from '../utils/db/npcs'
import { addXp, getUserRow, lowerHealth } from '../utils/db/players'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import formatHealth from '../utils/formatHealth'
import { getEquips, getItemDisplay, getItems, sortItemsByAmmo } from '../utils/itemUtils'
import { messageUser } from '../utils/messageUtils'
import { BodyPart, getAttackDamage, getBodyPartHit } from '../utils/raidUtils'
import getRandomInt from '../utils/randomInt'

class AttackCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'attack',
			description: 'Attack another player using your equipped weapon.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'user',
					description: 'Attack another player using your equipped weapon.',
					options: [
						{
							type: CommandOptionType.USER,
							name: 'target',
							description: 'User to attack.',
							required: true
						},
						{
							type: CommandOptionType.STRING,
							name: 'limb',
							description: 'The body part to target. Your chance of successfully hitting it is based on your weapon\'s accuracy.',
							required: false,
							choices: [
								{
									name: 'Head',
									value: 'head'
								},
								{
									name: 'Chest',
									value: 'chest'
								},
								{
									name: 'Arm',
									value: 'arm'
								},
								{
									name: 'Leg',
									value: 'leg'
								}
							]
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'npc',
					description: 'Attack an NPC using your equipped weapon.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'limb',
							description: 'The body part to target. Your chance of successfully hitting it is based on your weapon\'s accuracy.',
							required: false,
							choices: [
								{
									name: 'Head',
									value: 'head'
								},
								{
									name: 'Chest',
									value: 'chest'
								},
								{
									name: 'Arm',
									value: 'arm'
								},
								{
									name: 'Leg',
									value: 'leg'
								}
							]
						}
					]
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const guild = this.app.bot.guilds.get(ctx.guildID as string)
		if (!guild) {
			throw new Error('Guild not found in Eris cache')
		}
		const channel = guild.channels.get(ctx.channelID)
		if (!channel) {
			throw new Error('Could not find channel in Eris cache')
		}

		if (ctx.options.npc) {
			// attacking npc
			const transaction = await beginTransaction()
			const npcRow = await getNPC(transaction.query, ctx.channelID, true)
			const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
			const attackCD = await getCooldown(transaction.query, ctx.user.id, 'attack')
			const partChoice: BodyPart | undefined = ctx.options.npc.limb

			if (!npcRow) {
				await transaction.commit()

				await ctx.send({
					content: '❌ There are no NPC\'s in this channel.'
				})
				return
			}

			const npc = allNPCs.find(n => n.id === npcRow.id)

			if (!npc) {
				await transaction.commit()

				await ctx.send({
					content: '❌ There are no NPC\'s in this channel.'
				})
				return
			}
			else if (attackCD) {
				await transaction.commit()

				await ctx.send({
					content: `❌ Your attack is on cooldown for **${attackCD}**. This is based on the attack rate of your weapon.`
				})
				return
			}

			const userBackpack = await getUserBackpack(transaction.query, ctx.user.id, true)

			// in case npc dies and need to update ground items
			await getGroundItems(transaction.query, ctx.channelID, true)

			const userBackpackData = getItems(userBackpack)
			const userEquips = getEquips(userBackpack)

			if (!userEquips.weapon) {
				await transaction.commit()

				await ctx.send({
					content: '❌ You don\'t have a weapon equipped. Equip a weapon from your inventory with `/equip <item id>`.'
				})
				return
			}

			const bodyPartHit = getBodyPartHit(userEquips.weapon.item.accuracy, partChoice)
			const messages = []
			const removedItems = []
			let finalDamage

			if (userEquips.weapon.item.type === 'Ranged Weapon') {
				const weaponUsed = userEquips.weapon.item
				const userAmmoUsed = sortItemsByAmmo(userBackpackData.items, true).find(i => i.item.type === 'Ammunition' && i.item.ammoFor.includes(weaponUsed))

				if (!userAmmoUsed) {
					await transaction.commit()

					await ctx.send({
						content: `❌ You don't have any ammo for your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row, { showEquipped: false })}.` +
							` You need one of the following ammunitions in your inventory:\n\n${allItems.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponUsed)).map(i => getItemDisplay(i)).join(', ')}.`
					})
					return
				}

				const ammoItem = userAmmoUsed.item as Ammunition
				finalDamage = getAttackDamage(ammoItem.damage, ammoItem.penetration, bodyPartHit.result, npc.armor, npc.helmet)
				await deleteItem(transaction.query, userAmmoUsed.row.id)
				removedItems.push(userAmmoUsed.row.id)

				messages.push(`You shot the \`${npc.type}\` in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)} (ammo: ${getItemDisplay(userAmmoUsed.item)}). **${finalDamage.total}** damage dealt.\n`)
			}
			else {
				finalDamage = getAttackDamage(userEquips.weapon.item.damage, userEquips.weapon.item.penetration, bodyPartHit.result, npc.armor, npc.helmet)

				messages.push(`You hit the \`${npc.type}\` in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)}. **${finalDamage.total}** damage dealt.\n`)
			}

			// add attack cooldown based on weapon attack rate
			await createCooldown(transaction.query, ctx.user.id, 'attack', userEquips.weapon.item.fireRate)

			// add message if users weapon accuracy allowed them to hit their targeted body part
			if (bodyPartHit.accurate) {
				messages.push(`You hit the targeted limb (**${bodyPartHit.result}**) successfully!`)
			}
			else if (partChoice && partChoice !== bodyPartHit.result) {
				// user specified a body part but their weapon accuracy caused them to miss
				messages.push(`You missed the targeted limb (**${partChoice}**).`)
			}

			// remove weapon annd ammo
			if (userEquips.weapon.row.durability - 1 <= 0) {
				messages.push(`Your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row)} broke from this attack.`)

				await deleteItem(transaction.query, userEquips.weapon.row.id)
				removedItems.push(userEquips.weapon.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, userEquips.weapon.row.id, 1)
			}

			if (bodyPartHit.result === 'head' && npc.helmet) {
				messages.push(`The \`${npc.type}\`'s helmet (${getItemDisplay(npc.helmet)}) reduced the damage by **${finalDamage.reduced}**.`)
			}
			else if (bodyPartHit.result === 'chest' && npc.armor) {
				messages.push(`The \`${npc.type}\`'s armor (${getItemDisplay(npc.armor)}) reduced the damage by **${finalDamage.reduced}**.`)
			}

			messages.push(`Your attack is on cooldown for **${formatTime(userEquips.weapon.item.fireRate * 1000)}**.`)

			if (npcRow.health - finalDamage.total <= 0) {
				const droppedItems = []

				if (npc.armor) {
					const armorDura = getRandomInt(Math.max(1, npc.armor.durability / 4), npc.armor.durability)
					const armorRow = await createItem(transaction.query, npc.armor.name, armorDura)
					await dropItemToGround(transaction.query, ctx.channelID, armorRow.id)

					droppedItems.push({
						item: npc.armor,
						row: armorRow
					})
				}

				if (npc.helmet) {
					const helmDura = getRandomInt(Math.max(1, npc.helmet.durability / 4), npc.helmet.durability)
					const helmRow = await createItem(transaction.query, npc.helmet.name, helmDura)
					await dropItemToGround(transaction.query, ctx.channelID, helmRow.id)

					droppedItems.push({
						item: npc.helmet,
						row: helmRow
					})
				}

				if (npc.type === 'raider') {
					// drop weapon and ammo on ground

					if (npc.subtype === 'ranged') {
						// drop random amount of bullets
						const ammoToDrop = getRandomInt(1, 3)

						for (let i = 0; i < ammoToDrop; i++) {
							const ammoRow = await createItem(transaction.query, npc.ammo.name, npc.ammo.durability)
							await dropItemToGround(transaction.query, ctx.channelID, ammoRow.id)

							droppedItems.push({
								item: npc.ammo,
								row: ammoRow
							})
						}
					}

					// weapon durability is random
					const weapDurability = getRandomInt(Math.max(1, npc.weapon.durability / 4), npc.weapon.durability)
					const weapRow = await createItem(transaction.query, npc.weapon.name, weapDurability)
					await dropItemToGround(transaction.query, ctx.channelID, weapRow.id)

					droppedItems.push({
						item: npc.weapon,
						row: weapRow
					})
				}

				// roll random loot drops
				for (let i = 0; i < npc.drops.rolls; i++) {
					const lootDrop = this.app.npcHandler.getDrop(npc)

					if (lootDrop) {
						let itemDurability

						// item durability is random when dropped by npc
						if (lootDrop.durability) {
							itemDurability = getRandomInt(Math.max(1, lootDrop.durability / 4), lootDrop.durability)
						}

						const lootDropRow = await createItem(transaction.query, lootDrop.name, itemDurability)
						await dropItemToGround(transaction.query, ctx.channelID, lootDropRow.id)

						droppedItems.push({
							item: lootDrop,
							row: lootDropRow
						})
					}
				}

				await addXp(transaction.query, ctx.user.id, npc.xp)
				await deleteNPC(transaction.query, ctx.channelID)
				// stop sending npcs saying that an NPC is in the channel
				this.app.npcHandler.clearNPCInterval(ctx.channelID)
				// start timer to spawn a new NPC
				await this.app.npcHandler.spawnNPC(ctx.channelID, channel.name)

				await transaction.commit()

				messages.push(`☠️ **The \`${npc.type}\` DIED!** You earned 🌟 ***+${npc.xp}*** xp for this kill.`)

				const lootEmbed = new Embed()
					.setTitle('Items Dropped')
					.setDescription(droppedItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n'))
					.setFooter('These items were dropped onto the ground.')

				await ctx.send({
					content: messages.join('\n'),
					embeds: [lootEmbed.embed]
				})
			}
			else {
				await lowerNPCHealth(transaction.query, ctx.channelID, finalDamage.total)
				messages.push(`The \`${npc.type}\` is left with ${formatHealth(npcRow.health - finalDamage.total, npc.health)} **${npcRow.health - finalDamage.total}** health.`)

				const attackResult = await this.app.npcHandler.attackPlayer(transaction.query, ctx.user, userData, userBackpack, npc, ctx.channelID, removedItems)

				await transaction.commit()

				// user attack npc message
				await ctx.send({
					content: messages.join('\n')
				})

				// npc attacks user message
				await ctx.send({
					content: attackResult.messages.join('\n')
				})

				if (userData.health - attackResult.damage <= 0) {
					// player died
					try {
						const member = await this.app.fetchMember(guild, ctx.user.id)

						if (member) {
							await member.kick(`User was killed by NPC while trying to scavenge: ${npc.type} (${npc.display})`)
						}
					}
					catch (err) {
						console.error(err)
					}

					const erisUser = await this.app.fetchUser(ctx.user.id)
					if (erisUser) {
						await messageUser(erisUser, {
							content: '❌ Raid failed!\n\n' +
								`You were killed by a \`${npc.type}\` who hit you for **${attackResult.damage}** damage. Next time make sure you're well equipped to attack enemies.\n` +
								`You lost all the items in your inventory (**${userBackpackData.items.length - attackResult.removedItems}** items).`
						})
					}
				}
			}
		}
		else if (ctx.options.user) {
			// attacking player
			const member = ctx.members.get(ctx.options.user.target)
			const partChoice: BodyPart | undefined = ctx.options.user.limb

			if (!member) {
				await ctx.send({
					content: '❌ You need to pick someone to attack!'
				})
				return
			}
			else if (member.id === ctx.user.id) {
				await ctx.send({
					content: '❌ What are you doing? You can\'t attack yourself...'
				})
				return
			}

			const transaction = await beginTransaction()
			const victimData = await getUserRow(transaction.query, member.id, true)
			const victimRaidRow = await getUsersRaid(transaction.query, member.id, true)

			if (!victimData || !victimRaidRow) {
				await transaction.commit()

				await ctx.send({
					content: `❌ **${member.user.username}#${member.user.discriminator}** is not active in this raid!`
				})
				return
			}

			const attackCD = await getCooldown(transaction.query, ctx.user.id, 'attack')

			if (attackCD) {
				await transaction.commit()

				await ctx.send({
					content: `❌ Your attack is on cooldown for **${attackCD}**. This is based on the attack rate of your weapon.`
				})
				return
			}

			const userBackpack = await getUserBackpack(transaction.query, ctx.user.id, true)
			const victimBackpack = await getUserBackpack(transaction.query, member.id, true)

			// in case victim dies and need to update ground items
			await getGroundItems(transaction.query, ctx.channelID, true)

			const userBackpackData = getItems(userBackpack)
			const victimBackpackData = getItems(victimBackpack)
			const userEquips = getEquips(userBackpack)
			const victimEquips = getEquips(victimBackpack)

			if (!userEquips.weapon) {
				await transaction.commit()

				await ctx.send({
					content: '❌ You don\'t have a weapon equipped. Equip a weapon from your inventory with `/equip <item id>`.'
				})
				return
			}

			const bodyPartHit = getBodyPartHit(userEquips.weapon.item.accuracy, partChoice)
			const messages = []
			let finalDamage
			let ammoUsed

			if (userEquips.weapon.item.type === 'Ranged Weapon') {
				const weaponUsed = userEquips.weapon.item
				const userAmmoUsed = sortItemsByAmmo(userBackpackData.items, true).find(i => i.item.type === 'Ammunition' && i.item.ammoFor.includes(weaponUsed))

				if (!userAmmoUsed) {
					await transaction.commit()

					await ctx.send({
						content: `❌ You don't have any ammo for your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row)}.` +
							` You need one of the following ammunitions in your inventory:\n\n${allItems.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponUsed)).map(i => getItemDisplay(i)).join(', ')}.`
					})
					return
				}

				ammoUsed = userAmmoUsed
				const ammoItem = userAmmoUsed.item as Ammunition
				finalDamage = getAttackDamage(ammoItem.damage, ammoItem.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item)
				await deleteItem(transaction.query, userAmmoUsed.row.id)

				messages.push(`You shot <@${member.id}> in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)} (ammo: ${getItemDisplay(userAmmoUsed.item)}). **${finalDamage.total}** damage dealt.\n`)
			}
			else {
				finalDamage = getAttackDamage(userEquips.weapon.item.damage, userEquips.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item)

				messages.push(`You hit <@${member.id}> in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)}. **${finalDamage.total}** damage dealt.\n`)
			}

			// add attack cooldown based on weapon attack rate
			await createCooldown(transaction.query, ctx.user.id, 'attack', userEquips.weapon.item.fireRate)

			// add message if users weapon accuracy allowed them to hit their targeted body part
			if (bodyPartHit.accurate) {
				messages.push(`You hit the targeted limb (**${bodyPartHit.result}**) successfully!`)
			}
			else if (partChoice && partChoice !== bodyPartHit.result) {
				// user specified a body part but their weapon accuracy caused them to miss
				messages.push(`You missed the targeted limb (**${partChoice}**).`)
			}

			// remove weapon annd ammo
			if (userEquips.weapon.row.durability - 1 <= 0) {
				messages.push(`Your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row)} broke from this attack.`)

				await deleteItem(transaction.query, userEquips.weapon.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, userEquips.weapon.row.id, 1)
			}

			if (bodyPartHit.result === 'head' && victimEquips.helmet) {
				messages.push(`**${member.user.username}#${member.user.discriminator}**'s helmet (${getItemDisplay(victimEquips.helmet.item)}) reduced the damage by **${finalDamage.reduced}**.`)

				if (victimEquips.helmet.row.durability - 1 <= 0) {
					messages.push(`**${member.user.username}#${member.user.discriminator}**'s ${getItemDisplay(victimEquips.helmet.item)} broke from this attack!`)

					await deleteItem(transaction.query, victimEquips.helmet.row.id)
				}
				else {
					await lowerItemDurability(transaction.query, victimEquips.helmet.row.id, 1)
				}
			}
			else if (bodyPartHit.result === 'chest' && victimEquips.armor) {
				messages.push(`**${member.user.username}#${member.user.discriminator}**'s armor (${getItemDisplay(victimEquips.armor.item)}) reduced the damage by **${finalDamage.reduced}**.`)

				if (victimEquips.armor.row.durability - 1 <= 0) {
					messages.push(`**${member.user.username}#${member.user.discriminator}**'s ${getItemDisplay(victimEquips.armor.item)} broke from this attack!`)

					await deleteItem(transaction.query, victimEquips.armor.row.id)
				}
				else {
					await lowerItemDurability(transaction.query, victimEquips.armor.row.id, 1)
				}
			}

			messages.push(`Your attack is on cooldown for **${formatTime(userEquips.weapon.item.fireRate * 1000)}**.`)

			if (victimData.health - finalDamage.total <= 0) {
				let xpEarned = 15

				for (const victimItem of victimBackpackData.items) {
					// 10 xp per item user had
					xpEarned += 10

					await removeItemFromBackpack(transaction.query, victimItem.row.id)
					await dropItemToGround(transaction.query, ctx.channelID, victimItem.row.id)
				}

				await addXp(transaction.query, ctx.user.id, xpEarned)
				await removeUserFromRaid(transaction.query, member.id)

				messages.push(`☠️ **${member.user.username}#${member.user.discriminator}** DIED! They dropped **${victimBackpackData.items.length}** items on the ground. Check the items they dropped with \`/ground view\`.`, `You earned 🌟 ***+${xpEarned}*** xp for this kill.`)
			}
			else {
				await lowerHealth(transaction.query, member.id, finalDamage.total)

				messages.push(`**${member.user.username}#${member.user.discriminator}** is left with ${formatHealth(victimData.health - finalDamage.total, victimData.maxHealth)} **${victimData.health - finalDamage.total}** health.`)
			}

			// commit changes
			await transaction.commit()

			// send message to victim if they were killed
			if (victimData.health - finalDamage.total <= 0) {
				try {
					const erisMember = await this.app.fetchMember(guild, member.id)

					if (erisMember) {
						await erisMember.kick(`User was killed by ${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id})`)

						await messageUser(erisMember.user, {
							content: '❌ Raid failed!\n\n' +
								`You were killed by **${ctx.user.username}#${ctx.user.discriminator}** who hit you for **${finalDamage.total}** damage using their ${getItemDisplay(userEquips.weapon.item)}${ammoUsed ? ` (ammo: ${getItemDisplay(ammoUsed.item)})` : ''}.\n` +
								`You lost all the items in your inventory (**${victimBackpackData.items.length}** items).`
						})
					}
				}
				catch (err) {
					console.error(err)
				}
			}

			await ctx.send({
				content: messages.join('\n')
			})
		}
	}
}

export default AttackCommand
