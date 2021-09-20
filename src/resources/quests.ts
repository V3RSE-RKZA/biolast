import { Item } from '../types/Items'
import { items } from './items'

// https://stackoverflow.com/a/49725198
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys]

export type QuestType = 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Evacs' |'Scavenge With A Key' | 'Retrieve Item'

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

/**
 * This quest type requires a quest item to be specified
 */
 interface QuestItemQuest extends BaseQuest {
	questType: 'Retrieve Item'
	item: Item
}

export type Quest = BasicQuest | KeyScavengeQuest | QuestItemQuest

export const quests: Quest[] = [
	{
		id: 'lowest_lvl_npc_kills_1',
		questType: 'NPC Kills',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 1,
		rewards: {
			item: items.bandage,
			xp: 25
		}
	},
	{
		id: 'lowest_lvl_npc_kills_2',
		questType: 'NPC Kills',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 1,
		rewards: {
			money: 40,
			xp: 25
		}
	},
	{
		id: 'lowest_lvl_evacs_1',
		questType: 'Evacs',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 3,
		rewards: {
			item: items['.22lr_bullet'],
			xp: 25
		}
	},
	{
		id: 'lowest_lvl_evacs_2',
		questType: 'Evacs',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 3,
		rewards: {
			money: 50,
			xp: 25
		}
	},
	{
		id: 'low_lvl_npc_kills_1',
		questType: 'NPC Kills',
		minLevel: 3,
		maxLevel: 8,
		progressGoal: 2,
		rewards: {
			item: items.ifak_medkit,
			xp: 40
		}
	},
	{
		id: 'low_lvl_npc_kills_2',
		questType: 'NPC Kills',
		minLevel: 3,
		maxLevel: 8,
		progressGoal: 2,
		rewards: {
			money: 100,
			xp: 40
		}
	},
	{
		id: 'low_lvl_player_kills_1',
		questType: 'Player Kills',
		minLevel: 3,
		maxLevel: 8,
		progressGoal: 2,
		rewards: {
			item: items['9mm_FMJ_bullet'],
			xp: 40
		}
	},
	{
		id: 'low_lvl_player_kills_2',
		questType: 'Player Kills',
		minLevel: 3,
		maxLevel: 8,
		progressGoal: 2,
		rewards: {
			money: 150,
			xp: 40
		}
	},
	{
		id: 'low_lvl_scavenge_1',
		questType: 'Scavenge With A Key',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 1,
		key: items.shed_key,
		rewards: {
			money: 200,
			xp: 40
		}
	},
	{
		id: 'low_lvl_retrieve_item_1',
		questType: 'Retrieve Item',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 1,
		rewards: {
			money: 325,
			xp: 50
		},
		item: items['glock-17']
	},
	{
		id: 'low_lvl_retrieve_item_2',
		questType: 'Retrieve Item',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 2,
		rewards: {
			money: 300,
			xp: 50
		},
		item: items.walker_goop
	}
]
