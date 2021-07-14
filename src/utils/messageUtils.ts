import { Message } from 'eris'
import { MessageType, ComponentMessageContent } from '../types/Messages'

export function reply<T extends Message>(msg: T, content: ComponentMessageContent): Promise<MessageType<T>> {
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
