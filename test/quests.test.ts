import { sideQuests } from '../src/resources/sidequests'
import { allLocations } from '../src/resources/locations'

const combinedQuests = [...sideQuests, ...allLocations.map(l => l.quests).flat(1)]

test('there are no quests with the same id', () => {
	const duplicateQuestIDs = combinedQuests.map(i => i.id).filter((name, i, arr) => name && arr.indexOf(name) !== i)

	expect(duplicateQuestIDs).toEqual([])
})
