import { TextCommand } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import { getItem } from '../utils/argParsers'
import { getItemDisplay } from '../utils/itemUtils'
import { icons } from '../config'
import { getAttackDamage } from '../utils/attackUtils'

// yes this command is ugly its only for admins >:(

export const command: TextCommand = {
	name: 'calculate',
	aliases: [],
	async execute (app, message, { args, prefix }) {
		const ammo = getItem([args[0]])
		const armor = getItem([args[1]])

		if (!ammo || !armor || (ammo.type !== 'Ammunition' && ammo.type !== 'Melee Weapon') || (armor.type !== 'Body Armor' && armor.type !== 'Helmet')) {
			await reply(message, {
				content: `${icons.danger} Unable to find item with that name. \`=calculate <ammo name> <armor name>\``
			})
			return
		}

		const damage = getAttackDamage(ammo.damage, ammo.penetration, armor.type === 'Body Armor' ? 'chest' : 'head', armor.type === 'Body Armor' ? armor : undefined, armor.type === 'Helmet' ? armor : undefined)

		await reply(message, {
			content: `${getItemDisplay(ammo)} would deal ${damage.total} (${damage.reduced} reduced) damage to ${getItemDisplay(armor)}`
		})
	}
}
