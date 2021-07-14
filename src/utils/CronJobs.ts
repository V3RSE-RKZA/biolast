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
		cron.schedule('*/5 * * * *', this.oftenTasks.bind(this), { timezone: 'America/New_York' })
	}

	private async dailyTasks (): Promise<void> {
		console.log('[CRONJOBS] Running daily tasks')

		// clean up cooldowns table, prevents the table from having inactive records
		await query('DELETE FROM cooldowns WHERE NOW() > ADDDATE(createdAt, INTERVAL length SECOND)')
	}

	private async hourlyTasks (): Promise<void> {
		console.log('[CRONJOBS] Running hourly tasks')
	}

	private async oftenTasks (): Promise<void> {
		console.log('[CRONJOBS] Running often tasks (5 minutes)')

		// remove ground items that have been on the ground for 20+ minutes
		await query('DELETE FROM ground_items WHERE NOW() > createdAt + INTERVAL 20 MINUTE')
	}
}

export default CronJobs
