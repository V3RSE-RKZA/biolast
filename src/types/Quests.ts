import { Item } from './Items'

// https://stackoverflow.com/a/49725198
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys]

export type QuestType = 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Evacs' | 'Scavenge With A Key' | 'Retrieve Item'

interface BaseQuest {
	/**
	 * The ID of this quest that gets saved to the SQL table (unique identifier for this quest)
	 */
	id: string

	questType: QuestType

	/**
	 * How much progress user must obtain before this quest is complete (if questType was kills,
	 * and this was set to 10, the user must get 10 kills for the quest to be complete)
	 */
	progressGoal: number
}

interface BaseDailyQuest extends BaseQuest {
	type: 'Daily'

	/**
	 * The minimum level user must be before they can be assigned this quest
	 */
	minLevel: number

	/**
	 * Max level user can be to obtain the quest
	 */
	maxLevel: number

	/**
	 * Rewards for completing this quest
	 */
	rewards: RequireAtLeastOne<{
		item?: Item
		money?: number
	}>
}
interface BasicDailyQuest extends BaseDailyQuest {
	questType: 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Evacs'
}
/**
 * This quest type requires a key to be specified
 */
interface KeyScavengeDailyQuest extends BaseDailyQuest {
	questType: 'Scavenge With A Key'
	key: Item
}
/**
 * This quest type requires a quest item to be specified
 */
interface QuestItemDailyQuest extends BaseDailyQuest {
	questType: 'Retrieve Item'
	item: Item
}


interface BaseSideQuest extends BaseQuest {
	type: 'Side'
}
/**
 * This quest type requires a quest item to be specified
 */
 interface QuestItemSideQuest extends BaseSideQuest {
	questType: 'Retrieve Item'
	item: Item
}
interface BasicSideQuest extends BaseSideQuest {
	questType: 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Evacs'
}

/**
 * Daily quests give significant XP based on the users level and possibly a money or item reward.
 */
export type DailyQuest = BasicDailyQuest | KeyScavengeDailyQuest | QuestItemDailyQuest

/**
 * Side quests have no item or money rewards (only XP reward), and can be assigned regardless of players level.
 */
export type SideQuest = BasicSideQuest | QuestItemSideQuest
