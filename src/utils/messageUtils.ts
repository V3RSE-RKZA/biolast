import { Message, User } from 'eris'
import { MessageType, ComponentMessageContent } from '../types/Messages'

export function reply<T extends Message> (msg: T, content: ComponentMessageContent): Promise<MessageType<T>> {
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

export async function messageUser (user: User, content: ComponentMessageContent, throwErr = false): Promise<void> {
	try {
		const dm = await user.getDMChannel()
		await dm.createMessage(content)
	}
	catch (err) {
		console.warn(`Failed to send message to user: ${user.id}`)

		if (throwErr) {
			throw new Error(err)
		}
	}
}
