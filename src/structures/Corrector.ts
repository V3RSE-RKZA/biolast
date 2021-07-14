import levenshtein from 'js-levenshtein'

class Corrector {
	words: string[]
	maxDistance: number

	constructor (words: string[], maxDistance = 2) {
		this.words = words
		this.maxDistance = maxDistance
	}

	getWord (input: string): string | undefined {
		if (!input) return undefined
		else if (this.words.includes(input)) return input

		const compared = []

		for (const word of this.words) {
			compared.push({
				word,
				steps: levenshtein(input, word)
			})
		}

		compared.sort((a, b) => a.steps - b.steps)

		if (compared[0].steps <= this.maxDistance) return compared[0].word

		return undefined
	}
}

export default Corrector
