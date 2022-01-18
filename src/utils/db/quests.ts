import { RegionQuest, SideQuest } from '../../types/Quests'
import { Query, QuestRow } from '../../types/mysql'
import { Item } from '../../types/Items'

/**
 *
 * @param query Query to use
 * @param userID ID of user to get quest of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users quests
 */
export async function getUserQuest (query: Query, userID: string, forUpdate = false): Promise<QuestRow | undefined> {
	return (await query(`SELECT * FROM quests WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID]))[0]
}

/**
 * Increases a users quest progress
 * @param query Query to use
 * @param userID ID of user to increase quest progress of
 * @param amount Amount to increase progress by
 */
export async function increaseProgress (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE quests SET progress = progress + ? WHERE userId = ?', [amount, userID])
}

/**
 *
 * @param query Query to use
 * @param userID ID of the user to delete quest of
 */
export async function deleteQuest (query: Query, userID: string): Promise<void> {
	await query('DELETE FROM quests WHERE userId = ?', [userID])
}

/**
 * Adds a quest to a user
 * @param query Query to use
 * @param userID ID of user to create quest for
 * @param quest The quest being added
 */
export async function createQuest (query: Query, userID: string, quest: RegionQuest | SideQuest, xpReward: number, itemReward?: Item, moneyReward?: number): Promise<QuestRow> {
	await query('INSERT INTO quests (userId, questId, questType, progressGoal, itemReward, xpReward, moneyReward) VALUES (?, ?, ?, ?, ?, ?, ?)', [
		userID,
		quest.id,
		quest.questType,
		quest.progressGoal,
		itemReward?.name,
		xpReward,
		moneyReward
	])

	return {
		questId: quest.id,
		userId: userID,
		progress: 0,
		progressGoal: quest.progressGoal,
		questType: quest.questType,
		createdAt: new Date(),
		itemReward: itemReward?.name,
		xpReward,
		moneyReward
	}
}
