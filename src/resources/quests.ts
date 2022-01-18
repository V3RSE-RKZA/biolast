import { SideQuest } from '../types/Quests'
import { allLocations } from './locations'

// basic quests that can be done regardless of users level or region

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
		id: 'side_scavenge_1',
		questType: 'Scavenge',
		progressGoal: 1
	},
	{
		type: 'Side',
		id: 'side_scavenge_2',
		questType: 'Scavenge',
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
	}
]

export const regionQuests = allLocations.map(l => l.quests).flat(1)

export const allQuests = [...sideQuests, ...regionQuests]
