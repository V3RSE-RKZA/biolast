import { Command } from '../types/Commands'
import { messageUser, reply } from '../utils/messageUtils'
import { beginTransaction } from '../utils/db/mysql'
import { deleteItem, dropItemToGround, getGroundItems, getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { getEquips, getItemDisplay, getItems, sortItemsByAmmo } from '../utils/itemUtils'
import { Ammunition, Armor, Helmet, items } from '../resources/items'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { getMemberFromMention } from '../utils/argParsers'
import { getUserRow, lowerHealth } from '../utils/db/players'
import formatHealth from '../utils/formatHealth'

type BodyPart = 'arm' | 'leg' | 'chest' | 'head'

export const command: Command = {
	name: 'attack',
	aliases: [],
	examples: ['attack @blobfysh', 'attack @blobfysh head', 'attack @blobfysh legs'],
	description: 'Attack another player using your equipped weapon. Make sure you have ammunition for the weapon you want to shoot.' +
		' If you specify a body part to target, your weapon accuracy will determine your chance to hit that target.' +
		' Body parts you can specify: `head` (harder to hit), `chest`, `arms`, `legs`',
	shortDescription: 'Attack another player using your equipped weapon.',
	category: 'items',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const member = getMemberFromMention(message.channel.guild, args[0])

		if (!member) {
			await reply(message, {
				content: `❌ You need to mention someone to attack! \`${prefix}attack <@user>\``
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
				content: `❌ You don't have a weapon equipped. Equip a weapon from your backpack with \`${prefix}equip <item id>\`.`
			})
			return
		}

		const weaponName = userEquips.weapon.item.name
		const userAmmoUsed = sortItemsByAmmo(userBackpackData.items, true).find(i => i.item.type === 'Ammunition' && i.item.ammoFor.includes(weaponName))
		const partChoice = parseChoice(args[1])
		const bodyPartHit = getBodyPartHit(userEquips.weapon.item.accuracy, partChoice)
		const messages = []
		let finalDamage

		if (userEquips.weapon.item.subtype === 'Ranged') {
			if (!userAmmoUsed) {
				await transaction.commit()

				await reply(message, {
					content: `❌ You don't have any ammo for your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row)}.` +
						` You need one of the following ammunitions in your backpack:\n\n${items.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponName)).map(i => getItemDisplay(i)).join(', ')}.`
				})
				return
			}

			const ammoItem = userAmmoUsed.item as Ammunition
			finalDamage = getDamage(ammoItem.damage, ammoItem.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item)

			messages.push(`You shot <@${member.id}> in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)} (ammo: ${getItemDisplay(userAmmoUsed.item)}). **${finalDamage.total}** damage dealt.\n`)
		}
		else {
			finalDamage = getDamage(userEquips.weapon.item.damage, 0.5, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item)

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

		if (userAmmoUsed) {
			await deleteItem(transaction.query, userAmmoUsed.row.id)
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
		else if (bodyPartHit.result === 'arm' || bodyPartHit.result === 'leg') {
			messages.push(`Hitting **${member.username}#${member.discriminator}**'s ${bodyPartHit.result} caused the damage to be reduced by **${finalDamage.reduced}**.`)
		}

		messages.push(`Your attack is on cooldown for **${formatTime(userEquips.weapon.item.fireRate * 1000)}**.`)

		if (victimData.health - finalDamage.total <= 0) {
			for (const victimItem of victimBackpackData.items) {
				await removeItemFromBackpack(transaction.query, victimItem.row.id)
				await dropItemToGround(transaction.query, message.channel.id, victimItem.row.id)
			}

			await removeUserFromRaid(transaction.query, member.id)

			messages.push(`☠️ **${member.username}#${member.discriminator}** DIED! They dropped **${victimBackpackData.items.length}** items on the ground. Check the items they dropped with \`${prefix}ground\`.`)
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
					`You were killed by **${message.author.username}#${message.author.discriminator}** who hit you for **${finalDamage.total}** damage using their ${getItemDisplay(userEquips.weapon.item)}${userAmmoUsed ? ` (ammo: ${getItemDisplay(userAmmoUsed.item)})` : ''}.\n` +
					`You lost **${victimBackpackData.items.length}** items from your backpack.`
			})
		}

		await reply(message, {
			content: messages.join('\n')
		})
	}
}

/**
 * Gets a random body part:
 *
 * head - 10%
 *
 * arms/legs - 15%
 *
 * chest - 60%
 *
 * @param weaponAccuracy The weapons accuracy
 * @param choice The body part user is trying to taget
 * @returns a random body part and whether or not the weapons accuracy influenced the result
 */
function getBodyPartHit (weaponAccuracy: number, choice?: BodyPart): { result: BodyPart, accurate: boolean } {
	const random = Math.random()

	// if head was targeted, the chance of successful hit is divided by half
	if (choice === 'head' && random <= (weaponAccuracy / 100) / 2) {
		return {
			result: 'head',
			accurate: true
		}
	}
	else if (choice && random <= (weaponAccuracy / 100)) {
		return {
			result: choice,
			accurate: true
		}
	}

	if (random <= 0.1) {
		return {
			result: 'head',
			accurate: false
		}
	}
	else if (random <= 0.25) {
		return {
			result: 'arm',
			accurate: false
		}
	}
	else if (random <= 0.4) {
		return {
			result: 'leg',
			accurate: false
		}
	}

	return {
		result: 'chest',
		accurate: false
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

function getDamage (damage: number, penetration: number, bodyPartHit: BodyPart, victimArmor?: Armor, victimHelmet?: Helmet): { total: number, reduced: number } {
	if (bodyPartHit === 'chest') {
		// user penetrated armor, deal full damage
		if (!victimArmor || penetration >= victimArmor.level) {
			return {
				total: damage,
				reduced: 0
			}
		}

		// minimum 1 damage
		// armor level has the armor penetration difference added to it so theres a drastic damage adjustment the higher armor level victim is wearing
		const adjusted = Math.max(1, Math.round((penetration / (victimArmor.level + (victimArmor.level - penetration))) * damage))

		return {
			total: adjusted,
			reduced: damage - adjusted
		}
	}
	else if (bodyPartHit === 'head') {
		// head shots deal 1.5x damage
		damage *= 1.5

		if (!victimHelmet || penetration >= victimHelmet.level) {
			return {
				total: damage,
				reduced: 0
			}
		}

		const adjusted = Math.max(1, Math.round((penetration / (victimHelmet.level + (victimHelmet.level - penetration))) * damage))

		return {
			total: adjusted,
			reduced: damage - adjusted
		}
	}

	// arm or leg hits deal 0.5x damage
	const adjusted = Math.max(1, Math.round(damage * 0.5))
	return {
		total: adjusted,
		reduced: damage - adjusted
	}
}
