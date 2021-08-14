import levenshtein from 'js-levenshtein'

class Corrector {
	words: string[]
	maxDistance: number

	constructor (words: string[], maxDistance = 2) {
		this.words = words
		this.maxDistance = maxDistance
	}

	/**
	 * @param input Input to get word from
	 * @param maxDistance Max distance between input and word, higher = more lenient. This overrides the maxDistance defined in the constructor
	 * @returns A word if found
	 */
	getWord (input: string, maxDistance?: number): string | undefined {
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

		if (compared[0].steps <= (maxDistance ?? this.maxDistance)) {
			return compared[0].word
		}

		return undefined
	}
}

export default Corrector
