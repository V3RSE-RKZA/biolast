export const debug = process.env.NODE_ENV !== 'production'

export const botToken = process.env.BOT_TOKEN

export const clientId = process.env.BOT_CLIENT_ID

// This is only used for text commands (commands that rely on message.content)
export const prefix = process.env.PREFIX || '='

export const icons = {
	money: '₽',
	health: {
		start_full: '<:health_bar_start_full:849053369368313906>',
		mid_full: '<:health_bar_mid_full:849053369317326868>',
		end_full: '<:health_bar_end_full:849053369385615431>',
		percent_25: '<:health_bar_25:849055032875810816>',
		percent_50: '<:health_bar_50:849055033126944828>',
		percent_75: '<:health_bar_75:849055032879218718>',
		start_25: '<:health_bar_start_25:849056171821236224>',
		start_50: '<:health_bar_start_50:849056171792007168>',
		start_75: '<:health_bar_start_75:849056171540348959>',
		empty: '<:health_bar_empty:849065056363872318>'
	},
	wave: '<:blobwave:884672272646963242>',
	checkmark: '<:complete:886737255274786846>',
	cancel: '<:cancel:886737255165755432>',
	warning: '<:warning:886737255379636274>',
	question: '<:question:886737255299940392>',
	information: '<:information:886737255148957767>',
	danger: '<:danger:886836924558491648>',
	crosshair: '<:crosshair:886854038161874954>',
	timer: '<:cooldown:886855254568747028>'
}

// How many items a single user can buy from the shop each day
export const shopDailyBuyLimit = 10

export const baseBackpackLimit = 15

// User ids of users who have admin permissions (can run commands with the 'admin' category)
export const adminUsers = ['168958344361541633', '319897342415470592']

// IDs of guilds where raids can take place. Refer to ./resources/raids.ts for what
// channels a raid will need in order to work properly.
export const raidGuilds = {
	suburbsGuilds: process.env.SUBURBS_GUILDS ? process.env.SUBURBS_GUILDS.split(',') : [],
	farmGuilds: process.env.FARM_GUILDS ? process.env.FARM_GUILDS.split(',') : []
}

// Slash commands will be registered here while debug is true. Registering commands to a guild is faster than registering globally.
// If you leave this unset, commands will be registered globally regardless if debug is true.
export const testingGuildId = process.env.TESTING_GUILD_ID
