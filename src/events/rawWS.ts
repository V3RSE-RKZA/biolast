import { RawPacket } from 'eris'
import App from '../app'

export async function run(this: App, packet: RawPacket, id: number): Promise<void> {
	// SLASH COMMANDS AND COMPONENTS ARE NOW BEING HANDLED BY THE slash-create LIBRARY FOR BETTER TYPES

	/* interactions stuff
	if (packet.t === 'INTERACTION_CREATE') {
		const interaction = new Interaction(packet.d, this.bot)

		if (interaction.user.bot) return

		if (interaction.type === 3) {
			// continue
		}
	}
	*/
}
