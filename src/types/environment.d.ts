declare namespace NodeJS {
	export interface ProcessEnv {
		NODE_ENV?: string
		MYSQL_HOST?: string
		MYSQL_USER?: string
		MYSQL_PASSWORD?: string
		MYSQL_DATABASE?: string
		PREFIX?: string
		BOT_TOKEN?: string
		BOT_CLIENT_ID?: string
		SUBURBS_GUILDS?: string
		TESTING_GUILD_ID?: string
	}
}
