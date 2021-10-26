import { dailyQuests, sideQuests } from '../src/resources/quests'

const combinedQuests = [...dailyQuests, ...sideQuests]

test('there are no quests with the same id', () => {
	const duplicateQuestIDs = combinedQuests.map(i => i.id).filter((name, i, arr) => name && arr.indexOf(name) !== i)

	expect(duplicateQuestIDs).toEqual([])
})
