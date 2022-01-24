import { EventListeners } from 'eris'
import App from '../app'

export interface EventHandler<T extends keyof EventListeners = keyof EventListeners> {
	name: T
	run: (this: App, ...args: EventListeners[T]) => Promise<void>
}
