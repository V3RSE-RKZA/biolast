import { allItems } from '../src/resources/items'

const aliases: string[] = []

for (const item of allItems) {
	aliases.push(...item.aliases)
}

test('items have no duplicate names', () => {
	const duplicates = allItems.map(i => i.name).filter((name, i, arr) => name && arr.indexOf(name) !== i)

	expect(duplicates).toEqual([])
})

test('items have no duplicate aliases', () => {
	const duplicates = aliases.filter((alias, i, arr) => alias && arr.indexOf(alias) !== i)

	expect(duplicates).toEqual([])
})
