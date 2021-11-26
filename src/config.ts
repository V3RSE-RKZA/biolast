export const debug = process.env.NODE_ENV !== 'production'

export const botToken = process.env.BOT_TOKEN

export const clientId = process.env.BOT_CLIENT_ID

// This is only used for text commands (commands that rely on message.content)
export const prefix = process.env.PREFIX || '='

export const icons = {
	tier3_currency: '<:gold:903310312466440243>',
	tier2_currency: '<:silver:903310312730664990>',
	tier1_currency: '<:copper:903310312701313114>',
	health: {
		start_full: '<:health_1_full:907929719817764884>',
		start_half: '<:health_1_half:907929719876509697>',
		start_empty: '<:health_1_empty:907929719717101598>',
		mid_full: '<:health_mid_full:907929720019111946>',
		mid_half: '<:health_mid_half:907929719868125205>',
		mid_empty: '<:bar_mid_empty:907929719486418986>',
		end_full: '<:health_end_full:907929719972986880>',
		end_half: '<:health_end_half:907929719935213578>',
		end_empty: '<:bar_end_empty:907929719763251230>'
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
	burning: '🔥',
	debuff: '<:debuff:902746707794726942>',
	buff: '<:buff:902746707622776832>'
}

// How many items a single user can buy from the shop each day
export const shopDailyBuyLimit = 10

export const baseBackpackLimit = 15

// User ids of users who have admin permissions (can run commands with the 'admin' category)
export const adminUsers = ['168958344361541633', '319897342415470592', '622437218744664120', '596841923508174849']

// IDs of guilds where raids can take place. They will be automatically set up by the bot on
// start-up (make sure you invite the bot with admin perms to these guilds)
export const raidGuilds = {
	suburbsGuilds: process.env.SUBURBS_GUILDS ? process.env.SUBURBS_GUILDS.split(',') : [],
	farmGuilds: process.env.FARM_GUILDS ? process.env.FARM_GUILDS.split(',') : [],
	mallGuilds: process.env.MALL_GUILDS ? process.env.MALL_GUILDS.split(',') : [],
	stationGuilds: process.env.POLICE_STATION_GUILDS ? process.env.POLICE_STATION_GUILDS.split(',') : []
}

// webhooks for sending logs to
export const webhooks = {
	pvp: {
		id: process.env.GLOBAL_PVP_KILLFEED_WEBHOOK_ID,
		token: process.env.GLOBAL_PVP_KILLFEED_WEBHOOK_TOKEN
	}
}

// seconds that the user wont be allowed to enter a raid after having just finished a raid
export const raidCooldown = 10 * 60

// Slash commands will be registered here while debug is true. Registering commands to a guild is faster than registering globally.
// If you leave this unset, commands will be registered globally regardless if debug is true.
export const testingGuildIDs = process.env.TESTING_GUILD_ID ? process.env.TESTING_GUILD_ID.split(',') : []
