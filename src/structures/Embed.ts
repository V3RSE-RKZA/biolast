import { EmbedOptions } from 'eris'

class Embed {
	embed: EmbedOptions

	constructor () {
		this.embed = {
			// default embed color here
			color: 11746366
		}
	}

	addField (name: string, value: string, inline = false): this {
		if (!name) {
			return this
		}
		else if (!value) {
			return this
		}

		if (!this.embed.fields) {
			this.embed.fields = []
		}
		else if (this.embed?.fields.length > 25) {
			return this
		}

		this.embed.fields.push({
			name: name.substring(0, 256),
			value: value.substring(0, 1024),
			inline
		})

		return this
	}

	setTitle (title: string): this {
		if (!title) return this

		this.embed.title = title.substring(0, 256)

		return this
	}

	setURL (url: string): this {
		if (!url) return this

		this.embed.url = url

		return this
	}

	setDescription (desc: string): this {
		if (!desc) return this

		this.embed.description = desc.substring(0, 4096)

		return this
	}

	setImage (url: string): this {
		if (!url) return this

		this.embed.image = {
			url
		}

		return this
	}

	setThumbnail (url: string): this {
		if (!url) return this

		this.embed.thumbnail = {
			url
		}

		return this
	}

	setFooter (text: string, icon?: string): this {
		if (!text) return this

		this.embed.footer = {
			text: text.substring(0, 2048),
			icon_url: icon || this.embed.footer?.icon_url
		}

		return this
	}

	setTimestamp (timestamp = new Date()): this {
		this.embed.timestamp = timestamp

		return this
	}

	setAuthor (name: string, icon?: string, url?: string): this {
		if (!name) return this

		this.embed.author = {
			name: name.substring(0, 256),
			icon_url: icon,
			url
		}

		return this
	}

	setColor (color: string | number): this {
		if (!color) return this

		if (typeof color === 'string') {
			color = parseInt(color.replace('#', ''), 16)
		}

		this.embed.color = color

		return this
	}

	addBlankField (inline = false): this {
		return this.addField('\u200B', '\u200B', inline)
	}
}

export default Embed
