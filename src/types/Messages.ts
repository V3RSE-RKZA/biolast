import { GuildTextableChannel, Message } from 'eris'

// conditional type to determine message return type
export type MessageType<T> = T extends Message<GuildTextableChannel> ? Message<GuildTextableChannel> : Message
