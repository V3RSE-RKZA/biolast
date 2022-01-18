import { allQuests } from '../src/resources/quests'

test('there are no quests with the same id', () => {
	const duplicateQuestIDs = allQuests.map(i => i.id).filter((name, i, arr) => name && arr.indexOf(name) !== i)

	expect(duplicateQuestIDs).toEqual([])
})
