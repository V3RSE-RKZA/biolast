export const debug = process.env.NODE_ENV !== 'production'

export const botToken = process.env.BOT_TOKEN

export const clientId = process.env.BOT_CLIENT_ID

export const prefix = process.env.PREFIX

export const icons = {
	money: '₽'
}

export const baseBackpackLimit = 15

// User ids of users who have admin permissions (can run commands with the 'admin' category)
export const adminUsers = ['168958344361541633']

export const customsGuilds = process.env.CUSTOMS_GUILDS.split(',')
