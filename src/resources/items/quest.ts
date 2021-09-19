import { QuestItem } from '../../types/Items'

const questObject = <T>(et: { [K in keyof T]: QuestItem & { name: K } }) => et

export const quest = questObject({
	walker_goop: {
		type: 'Quest Item',
		name: 'walker_goop',
		aliases: ['goop'],
		icon: '<:quest_item:886561850525896724>',
		slotsUsed: 2,
		itemLevel: 1
	}
})
