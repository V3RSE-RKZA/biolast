import { Guild, Member, MemberPartial } from 'eris'
import App from '../app'
import { icons, raidCooldown } from '../config'
import { createCooldown } from '../utils/db/cooldowns'
import { deleteItem, getUserBackpack } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { getItems } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { messageUser } from '../utils/messageUtils'
import { getRaidType } from '../utils/raidUtils'

export async function run (this: App, guild: Guild, member: Member | MemberPartial): Promise<void> {
	const raidType = getRaidType(guild.id)
	if (raidType) {
		const scavRole = guild.roles.find(r => r.name === 'Scavenger')

		if (!scavRole) {
			logger.error(`Could not find Scavenger role in guild: ${guild.name} (${guild.id})`)
			return
		}
		else if (!('roles' in member)) {
			logger.error(`Member uncached for user: ${member.user.username}#${member.user.discriminator} (${member.id}) leaving raid guild: ${guild.name} (${guild.id})`)
			return
		}
		else if (!member.roles.includes(scavRole.id)) {
			// user didn't have scavenger role in the raid server,
			// they would need to join back in this case so they can get the role
			return
		}

		const userRaid = await getUsersRaid(query, member.id)

		if (userRaid && userRaid.guildId === guild.id) {
			// player raid dodged (left a raid they were active in)
			logger.info(`User ${member.user.username}#${member.user.discriminator} (${member.id}) raid dodged from raid guild (${guild.id})`)

			try {
				const transaction = await beginTransaction()
				const userBackpack = await getUserBackpack(transaction.query, member.id, true)
				const userBackpackData = getItems(userBackpack)

				for (const userItem of userBackpackData.items) {
					await deleteItem(transaction.query, userItem.row.id)
				}

				await removeUserFromRaid(transaction.query, member.id)
				await createCooldown(transaction.query, member.id, `raid-${raidType.id}`, raidCooldown)
				await transaction.commit()

				this.clearRaidTimer(member.id)

				await messageUser(member.user, {
					content: `${icons.danger} Raid failed!\n\n` +
						'You left the raid! This is called raid dodging and isn\'t allowed.\n' +
						`You lost all the items in your inventory (**${userBackpackData.items.length}** items).`
				})
			}
			catch (err) {
				logger.error(err)
			}
		}
	}
}
