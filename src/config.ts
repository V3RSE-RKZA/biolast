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
		start_full: '<:health_1_full:932221452839690283>',
		start_half: '<:health_1_half:932221452843884565>',
		start_empty: '<:health_1_empty:932221453137477713>',
		mid_full: '<:health_mid_full:907929720019111946>',
		mid_half: '<:health_mid_half:907929719868125205>',
		mid_empty: '<:bar_mid_empty:907929719486418986>',
		end_full: '<:health_end_full:907929719972986880>',
		end_half: '<:health_end_half:907929719935213578>',
		end_empty: '<:bar_end_empty:907929719763251230>'
	},
	xp: {
		start_full: '<:xp_1_full:932221241866203247>',
		start_half: '<:xp_1_half:932221241711001651>',
		start_empty: '<:xp_1_empty:932221241459343421>',
		mid_full: '<:xp_mid_full:932224365033037866>',
		mid_half: '<:xp_mid_half:932224364873670688>',
		mid_empty: '<:xp_mid_empty:932224365133705256>',
		end_full: '<:xp_end_full:932224365179859015>',
		end_half: '<:xp_end_half:932224365150502922>',
		end_empty: '<:xp_end_empty:932224365146284072>'
	},
	red_bar: {
		start_full: '<:red_1_full:907947200712179763>',
		start_half: '<:red_1_half:907947200988995584>',
		start_empty: '<:red_1_empty:907947539335086080>',
		mid_full: '<:red_mid_full:907943811303485470>',
		mid_half: '<:red_mid_half:907943811311861840>',
		mid_empty: '<:bar_mid_empty:907929719486418986>',
		end_full: '<:red_end_full:907947201093853184>',
		end_half: '<:red_end_half:907947201047699476>',
		end_empty: '<:bar_end_empty:907929719763251230>'
	},
	rarities: {
		rare: ['<:rare_1:903415663564038195>', '<:rare_2:903415663861858355>'],
		uncommon: ['<:uncommon_1:903413568366592050>', '<:uncommon_2:903413568312061982>', '<:uncommon_3:903413568026861579>', '<:uncommon_4:903423158869196811>'],
		common: ['<:common_1:903410298747228190>', '<:common_2:903410298747232316>', '<:common_3:903410298784989184>'],
		insanely: ['<:insanely_1:903427822679392287>', '<:insanely_2:903427822649999380>', '<:insanely_3:903427822348009483>', '<:insanely_4:903427822691950612>']
	},
	wave: '<:blobwave:884672272646963242>',
	checkmark: '<:complete:886737255274786846>',
	cancel: '<:cancel:886737255165755432>',
	warning: '<:warning:886737255379636274>',
	question: '<:question:886737255299940392>',
	information: '<:information:886737255148957767>',
	danger: '<:danger:886836924558491648>',
	crosshair: '<:crosshair:886854038161874954>',
	timer: '<:cooldown:886855254568747028>',
	biohazard: '<:biohazard:886561850622345216>',
	key: '<:U_key:870786870852874260>',
	burning: '🔥',
	postive_effect_debuff: '<:debuff:902746707794726942>',
	positive_effect_buff: '<:buff:902746707622776832>',
	negative_effect_buff: '<:plus_negative_effect:931737473502019664>',
	negative_effect_debuff: '<:minus_negative_effect:931737473502036048>',
	panic: '<:panic:928046269061021806>',
	loading: '<a:loading:928735911196381224>',
	merchant: '<:flurshed:928849729603907594>',
	xp_star: '<:xp_star:932226958148911124>',
	error_pain: '<a:pain:934193619714338906>',
	button_icons: {
		// ids of custom icons used in buttons throughout the bot
		page_button_next: '932632499874570300',
		page_button_previous: '932632500092682250',
		upgrade_skills_icon: '933440155103158372'
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
