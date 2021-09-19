import { Constants, TextChannel } from 'eris'
import App from '../app'
import { allLocations } from '../resources/raids'
import { Item } from '../types/Items'
import { getItemDisplay, sortItemsByType } from './itemUtils'
import { logger } from './logger'
import { getPossibleItems } from './raidUtils'
import fs from 'fs'
import path from 'path'

// This function will make sure all raid guilds defined in the .env have the proper structure

const everyonePerms = Constants.Permissions.viewChannel +
	Constants.Permissions.sendMessages +
	Constants.Permissions.useExternalEmojis +
	Constants.Permissions.readMessageHistory +
	Constants.Permissions.useApplicationCommands

const botsRoleName = 'Project Z RPG'

export async function syncRaidGuilds (app: App): Promise<void> {
	let successfulSyncs = 0

	for (const location of allLocations) {
		for (const guildID of location.guilds) {
			try {
				const guild = app.bot.guilds.get(guildID)

				if (!guild) {
					logger.warn(`[RAID GUILD SYNC] Unable to find guild with ID: ${guildID}`)
					continue
				}

				const botMember = guild.members.get(app.bot.user.id)
				if (!botMember) {
					logger.error(`Unable to find bot member in guild (${guild.name} ID: ${guild.id})`)
					continue
				}
				else if (!botMember.permissions.has('administrator')) {
					logger.error(`Bot does not have administrator perms in guild (${guild.name} ID: ${guild.id}), please give the bot admin perms so setup works properly`)
					continue
				}

				// @everyone should always be defined
				const everyoneRole = guild.roles.get(guild.id)!
				let locationsCategory
				let welcomeChannel
				let scavVoiceChannel
				let voiceCategory
				let botsRole = guild.roles.find(r => r.name === botsRoleName)
				let scavRole = guild.roles.find(r => r.name === 'Scavenger')

				if (everyoneRole.permissions.allow !== everyonePerms) {
					await everyoneRole.edit({
						permissions: everyonePerms
					}, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Modified @everyone role permissions (allow: ${everyonePerms})`)
				}

				if (!botsRole) {
					botsRole = await guild.createRole({
						hoist: true,
						mentionable: false,
						name: botsRoleName,
						color: 11746366
					})
					logger.debug(`[RAID GUILD SYNC] Created role (${botsRole.name} ID: ${botsRole.id})`)
				}

				if (botsRole.color !== 11746366) {
					await botsRole.edit({
						color: 11746366
					})
					logger.debug(`[RAID GUILD SYNC] Modified role (${botsRole.name} ID: ${botsRole.id}) color to 11746366`)
				}

				if (!botMember.roles.includes(botsRole.id)) {
					await botMember.addRole(botsRole.id, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Added role (${botsRole.name} ID: ${botsRole.id}) to bot`)
				}

				if (!scavRole) {
					scavRole = await guild.createRole({
						hoist: false,
						mentionable: false,
						name: 'Scavenger',
						color: 3907115
					})
					logger.debug(`[RAID GUILD SYNC] Created role (${scavRole.name} ID: ${scavRole.id})`)
				}

				if (scavRole.position !== 1) {
					await scavRole.editPosition(1)
					logger.debug(`[RAID GUILD SYNC] Moved role (${scavRole.name} ID: ${scavRole.id}) position to 1`)
				}

				if (scavRole.permissions.allow !== 0n) {
					await scavRole.edit({
						permissions: 0n
					}, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Modified role (${scavRole.name} ID: ${scavRole.id}) permissions (allow: 0n)`)
				}

				for (const ch of guild.channels) {
					const channel = ch[1]

					if (channel.name === 'Locations' && channel.type === Constants.ChannelTypes.GUILD_CATEGORY) {
						locationsCategory = channel
					}
					else if (channel.name === 'welcome' && channel.type === Constants.ChannelTypes.GUILD_TEXT) {
						welcomeChannel = channel
					}
					else if (channel.name === 'Voice Channels' && channel.type === Constants.ChannelTypes.GUILD_CATEGORY) {
						voiceCategory = channel
					}
					else if (channel.name === 'Scavenger Voice' && channel.type === Constants.ChannelTypes.GUILD_VOICE) {
						scavVoiceChannel = channel
					}
					else if (!location.channels.find(c => c.name === channel.name && channel.type === Constants.ChannelTypes.GUILD_TEXT)) {
						await channel.delete('raid guild sync')
						logger.debug(`[RAID GUILD SYNC] Deleted channel (${channel.name} ID: ${channel.id}) in raid guild (${guild.name} ID: ${guild.id})`)
					}
				}

				/**
				 * Verify welcome channel
				 */
				if (welcomeChannel && snowflakeToDate(welcomeChannel.id).getTime() + (7 * 24 * 60 * 60 * 1000) < Date.now()) {
					// delete the welcome channel since it was older than 7 days (helps keep loot information up to date)
					await welcomeChannel.delete()

					logger.debug(`[RAID GUILD SYNC] Deleted welcome channel (${welcomeChannel.name} ID: ${welcomeChannel.id}) in raid guild (${guild.name} ID: ${guild.id}) since it was older than 7 days`)
					welcomeChannel = undefined
				}

				if (!welcomeChannel) {
					welcomeChannel = await guild.createChannel('welcome', Constants.ChannelTypes.GUILD_TEXT, {
						reason: 'raid guild sync',
						topic: `Welcome to ${location.display}`
					})
					logger.debug(`[RAID GUILD SYNC] Created channel (${welcomeChannel.name} ID: ${welcomeChannel.id})`)

					const possibleItems = sortItemsByType(getPossibleItems(location))
					const possibleItemTypes = possibleItems.reduce<{ [key: string]: Item[] }>((prev, curr) => {
						if (prev[curr.type]) {
							prev[curr.type] = [...prev[curr.type], curr]
						}
						else {
							prev[curr.type] = [curr]
						}

						return prev
					}, {})
					const lootDisplay = []
					const lootImage = fs.readFileSync(path.join(__dirname, '../../src/resources/images/loot.png'))
					const faqImage = fs.readFileSync(path.join(__dirname, '../../src/resources/images/faq.png'))

					for (const type of Object.keys(possibleItemTypes)) {
						lootDisplay.push(`**${type}**: ${possibleItemTypes[type].map(i => getItemDisplay(i)).join(', ')}`)
					}

					await welcomeChannel.createMessage({
						content: `**Welcome to ${location.display}!**`
					})

					await welcomeChannel.createMessage({}, {
						file: lootImage,
						name: 'loot.png'
					})

					await welcomeChannel.createMessage({
						content: lootDisplay.join('\n\n')
					})

					await welcomeChannel.createMessage({}, {
						file: faqImage,
						name: 'faq.png'
					})

					await welcomeChannel.createMessage({
						content: '**I can\'t see any channels, what do I do?**\nLeave the server and rejoin using your invite link. You can use the `/raid` command to fetch your invite link.' +
							'\n\n**How do I find items?**\nUse the `/scavenge` command in channels to search for items. Once you\'ve gathered some loot, head to an evac channel and use `/evac` to escape the raid.' +
							'\n\n**Why can\'t I talk?**\nThis server is not meant for chatting. If you wish to communicate with other players, use commands like `/wave`.'
					})
				}

				if (welcomeChannel.position !== 0) {
					await welcomeChannel.editPosition(0)
					logger.debug(`[RAID GUILD SYNC] Moved channel (${welcomeChannel.name} ID: ${welcomeChannel.id}) position to 0`)
				}

				if (welcomeChannel.topic !== `Welcome to ${location.display}`) {
					await welcomeChannel.edit({
						topic: `Welcome to ${location.display}`
					})
					logger.debug(`[RAID GUILD SYNC] Modified channel (${welcomeChannel.name} ID: ${welcomeChannel.id}) topic`)
				}

				const welcomeChannelEveryonePerms = welcomeChannel.permissionOverwrites.get(guild.id)
				const welcomeChannelEveryoneDeniedPerms = Constants.Permissions.sendMessages + Constants.Permissions.addReactions
				if (welcomeChannelEveryonePerms?.allow !== 0n || welcomeChannelEveryonePerms?.deny !== welcomeChannelEveryoneDeniedPerms) {
					await welcomeChannel.editPermission(guild.id, 0n, welcomeChannelEveryoneDeniedPerms, 0, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Modified channel (${welcomeChannel.name} ID: ${welcomeChannel.id}) permissions for @everyone role: ${guild.id} (allow: 0n deny: ${welcomeChannelEveryoneDeniedPerms})`)
				}

				/**
				 * Verify Locations category
				 */
				if (!locationsCategory) {
					locationsCategory = await guild.createChannel('Locations', Constants.ChannelTypes.GUILD_CATEGORY, {
						reason: 'raid guild sync'
					})
					logger.debug(`[RAID GUILD SYNC] Created category channel (${locationsCategory.name} ID: ${locationsCategory.id})`)
				}

				if (locationsCategory.position !== 0) {
					await locationsCategory.editPosition(0)
					logger.debug(`[RAID GUILD SYNC] Moved category channel (${locationsCategory.name} ID: ${locationsCategory.id}) position to 0`)
				}

				const locationsCategoryEveryonePerms = locationsCategory.permissionOverwrites.get(guild.id)
				const locationsCategoryEveryoneDeniedPerms = Constants.Permissions.viewChannel
				if (locationsCategoryEveryonePerms?.allow !== 0n || locationsCategoryEveryonePerms?.deny !== locationsCategoryEveryoneDeniedPerms) {
					await locationsCategory.editPermission(guild.id, 0n, locationsCategoryEveryoneDeniedPerms, 0, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Modified category channel (${locationsCategory.name} ID: ${locationsCategory.id}) permissions for @everyone role: ${guild.id} (allow: 0n deny: ${locationsCategoryEveryoneDeniedPerms})`)
				}

				const locationsCategoryScavengerPerms = locationsCategory.permissionOverwrites.get(scavRole.id)
				const locationsCategoryScavengerAllowedPerms = Constants.Permissions.viewChannel
				const locationsCategoryScavengerDeniedPerms = Constants.Permissions.readMessageHistory
				if (locationsCategoryScavengerPerms?.allow !== locationsCategoryScavengerAllowedPerms || locationsCategoryScavengerPerms?.deny !== locationsCategoryScavengerDeniedPerms) {
					await locationsCategory.editPermission(scavRole.id, locationsCategoryScavengerAllowedPerms, locationsCategoryScavengerDeniedPerms, 0, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Modified category channel (${locationsCategory.name} ID: ${locationsCategory.id}) permissions for Scavenger role: ${scavRole.id} (allow: ${locationsCategoryScavengerAllowedPerms} deny: ${locationsCategoryScavengerDeniedPerms})`)
				}

				/**
				 * Verify Voice Channels category
				 */
				if (!voiceCategory) {
					voiceCategory = await guild.createChannel('Voice Channels', Constants.ChannelTypes.GUILD_CATEGORY, {
						reason: 'raid guild sync'
					})
					logger.debug(`[RAID GUILD SYNC] Created category channel (${voiceCategory.name} ID: ${voiceCategory.id})`)
				}

				if (voiceCategory.position !== 1) {
					await voiceCategory.editPosition(1)
					logger.debug(`[RAID GUILD SYNC] Moved category channel (${voiceCategory.name} ID: ${voiceCategory.id}) position to 1`)
				}

				/**
				 * Verify Scavenger Voice channel
				 */
				if (!scavVoiceChannel) {
					scavVoiceChannel = await guild.createChannel('Scavenger Voice', Constants.ChannelTypes.GUILD_VOICE, {
						reason: 'raid guild sync',
						parentID: voiceCategory.id
					})
					logger.debug(`[RAID GUILD SYNC] Created channel (${scavVoiceChannel.name} ID: ${scavVoiceChannel.id}) and made it a child of the Voice Channels category (${voiceCategory.id})`)
				}

				if (scavVoiceChannel.parentID !== voiceCategory.id) {
					await scavVoiceChannel.edit({
						parentID: voiceCategory.id
					}, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Made channel (${scavVoiceChannel.name} ID: ${scavVoiceChannel.id}) a child of the Voice Channels category (${voiceCategory.id})`)
				}

				if (scavVoiceChannel.position !== 0) {
					await scavVoiceChannel.editPosition(0)
					logger.debug(`[RAID GUILD SYNC] Moved channel (${scavVoiceChannel.name} ID: ${scavVoiceChannel.id}) position to 0`)
				}

				const scavVoiceEveryonePerms = scavVoiceChannel.permissionOverwrites.get(guild.id)
				const scavVoiceEveryoneDeniedPerms = Constants.Permissions.viewChannel
				if (scavVoiceEveryonePerms?.allow !== 0n || scavVoiceEveryonePerms?.deny !== scavVoiceEveryoneDeniedPerms) {
					await scavVoiceChannel.editPermission(guild.id, 0n, scavVoiceEveryoneDeniedPerms, 0, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Modified channel (${scavVoiceChannel.name} ID: ${scavVoiceChannel.id}) permissions for @everyone role: ${guild.id} (allow: 0n deny: ${scavVoiceEveryoneDeniedPerms})`)
				}

				const scavVoiceScavengerPerms = scavVoiceChannel.permissionOverwrites.get(scavRole.id)
				const scavVoiceScavengerAllowedPerms = Constants.Permissions.viewChannel + Constants.Permissions.voiceConnect + Constants.Permissions.voiceSpeak + Constants.Permissions.voiceUseVAD
				if (scavVoiceScavengerPerms?.allow !== scavVoiceScavengerAllowedPerms || scavVoiceScavengerPerms?.deny !== 0n) {
					await scavVoiceChannel.editPermission(scavRole.id, scavVoiceScavengerAllowedPerms, 0n, 0, 'raid guild sync')
					logger.debug(`[RAID GUILD SYNC] Modified channel (${scavVoiceChannel.name} ID: ${scavVoiceChannel.id}) permissions for Scavenger role: ${scavRole.id} (allow: ${scavVoiceScavengerAllowedPerms} deny: 0n)`)
				}

				/**
				 * Verify raid channels
				 */
				for (let i = 0; i < location.channels.length; i++) {
					const raidChan = location.channels[i]
					let channel = guild.channels.find(ch => ch.name === raidChan.name) as TextChannel | undefined

					if (!channel) {
						channel = await guild.createChannel(raidChan.name, Constants.ChannelTypes.GUILD_TEXT, {
							reason: 'raid guild sync',
							parentID: locationsCategory.id
						})
						logger.debug(`[RAID GUILD SYNC] Created channel (${channel.name} ID: ${channel.id}) and made it a child of the Locations category (${locationsCategory.id})`)
					}

					if (channel.parentID !== locationsCategory.id) {
						await channel.edit({
							parentID: locationsCategory.id
						}, 'raid guild sync')
						logger.debug(`[RAID GUILD SYNC] Made channel (${channel.name} ID: ${channel.id}) a child of the Locations category (${locationsCategory.id})`)
					}

					if (channel.position !== i + 1) {
						await channel.editPosition(i + 1)
						logger.debug(`[RAID GUILD SYNC] Moved channel (${channel.name} ID: ${channel.id}) position to ${i + 1}`)
					}

					if (raidChan.topic && (!channel.topic || channel.topic !== raidChan.topic)) {
						await channel.edit({
							topic: raidChan.topic
						})
						logger.debug(`[RAID GUILD SYNC] Modified channel (${channel.name} ID: ${channel.id}) topic to ${raidChan.topic}`)
					}
				}

				successfulSyncs++
				logger.info(`[RAID GUILD SYNC] Finished syncing raid guild (${guild.name} ID: ${guild.id})`)
			}
			catch (err) {
				logger.error(err)
			}
		}
	}

	logger.info(`[RAID GUILD SYNC] Successfully synced ${successfulSyncs} raid guilds on shard(s): ${Array.from(app.bot.shards.keys()).join(', ')}`)
}

function snowflakeToDate (snowflake: string): Date {
	return new Date(Math.floor((parseInt(snowflake) / 4194304) + 1420070400000))
}
