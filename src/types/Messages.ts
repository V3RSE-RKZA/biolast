import { GuildTextableChannel, Message, TextableChannel, AdvancedMessageContent, PossiblyUncachedTextable } from 'eris'
import { ComponentActionRow } from 'slash-create'

// conditional type to determine message return type
export type MessageType<T> = T extends Message<GuildTextableChannel> ? Message<GuildTextableChannel> & ComponentMessage<GuildTextableChannel> : Message & ComponentMessage<TextableChannel>

export type ComponentMessageContent = string | (AdvancedMessageContent & { components?: ComponentActionRow[] })

/**
 * Used to edit components on an existing message
 */
export interface ComponentMessage<T extends PossiblyUncachedTextable> extends Message {
	edit(content: ComponentMessageContent): Promise<MessageType<Message<T>>>
}
