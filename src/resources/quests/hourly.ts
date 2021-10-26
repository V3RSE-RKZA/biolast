import { SideQuest } from '../../types/Quests'
import { items } from '../items'

export const sideQuests: SideQuest[] = [
	{
		type: 'Side',
		id: 'side_npc_kills_1',
		questType: 'NPC Kills',
		progressGoal: 1
	},
	{
		type: 'Side',
		id: 'side_npc_kills_2',
		questType: 'NPC Kills',
		progressGoal: 2
	},
	{
		type: 'Side',
		id: 'side_boss_kills_1',
		questType: 'Boss Kills',
		progressGoal: 1
	},
	{
		type: 'Side',
		id: 'side_any_kills_1',
		questType: 'Any Kills',
		progressGoal: 1
	},
	{
		type: 'Side',
		id: 'side_any_kills_2',
		questType: 'Any Kills',
		progressGoal: 2
	},
	{
		type: 'Side',
		id: 'side_evacs_1',
		questType: 'Evacs',
		progressGoal: 1
	},
	{
		type: 'Side',
		id: 'side_evacs_2',
		questType: 'Evacs',
		progressGoal: 2
	},
	{
		type: 'Side',
		id: 'side_player_kills_1',
		questType: 'Player Kills',
		progressGoal: 1
	},
	{
		type: 'Side',
		id: 'side_player_kills_2',
		questType: 'Player Kills',
		progressGoal: 2
	},
	{
		type: 'Side',
		id: 'side_retrieve_item_1',
		questType: 'Retrieve Item',
		progressGoal: 1,
		item: items.walker_goop
	},
	{
		type: 'Side',
		id: 'side_retrieve_item_2',
		questType: 'Retrieve Item',
		progressGoal: 2,
		item: items.walker_goop
	}
]
