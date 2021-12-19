import { AdvancedMessageContent, Message, User } from 'eris'
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
