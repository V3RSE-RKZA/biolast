import { AdvancedMessageContent, Message, User } from 'eris'
import { AnyComponent, AnyComponentButton, ComponentActionRow, ComponentSelectMenu, ComponentType } from 'slash-create'
import { MessageType } from '../types/Messages'
import { logger } from './logger'

export function reply<T extends Message> (msg: T, content: AdvancedMessageContent): Promise<MessageType<T>> {
	if (typeof content === 'string') {
		content = {
			content
		}
	}

	Object.assign(content, {
		messageReference: {
			messageID: msg.id
		}
	})

	return msg.channel.createMessage(content) as Promise<MessageType<T>>
}

export async function messageUser (user: User, content: AdvancedMessageContent, throwErr = false): Promise<void> {
	try {
		const dm = await user.getDMChannel()
		await dm.createMessage(content)
	}
	catch (err) {
		logger.warn(`Failed to send message to user: ${user.id}`)

		if (throwErr) {
			throw new Error(err)
		}
	}
}

/**
 * Disable all components
 * @param components Array of component action rows or buttons
 * @returns Components with all components disabled
 */
export function disableAllComponents (components: (AnyComponentButton | ComponentSelectMenu)[]): (AnyComponentButton | ComponentSelectMenu)[]
export function disableAllComponents (components: AnyComponent[]): ComponentActionRow[]
export function disableAllComponents (components: AnyComponent[]): AnyComponent[] {
	if (isActionRowComponents(components)) {
		return components.map(r => ({ ...r, components: r.components.map(c => ({ ...c, disabled: true })) }))
	}

	return (components as (AnyComponentButton | ComponentSelectMenu)[]).map(c => ({ ...c, disabled: true }))
}

function isActionRowComponents (components: AnyComponent[]): components is ComponentActionRow[] {
	return components.every(c => c.type === ComponentType.ACTION_ROW)
}
