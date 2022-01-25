import pino from 'pino'
import pinoCaller from 'pino-caller'
import { PrettyOptions } from 'pino-pretty'
import { debug } from '../config'
import path from 'path'

const pinoPrettyOpts: PrettyOptions = {
	colorize: true,
	ignore: 'pid,hostname',
	translateTime: 'yyyy-mm-dd HH:MM:ss'
}

const pinoBase = pino({
	level: process.env.LOG_LEVEL || 'info',
	transport: debug ? {
		target: 'pino-pretty',
		options: pinoPrettyOpts
	} : undefined
})

export const logger = debug ? pinoCaller(pinoBase, { relativeTo: path.join(__dirname, '..', '..') }) : pinoBase
