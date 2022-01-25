import mysql, { QueryOptions } from 'mysql'
import { Transaction } from '../../types/mysql'
import { logger } from '../logger'

const pool = mysql.createPool({
	connectionLimit: 10,
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	supportBigNumbers: true,
	bigNumberStrings: false,
	charset: 'utf8mb4'
})

pool.on('connection', connection => {
	logger.debug(`[MYSQL][${connection.threadId}] Created a new connection in the pool`)
})

export function query (sql: string | QueryOptions, args?: any[]): Promise<any> {
	return new Promise((resolve, reject) => {
		pool.query(sql, args, (err, rows) => {
			if (err) {
				return reject(err)
			}

			resolve(rows)
		})
	})
}

export function beginTransaction (): Promise<Transaction> {
	return new Promise((resolve, reject) => {
		pool.getConnection((conError, connection) => {
			if (conError) {
				return reject(conError)
			}

			connection.beginTransaction(transactionError => {
				if (transactionError) {
					connection.rollback(() => {
						connection.release()

						reject(transactionError)
					})
				}
				else {
					const transactionQuery = (sql: string | QueryOptions, args?: any[]) => new Promise((resolveQuery, rejectQuery) => {
						connection.query(sql, args, (queryError, rows) => {
							if (queryError) {
								// error with query
								connection.rollback(() => {
									connection.release()

									rejectQuery(queryError)
								})
							}
							else {
								resolveQuery(rows)
							}
						})
					})

					const commit = () => new Promise<string>((resolveCommit, rejectCommit) => {
						clearTimeout(rollbackTimeout)

						connection.commit(err => {
							if (err) {
								// rollback
								connection.rollback(() => {
									connection.release()
									rejectCommit(err)
								})
							}
							else {
								connection.release()

								resolveCommit('success')
							}
						})
					})

					// to prevent transaction from hanging
					const rollbackTimeout = setTimeout(() => {
						logger.info('TRANSACTION TIMED OUT, ROLLING BACK')
						connection.rollback(() => {
							try {
								connection.release()
							}
							catch (err) {
								logger.warn(err)
							}
						})
					}, 5000)

					resolve({ query: transactionQuery, commit })
				}
			})
		})
	})
}
