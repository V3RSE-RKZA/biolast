export const debug = process.env.NODE_ENV !== 'production'

export const botToken = process.env.BOT_TOKEN

export const clientId = process.env.BOT_CLIENT_ID

// This is only used for text commands (commands that rely on message.content)
// you can also just mention the bot if you don't have the message content intent
// ex. =ban <user> or @bot ban <user> both work
export const prefix = process.env.PREFIX || '='

export const icons = {
	copper: '<:copper:903310312701313114>',
	health: {
		start_full: '<:green_1_full:935651814123135038>',
		start_half: '<:green_1_half:935651814357995521>',
		start_empty: '<:bar_start_empty:935642683362398208>',
		mid_full: '<:green_mid_full:935651814345416704>',
		mid_half: '<:green_mid_half:935651814387363850>',
		mid_empty: '<:bar_mid_empty:935642682993283093>',
		end_full: '<:green_end_full:935651814446080070>',
		end_half: '<:green_end_half:935651814299299911>',
		end_empty: '<:bar_end_empty:935642682833911810>',
		icon: '<:heart_full:935659512843632710>'
	},
	xp: {
		start_full: '<:xp_bar_1_full:935642683291103252>',
		start_half: '<:xp_bar_1_half:935642683240767588>',
		start_empty: '<:bar_start_empty:935642683362398208>',
		mid_full: '<:xp_bar_mid_full:935642683186225273>',
		mid_half: '<:xp_bar_mid_half:935642683333021828>',
		mid_empty: '<:bar_mid_empty:935642682993283093>',
		end_full: '<:xp_bar_end_full:935642683404345405>',
		end_half: '<:xp_bar_end_half:935642683303686144>',
		end_empty: '<:bar_end_empty:935642682833911810>'
	},
	red_bar: {
		start_full: '<:red_1_full:935646834041430026>',
		start_half: '<:red_1_half:935646834033041458>',
		start_empty: '<:bar_start_empty:935642683362398208>',
		mid_full: '<:red_mid_full:935646833764614256>',
		mid_half: '<:red_mid_half:935646834054037525>',
		mid_empty: '<:bar_mid_empty:935642682993283093>',
		end_full: '<:red_end_full:935646834083397683>',
		end_half: '<:red_end_half:935646834389569566>',
		end_empty: '<:bar_end_empty:935642682833911810>'
	},
	rarities: {
		rare: ['<:rare_1_pixel:935742459709890570>', '<:rare_2_pixel:935742459894452224>'],
		uncommon: ['<:uncommon1:935731824137740299>', '<:uncommon2:935731824569757697>', '<:uncommon3:935734370977841193>', '<:uncommon4:935731824196481144>'],
		common: ['<:common1:935729677815918644>', '<:common2:935729677790744696>', '<:common3:935729677388115989>'],
		insanely: ['<:insanely1:935739920218214401>', '<:insanely2:935739920302108713>', '<:insanely3:935739920432103525>', '<:insanely4:935739920398557234>']
	},
	wave: '<:blobwave:884672272646963242>',
	checkmark: '<:checkmark_pixel:935776391239172186>',
	cancel: '<:cancel_pixel:935776391159504906>',
	warning: '<:warning_pixel:935780091739402310>',
	information: '<:information_pixel:935776391272730714>',
	danger: '<:danger_pixel:935776391188840459>',
	crosshair: '<:crosshair_pixel:935780089998766150>',
	timer: '<:timer_pixel:935780090061660180>',
	biohazard: '<:biohazard_pixel:935772568831549440>',
	burning: '🔥',
	postive_effect_debuff: '<:minus_icon_pixel:935780090095230996>',
	positive_effect_buff: '<:plus_effect_pixel:935780089977790464>',
	negative_effect_buff: '<:plus_negative_effect_pixel:935780090023931914>',
	negative_effect_debuff: '<:minus_negative_icon_pixel:935780089554149408>',
	panic: '<:panic:928046269061021806>',
	loading: '<a:loading:928735911196381224>',
	merchant: '<:flurshed:928849729603907594>',
	xp_star: '<:xp_star_pixel:935658011379257375>',
	error_pain: '<a:pain:934193619714338906>',
	button_icons: {
		// ids of custom icons used in buttons throughout the bot
		page_button_next: '935785412054642728',
		page_button_previous: '935785602975166464',
		upgrade_skills_icon: '935658011379257375'
	}
}

// How many items a single user can buy from the /market each hour
export const shopHourlyBuyLimit = 5

// Multiplier of the sell price when you sell an item to the shop (ranging from min% to max%).
// If you sold an item worth 100 coins and the multiplier was set to 95%, you would receive 95 coins.
export const shopSellMultiplier = {
	min: 90,
	max: 110
}
// Multiplier for the cost of an item when it's listed on the global shop.
// If a player sells an item for 100 coins, it would be listed on global shop for 200 - 300 coins
export const shopBuyMultiplier = {
	min: 200,
	max: 300
}

export const baseBackpackLimit = 15

// how often a user can accept a trade (in seconds, cooldown only applies if user accepts trade)
export const tradeCooldown = 60 * 60

// the percentage of accuracy needed for player to be able to target a limb in duels.
// this percentage INCLUDES stimulant bonuses as well, so a 30% accuracy weapon with a +25% accuracy stimulant
// would have 55% total accuracy.
export const accuracyToTargetLimbs = 50

// User ids of users who have admin permissions (can run commands with the 'admin' category)
export const adminUsers = ['168958344361541633', '319897342415470592', '622437218744664120', '596841923508174849']

// webhooks for sending logs to
export const webhooks = {
	pvp: {
		id: process.env.GLOBAL_PVP_KILLFEED_WEBHOOK_ID,
		token: process.env.GLOBAL_PVP_KILLFEED_WEBHOOK_TOKEN
	},
	bot_logs: {
		id: process.env.BOT_LOGS_WEBHOOK_ID,
		token: process.env.BOT_LOGS_WEBHOOK_TOKEN
	}
}

// Slash commands will be registered here while debug is true. Registering commands to a guild is faster than registering globally.
// If you leave this unset, commands will be registered globally regardless if debug is true.
export const testingGuildIDs = process.env.TESTING_GUILD_ID ? process.env.TESTING_GUILD_ID.split(',') : []
