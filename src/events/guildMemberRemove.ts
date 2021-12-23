import { Guild, Member, MemberPartial } from 'eris'
import App from '../app'

export async function run (this: App, guild: Guild, member: Member | MemberPartial): Promise<void> {
	// console.log(member.user)
}
