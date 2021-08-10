import pino from 'pino'
import { debug } from '../config'

const pinoPrettyOpts = {
	colorize: true,
	ignore: 'pid,hostname'
}

export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	prettyPrint: debug ? pinoPrettyOpts : false
})
