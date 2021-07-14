import App from '../app'
import cron from 'node-cron'
import { query } from './db/mysql'

class CronJobs {
	private app: App

	constructor(app: App) {
		this.app = app
	}

	start (): void {
		cron.schedule('0 0 0 * * *', this.dailyTasks.bind(this), { timezone: 'America/New_York' })
		cron.schedule('0 * * * *', this.hourlyTasks.bind(this), { timezone: 'America/New_York' })
	}

	private async dailyTasks (): Promise<void> {
		console.log('[CRONJOBS] Running daily tasks')

		// clean up cooldowns table, prevents the table from having inactive records
		await query('DELETE FROM cooldowns WHERE NOW() > ADDDATE(createdAt, INTERVAL length SECOND)')
	}

	private async hourlyTasks (): Promise<void> {
		console.log('[CRONJOBS] Running hourly tasks')
	}
}

export default CronJobs
