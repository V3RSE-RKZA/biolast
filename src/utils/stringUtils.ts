import { icons } from '../config'
import { BodyPart } from './raidUtils'

export function formatNumber (number: number, noIcon = false): string {
	if (noIcon) {
		return number.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	}

	return `${icons.money} ${number.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/**
 * Format health and max health into an emote health bar
 * @param curentHP Current health
 * @param maxHP Max health
 * @returns A health bar
 */
export function formatHealth (curentHP: number, maxHP: number): string {
	const hpPerBar = maxHP / 5
	let hpStr = ''

	for (let i = 0; i < 5; i++) {
		const barPerc = (curentHP - (hpPerBar * i)) / hpPerBar

		if (i === 0) {
			if (barPerc >= 1) {
				hpStr += icons.health.start_full
			}
			else if (barPerc >= 0.75) {
				hpStr += icons.health.start_75
			}
			else if (barPerc >= 0.5) {
				hpStr += icons.health.start_50
			}
			else if (barPerc > 0) {
				hpStr += icons.health.start_25
			}
			else {
				hpStr += icons.health.empty
			}
		}
		else if (i === 4) {
			if (barPerc >= 1) {
				hpStr += icons.health.end_full
			}
			else if (barPerc >= 0.75) {
				hpStr += icons.health.percent_75
			}
			else if (barPerc >= 0.5) {
				hpStr += icons.health.percent_50
			}
			else if (barPerc >= 0.25) {
				hpStr += icons.health.percent_25
			}
			else {
				hpStr += icons.health.empty
			}
		}

		// middle health block
		else if (barPerc >= 1) {
			hpStr += icons.health.mid_full
		}
		else if (barPerc >= 0.75) {
			hpStr += icons.health.percent_75
		}
		else if (barPerc >= 0.5) {
			hpStr += icons.health.percent_50
		}
		else if (barPerc >= 0.25) {
			hpStr += icons.health.percent_25
		}
		else {
			hpStr += icons.health.empty
		}
	}

	return hpStr
}

/**
 * Combines an array of strings with "and"
 * @param array Array to combine
 */
export function combineArrayWithAnd (array: string[]): string {
	if (array.length === 1) {
		return array[0]
	}
	else if (array.length === 2) {
		return `${array[0]} and ${array[1]}`
	}

	const last = array.pop()
	return `${array.join(', ')}, and ${last}`
}

/**
 * @param bodyPart Body part to get emoji for
 * @returns The emoji that represents that body part
 */
export function getBodyPartEmoji (bodyPart: BodyPart): string {
	switch (bodyPart) {
		case 'head': return '😵'
		case 'chest': return '👕'
		case 'leg': return '🦵'
		case 'arm': return '💪'
	}
}

