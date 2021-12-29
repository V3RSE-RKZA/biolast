import { DailyQuest } from '../../types/Quests'
import { items } from '../items'

export const dailyQuests: DailyQuest[] = [
	{
		type: 'Daily',
		id: 'lowest_lvl_npc_kills_1',
		questType: 'NPC Kills',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 1,
		rewards: {
			item: items.bandage
		}
	},
	{
		type: 'Daily',
		id: 'lowest_lvl_npc_kills_2',
		questType: 'NPC Kills',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 1,
		rewards: {
			money: 40
		}
	},
	{
		type: 'Daily',
		id: 'lowest_lvl_scavenge_1',
		questType: 'Scavenge',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 2,
		rewards: {
			item: items['.22LR_bullet']
		}
	},
	{
		type: 'Daily',
		id: 'lowest_lvl_scavenge_2',
		questType: 'Scavenge',
		minLevel: 1,
		maxLevel: 4,
		progressGoal: 2,
		rewards: {
			money: 50
		}
	},
	{
		type: 'Daily',
		id: 'low_lvl_npc_kills_1',
		questType: 'NPC Kills',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 2,
		rewards: {
			item: items.ifak_medkit
		}
	},
	{
		type: 'Daily',
		id: 'low_lvl_npc_kills_2',
		questType: 'NPC Kills',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 2,
		rewards: {
			money: 100
		}
	},
	{
		type: 'Daily',
		id: 'low_lvl_player_kills_1',
		questType: 'Player Kills',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 2,
		rewards: {
			item: items['9mm_FMJ_bullet']
		}
	},
	{
		type: 'Daily',
		id: 'low_lvl_player_kills_2',
		questType: 'Player Kills',
		minLevel: 3,
		maxLevel: 30,
		progressGoal: 2,
		rewards: {
			money: 150
		}
	},
	{
		type: 'Daily',
		id: 'low_lvl_scavenge_1',
		questType: 'Scavenge With A Key',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 1,
		key: items.shed_key,
		rewards: {
			money: 200
		}
	},
	{
		type: 'Daily',
		id: 'low_lvl_retrieve_item_1',
		questType: 'Retrieve Item',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 1,
		rewards: {
			money: 325
		},
		item: items['glock-17']
	},
	{
		type: 'Daily',
		id: 'low_lvl_retrieve_item_2',
		questType: 'Retrieve Item',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 2,
		rewards: {
			money: 300
		},
		item: items.walker_goop
	},
	{
		type: 'Daily',
		id: 'low_lvl_retrieve_item_3',
		questType: 'Retrieve Item',
		minLevel: 3,
		maxLevel: 10,
		progressGoal: 1,
		rewards: {
			money: 500
		},
		item: items.farming_guide
	}
]
