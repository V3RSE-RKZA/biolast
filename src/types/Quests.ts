import { Item } from './Items'

export type QuestType = 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Scavenge' | 'Scavenge With A Key' | 'Retrieve Item'

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

interface BaseRegionQuest extends BaseQuest {
	type: 'Region'
}
/**
 * This quest type requires a key to be specified
 */
interface KeyScavengeRegionQuest extends BaseRegionQuest {
	questType: 'Scavenge With A Key'
	key: Item
}
/**
 * This quest type requires a quest item to be specified
 */
interface QuestItemRegionQuest extends BaseRegionQuest {
	questType: 'Retrieve Item'
	item: Item
}

/**
 * Side quests have no item or money rewards (only XP reward), and can be assigned regardless of players region.
 */
export interface SideQuest extends BaseQuest {
	type: 'Side'
	questType: 'Player Kills' | 'NPC Kills' | 'Boss Kills' | 'Any Kills' | 'Scavenge'
}

/**
 * Region specific quests give a money or item reward, and require user to do something in their highest unlocked region.
 */
export type RegionQuest = KeyScavengeRegionQuest | QuestItemRegionQuest
