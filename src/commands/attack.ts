import { Command } from '../types/Commands'
import { messageUser, reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { createItem, deleteItem, dropItemToGround, getGroundItems, getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { getEquips, getItemDisplay, getItems, sortItemsByAmmo } from '../utils/itemUtils'
import { allItems } from '../resources/items'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { getMemberFromMention } from '../utils/argParsers'
import { addXp, getUserRow, lowerHealth } from '../utils/db/players'
import formatHealth from '../utils/formatHealth'
import { Ammunition } from '../types/Items'
import { allNPCs } from '../resources/npcs'
import { deleteNPC, getNPC, lowerHealth as lowerNPCHealth } from '../utils/db/npcs'
import { getBodyPartHit, BodyPart, getAttackDamage } from '../utils/raidUtils'
import Embed from '../structures/Embed'
import getRandomInt from '../utils/randomInt'

export const command: Command = {
	name: 'attack',
	aliases: [],
	examples: ['attack @blobfysh', 'attack @blobfysh head', 'attack @blobfysh legs'],
	description: 'Attack another player using your equipped weapon. Make sure you have ammunition for the weapon you want to shoot.' +
		' If you specify a body part to target, your weapon accuracy will determine your chance to hit that target.' +
		' Body parts you can specify: `head` (harder to hit), `chest`, `arms`, `legs`',
	shortDescription: 'Attack another player using your equipped weapon.',
	category: 'items',
	permissions: ['sendMessages', 'externalEmojis', 'embedLinks'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute (app, message, { args, prefix }) {
		const member = getMemberFromMention(message.channel.guild, args[0])
		const npcTarget = getNPCTarget(args[0])
		const partChoice = parseChoice(args[1])

		if (npcTarget) {
			// attacking npc
			const transaction = await beginTransaction()
			const npcRow = await getNPC(transaction.query, message.channel.id, true)
			const userData = (await getUserRow(transaction.query, message.author.id, true))!
			const attackCD = await getCooldown(transaction.query, message.author.id, 'attack')

			if (!npcRow) {
				await transaction.commit()

				await reply(message, {
					content: `❌ There are no \`${npcTarget}\`'s here!`
				})
				return
			}

			const npc = allNPCs.find(n => n.id === npcRow.id)

			if (!npc || npcTarget !== npc.type) {
				await transaction.commit()

				await reply(message, {
					content: `❌ There are no \`${npcTarget}\`'s here!`
				})
				return
			}
			else if (attackCD) {
				await transaction.commit()

				await reply(message, {
					content: `❌ Your attack is on cooldown for **${attackCD}**. This is based on the attack rate of your weapon.`
				})
				return
			}

			const userBackpack = await getUserBackpack(transaction.query, message.author.id, true)

			// in case npc dies and need to update ground items
			await getGroundItems(transaction.query, message.channel.id, true)

			const userBackpackData = getItems(userBackpack)
			const userEquips = getEquips(userBackpack)

			if (!userEquips.weapon) {
				await transaction.commit()

				await reply(message, {
					content: `❌ You don't have a weapon equipped. Equip a weapon from your inventory with \`${prefix}equip <item id>\`.`
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

					await reply(message, {
						content: `❌ You don't have any ammo for your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row)}.` +
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
			await createCooldown(transaction.query, message.author.id, 'attack', userEquips.weapon.item.fireRate)

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
					await dropItemToGround(transaction.query, message.channel.id, armorRow.id)

					droppedItems.push({
						item: npc.armor,
						row: armorRow
					})
				}

				if (npc.helmet) {
					const helmDura = getRandomInt(Math.max(1, npc.helmet.durability / 4), npc.helmet.durability)
					const helmRow = await createItem(transaction.query, npc.helmet.name, helmDura)
					await dropItemToGround(transaction.query, message.channel.id, helmRow.id)

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
							await dropItemToGround(transaction.query, message.channel.id, ammoRow.id)

							droppedItems.push({
								item: npc.ammo,
								row: ammoRow
							})
						}
					}

					// weapon durability is random
					const weapDurability = getRandomInt(Math.max(1, npc.weapon.durability / 4), npc.weapon.durability)
					const weapRow = await createItem(transaction.query, npc.weapon.name, weapDurability)
					await dropItemToGround(transaction.query, message.channel.id, weapRow.id)

					droppedItems.push({
						item: npc.weapon,
						row: weapRow
					})
				}

				// roll random loot drops
				for (let i = 0; i < npc.drops.rolls; i++) {
					const lootDrop = app.npcHandler.getDrop(npc)

					if (lootDrop) {
						let itemDurability

						// item durability is random when dropped by npc
						if (lootDrop.durability) {
							itemDurability = getRandomInt(Math.max(1, lootDrop.durability / 4), lootDrop.durability)
						}

						const lootDropRow = await createItem(transaction.query, lootDrop.name, itemDurability)
						await dropItemToGround(transaction.query, message.channel.id, lootDropRow.id)

						droppedItems.push({
							item: lootDrop,
							row: lootDropRow
						})
					}
				}

				await addXp(transaction.query, message.author.id, npc.xp)
				await deleteNPC(transaction.query, message.channel.id)
				// stop sending npcs saying that an NPC is in the channel
				app.npcHandler.clearNPCInterval(message.channel.id)
				// start timer to spawn a new NPC
				await app.npcHandler.spawnNPC(message.channel)

				await transaction.commit()

				messages.push(`☠️ **The \`${npc.type}\` DIED!** You earned 🌟 ***+${npc.xp}*** xp for this kill.`)

				const lootEmbed = new Embed()
					.setTitle('Items Dropped')
					.setDescription(droppedItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n'))
					.setFooter('These items were dropped onto the ground.')

				await reply(message, {
					content: messages.join('\n'),
					embed: lootEmbed.embed
				})
			}
			else {
				await lowerNPCHealth(transaction.query, message.channel.id, finalDamage.total)
				messages.push(`The \`${npc.type}\` is left with ${formatHealth(npcRow.health - finalDamage.total, npc.health)} **${npcRow.health - finalDamage.total}** health.`)

				const attackResult = await app.npcHandler.attackPlayer(transaction.query, message.member, userData, userBackpack, npc, message.channel.id, removedItems)

				await transaction.commit()

				// user attack npc message
				const userAttackMessage = await reply(message, {
					content: messages.join('\n')
				})

				// npc attacks user message, make it look like its replying to the users attack
				await reply(userAttackMessage, {
					content: attackResult.messages.join('\n')
				})

				if (userData.health - attackResult.damage <= 0) {
					// player died
					try {
						await message.member.kick(`User was killed by NPC: ${npc.type} (${npc.display})`)
					}
					catch (err) {
						console.error(err)
					}

					await messageUser(message.author, {
						content: '❌ Raid failed!\n\n' +
							`You were killed by a \`${npc.type}\` who hit you for **${attackResult.damage}** damage. Next time make sure you're well equipped to attack enemies.\n` +
							`You lost all the items in your inventory (**${userBackpackData.items.length - attackResult.removedItems}** items).`
					})
				}
			}

			return
		}
		else if (!member) {
			await reply(message, {
				content: `❌ You need to mention someone to attack! \`${prefix}attack <@user>\``
			})
			return
		}
		else if (member.id === message.author.id) {
			await reply(message, {
				content: '❌ What are you doing? You can\'t attack yourself...'
			})
			return
		}

		const transaction = await beginTransaction()
		const victimData = await getUserRow(transaction.query, member.id, true)
		const victimRaidRow = await getUsersRaid(transaction.query, member.id, true)

		if (!victimData || !victimRaidRow) {
			await transaction.commit()

			await reply(message, {
				content: `❌ **${member.username}#${member.discriminator}** is not active in this raid!`
			})
			return
		}

		const attackCD = await getCooldown(transaction.query, message.author.id, 'attack')

		if (attackCD) {
			await transaction.commit()

			await reply(message, {
				content: `❌ Your attack is on cooldown for **${attackCD}**. This is based on the attack rate of your weapon.`
			})
			return
		}

		const userBackpack = await getUserBackpack(transaction.query, message.author.id, true)
		const victimBackpack = await getUserBackpack(transaction.query, member.id, true)

		// in case victim dies and need to update ground items
		await getGroundItems(transaction.query, message.channel.id, true)

		const userBackpackData = getItems(userBackpack)
		const victimBackpackData = getItems(victimBackpack)
		const userEquips = getEquips(userBackpack)
		const victimEquips = getEquips(victimBackpack)

		if (!userEquips.weapon) {
			await transaction.commit()

			await reply(message, {
				content: `❌ You don't have a weapon equipped. Equip a weapon from your inventory with \`${prefix}equip <item id>\`.`
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

				await reply(message, {
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
		await createCooldown(transaction.query, message.author.id, 'attack', userEquips.weapon.item.fireRate)

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
			messages.push(`**${member.username}#${member.discriminator}**'s helmet (${getItemDisplay(victimEquips.helmet.item)}) reduced the damage by **${finalDamage.reduced}**.`)

			if (victimEquips.helmet.row.durability - 1 <= 0) {
				messages.push(`**${member.username}#${member.discriminator}**'s ${getItemDisplay(victimEquips.helmet.item)} broke from this attack!`)

				await deleteItem(transaction.query, victimEquips.helmet.row.id)
			}
			else {
				await lowerItemDurability(transaction.query, victimEquips.helmet.row.id, 1)
			}
		}
		else if (bodyPartHit.result === 'chest' && victimEquips.armor) {
			messages.push(`**${member.username}#${member.discriminator}**'s armor (${getItemDisplay(victimEquips.armor.item)}) reduced the damage by **${finalDamage.reduced}**.`)

			if (victimEquips.armor.row.durability - 1 <= 0) {
				messages.push(`**${member.username}#${member.discriminator}**'s ${getItemDisplay(victimEquips.armor.item)} broke from this attack!`)

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
				await dropItemToGround(transaction.query, message.channel.id, victimItem.row.id)
			}

			await addXp(transaction.query, message.author.id, xpEarned)
			await removeUserFromRaid(transaction.query, member.id)

			messages.push(`☠️ **${member.username}#${member.discriminator}** DIED! They dropped **${victimBackpackData.items.length}** items on the ground. Check the items they dropped with \`${prefix}ground\`.`, `You earned 🌟 ***+${xpEarned}*** xp for this kill.`)
		}
		else {
			await lowerHealth(transaction.query, member.id, finalDamage.total)

			messages.push(`**${member.username}#${member.discriminator}** is left with ${formatHealth(victimData.health - finalDamage.total, victimData.maxHealth)} **${victimData.health - finalDamage.total}** health.`)
		}

		// commit changes
		await transaction.commit()

		// send message to victim if they were killed
		if (victimData.health - finalDamage.total <= 0) {
			try {
				await member.kick(`User was killed by ${message.author.username}#${message.author.discriminator} (${message.author.id})`)
			}
			catch (err) {
				console.error(err)
			}

			await messageUser(member.user, {
				content: '❌ Raid failed!\n\n' +
					`You were killed by **${message.author.username}#${message.author.discriminator}** who hit you for **${finalDamage.total}** damage using their ${getItemDisplay(userEquips.weapon.item)}${ammoUsed ? ` (ammo: ${getItemDisplay(ammoUsed.item)})` : ''}.\n` +
					`You lost all the items in your inventory (**${victimBackpackData.items.length}** items).`
			})
		}

		await reply(message, {
			content: messages.join('\n')
		})
	}
}

/**
 * Used to parse user input for body part into a body part
 * @param choice The users body part choice
 * @returns A body part
 */
function parseChoice (choice?: string): BodyPart | undefined {
	switch (choice) {
		case 'head': return 'head'
		case 'chest':
		case 'stomach':
		case 'body': return 'chest'
		case 'arm':
		case 'arms':
		case 'hand': return 'arm'
		case 'leg':
		case 'legs':
		case 'feet': return 'leg'
	}
}

function getNPCTarget (arg: string): string | undefined {
	const npc = allNPCs.find(n => n.type === arg)

	if (npc) {
		return npc.type
	}
}
