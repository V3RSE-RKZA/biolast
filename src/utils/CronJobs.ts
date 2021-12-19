import App from '../app'
import cron from 'node-cron'
import { query } from './db/mysql'
import { logger } from './logger'
import getRandomInt from './randomInt'

class CronJobs {
	private app: App

	constructor (app: App) {
		this.app = app
	}

	start (): void {
		cron.schedule('0 0 0 * * *', this.dailyTasks.bind(this), { timezone: 'America/New_York' })
		cron.schedule('0 * * * *', this.hourlyTasks.bind(this), { timezone: 'America/New_York' })
		cron.schedule('*/5 * * * *', this.oftenTasks.bind(this), { timezone: 'America/New_York' })
		cron.schedule('*/30 * * * *', this.hungerTask.bind(this), { timezone: 'America/New_York' })
	}

	private async dailyTasks (): Promise<void> {
		logger.info('[CRONJOBS] Running daily tasks')

		// clean up cooldowns table, prevents the table from having inactive records
		await query('DELETE FROM cooldowns WHERE NOW() > ADDDATE(createdAt, INTERVAL length SECOND)')

		// reset shop sales for all users
		await query('UPDATE users SET shopSales = 0 WHERE shopSales > 0')
	}

	private async hourlyTasks (): Promise<void> {
		logger.info('[CRONJOBS] Running hourly tasks')

		this.app.shopSellMultiplier = getRandomInt(90, 110) / 100
	}

	private async hungerTask (): Promise<void> {
		// increase companions hunger (+1/30 mins)
		await query('UPDATE companions SET hunger = hunger + 1 WHERE hunger < 100')
	}

	private async oftenTasks (): Promise<void> {
		logger.info('[CRONJOBS] Running often tasks (5 minutes)')

		// remove ground items that have been on the ground for 10+ minutes
		await query('DELETE items FROM items INNER JOIN ground_items ON items.id = ground_items.itemId WHERE NOW() > ground_items.createdAt + INTERVAL 10 MINUTE')

		// remove items from the shop that are older than 1 day
		await query('DELETE items FROM items INNER JOIN shop_items ON items.id = shop_items.itemId WHERE NOW() > shop_items.createdAt + INTERVAL 1 DAY')

		// heal players not in duel passively (5 hp/5mins)
		await query(`UPDATE users SET health = CASE
			WHEN maxHealth - health >= 5 THEN health + 5
			ELSE maxHealth
		END
		WHERE health < maxHealth
		AND fighting = 0`)
	}
}

export default CronJobs
