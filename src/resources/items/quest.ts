import { QuestItem } from '../../types/Items'

const questObject = <T>(et: { [K in keyof T]: QuestItem & { name: K } }) => et

export const items = questObject({
	test_quest_item: {
		type: 'Quest Item',
		name: 'test_quest_item',
		aliases: [],
		icon: '<:quest_item:886561850525896724>',
		slotsUsed: 3,
		itemLevel: 1
	}
})
