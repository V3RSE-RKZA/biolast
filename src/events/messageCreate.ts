import { GuildTextableChannel, Message, Permission } from 'eris'
import { prefix, debug, adminUsers } from '../config'
import { CommandPermission } from '../types/Commands'
import { getUserRow, createAccount, increaseLevel } from '../utils/db/players'
import { userInRaid } from '../utils/db/raids'
import { isRaidGuild } from '../utils/raidUtils'
import { query } from '../utils/db/mysql'
import App from '../app'
import { messageUser, reply } from '../utils/messageUtils'
import { getPlayerXp } from '../utils/playerUtils'
import { addItemToBackpack, createItem } from '../utils/db/items'
import { items } from '../resources/items'
import { getItemDisplay } from '../utils/itemUtils'

const spamCooldown = new Set()

export async function run (this: App, message: Message): Promise<void> {
	if (message.author.bot || !this.acceptingCommands) {
		return
	}

	else if (!message.content.toLowerCase().startsWith(prefix)) {
		return
	}

	const args = message.content.slice(prefix.length).split(/ +/)
	const commandName = args.shift()?.toLowerCase()

	const command = this.commands.find(cmd => cmd.name === commandName || (cmd.aliases.length && cmd.aliases.includes(commandName ?? '')))

	// no command was found
	if (!command) {
		return
	}

	else if (command.category === 'admin' && !adminUsers.includes(message.author.id)) {
		return
	}

	// command was run in a server
	else if (message.guildID) {
		const commandPerms = getNeededPermissions((message as Message<GuildTextableChannel>).channel.permissionsOf(this.bot.user.id), command.permissions)
		const userData = await getUserRow(query, message.author.id)

		// check to make sure bot has permissions to run command
		if (commandPerms.neededPerms.length) {
			if (commandPerms.neededPerms.includes('sendMessages')) {
				// don't have permission to send a permissions needed message
				return
			}

			await reply(message, {
				content: `I am missing the following permissions to run that command: ${commandPerms.permsString}...`
			})
			return
		}

		// check if user has manage server permission before running GuildModCommand
		else if (command.guildModsOnly && !(message as Message<GuildTextableChannel>).member.permissions.has('manageGuild')) {
			await reply(message, {
				content: '❌ You need the `Manage Server` permission to use this command!'
			})
			return
		}

		else if (command.onlyWorksInRaidGuild && !isRaidGuild(message.guildID)) {
			await reply(message, {
				content: '❌ That command can **ONLY** be used in a raid. Join a raid with the `raid` command.'
			})
			return
		}

		// create account if user does not have one
		else if (!userData) {
			await createAccount(query, message.author.id)

			const batRow = await createItem(query, items.wooden_bat.name, items.wooden_bat.durability)
			const bandageRow = await createItem(query, items.bandage.name)

			await addItemToBackpack(query, message.author.id, batRow.id)
			await addItemToBackpack(query, message.author.id, bandageRow.id)

			await messageUser(message.author, {
				content: '**Welcome to `project z???`**\n\n' +
				'You are a scavenger just trying to survive in the middle of an apocalypse. You need to explore areas and collect as much loot as you can all while ' +
				'making sure you aren\'t killed. It\'s survival of the fittest, other scavengers will try to kill you for your loot. You need to find weapons and armor ' +
				'to protect yourself with. Scavengers aren\'t the only thing trying to get you though, watch out for walkers and heavily armed raiders.\n\n' +
				'You have a `stash` and an `inventory` for your items. Whenever you enter a **raid**, you will take all the items in your `inventory` with you. ' +
				'I would highly recommend taking a weapon with you to protect yourself with. **If you die while in raid, you will lose all the items in your inventory.** ' +
				'This could also work in your favor, if you kill another player you can steal everything they had in their inventory for yourself. ' +
				'Once you are finished looting in a raid, you need to find a channel to **evac** from. Channels that have an evac will typically have it in the name: ex. `backwoods-evac`.\n\n' +
				`I've put some items in your \`inventory\` to help you get started: **1x** ${getItemDisplay(items.wooden_bat)}, **1x** ${getItemDisplay(items.bandage)}\n\n` +
				'Once you\'re ready to enter a raid, use the `raid` command. **Good luck!** - 💙 blobfysh'
			})
		}

		else {
			// check if user has enough xp to level up
			let playerXp = getPlayerXp(userData.xp, userData.level)
			let newLevel = userData.level

			// check if user levels up multiple times (prevents sending multiple level-up messages)
			while (playerXp.xpUntilLevelUp <= 0) {
				newLevel += 1
				playerXp = getPlayerXp(userData.xp, newLevel)

				console.log(`Player leveled up to ${newLevel}`)
			}

			if (userData.level !== newLevel) {
				await increaseLevel(query, message.author.id, newLevel - userData.level)

				await reply(message, {
					content: `<@${message.author.id}>, you leveled up!\n\nLevel **${userData.level}** → **${newLevel}**`
				})
			}
		}
	}

	// non-worksInDMs command cannot be used in DM channel
	else if (!command.worksInDMs) {
		await reply(message, {
			content: `❌ That command cannot be used in DMs. The following commands work in DMs: ${this.commands.filter(cmd => cmd.category !== 'admin' && cmd.worksInDMs).map(cmd => `\`${cmd.name}\``).join(', ')}`
		})
		return
	}

	if (!command.canBeUsedInRaid && (isRaidGuild(message.guildID) || await userInRaid(query, message.author.id))) {
		await reply(message, {
			content: '❌ That command cannot be used while you are in an active raid! You need to evac to finish the raid (dying also works).'
		})
		return
	}

	// check if user has spam cooldown
	else if (spamCooldown.has(message.author.id)) {
		const botMsg = await reply(message, {
			content: '⏱ HEY SLOW IT DOWN `2 seconds`'
		})
		setTimeout(() => {
			botMsg.delete()
		}, 2000)

		return
	}

	// execute command
	try {
		console.log(`${message.author.id} ran command: ${command.name}`)

		// have to do this for proper types in command files
		if (command.worksInDMs) {
			await command.execute(this, message, { args, prefix })
		}
		else {
			await command.execute(this, <Message<GuildTextableChannel>>message, { args, prefix })
		}

		// dont add spamCooldown if user is admin
		if (debug || adminUsers.includes(message.author.id)) return

		const spamCD = 2000
		spamCooldown.add(message.author.id)

		setTimeout(() => {
			spamCooldown.delete(message.author.id)
		}, spamCD)
	}
	catch (err) {
		console.error(err)
		message.channel.createMessage('Command failed to execute!')
	}
}

function getNeededPermissions (botPermissions: Permission, requiredPerms: CommandPermission[]) {
	const neededPerms: CommandPermission[] = []

	for (const perm of requiredPerms) {
		if (!botPermissions.has(perm)) {
			neededPerms.push(perm)
		}
	}

	const permsString = neededPerms.map(perm => {
		if (neededPerms.length > 1 && neededPerms.indexOf(perm) === (neededPerms.length - 1)) {
			return `and \`${perm}\``
		}

		return `\`${perm}\``
	}).join(', ')

	return { neededPerms, permsString }
}
