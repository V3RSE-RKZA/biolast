import { Item } from '../types/Items'
import { items } from './items'

// https://stackoverflow.com/a/49725198
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys]

export type QuestType = 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Evacs' |'Scavenge With A Key'

interface BaseQuest {
	/**
	 * The ID of this quest that gets saved to the SQL table (unique identifier for this quest)
	 */
	id: string

	questType: QuestType

	/**
	 * The minimum level user must be before they can be assigned this quest
	 */
	minLevel: number

	/**
	 * Max level user can be to obtain the quest
	 */
	maxLevel: number

	/**
	 * How much progress user must obtain before this quest is complete (if questType was kills,
	 * and this was set to 10, the user must get 10 kills for the quest to be complete)
	 */
	progressGoal: number

	/**
	 * Rewards for completing this quest
	 */
	rewards: RequireAtLeastOne<{
		item?: Item
		xp?: number
		money?: number
	}>
}

interface BasicQuest extends BaseQuest {
	questType: 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Evacs'
}

/**
 * This quest type requires a key to be specified
 */
interface KeyScavengeQuest extends BaseQuest {
	questType: 'Scavenge With A Key'
	key: Item
}

export type Quest = BasicQuest | KeyScavengeQuest

export const quests: Quest[] = [
	{
		id: 'low_lvl_kill_players',
		questType: 'Player Kills',
		minLevel: 1,
		maxLevel: 20,
		progressGoal: 2,
		rewards: {
			item: items.bandage
		}
	}
]
