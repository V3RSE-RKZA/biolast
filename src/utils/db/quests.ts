import { OkPacket } from 'mysql'
import { Quest } from '../../resources/quests'
import { Query, QuestRow } from '../../types/mysql'

/**
 *
 * @param query Query to use
 * @param userID ID of user to get quest of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users quests
 */
export async function getUserQuests (query: Query, userID: string, forUpdate = false): Promise<QuestRow[]> {
	return query(`SELECT * FROM quests WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID])
}

/**
 * Increases a users quest progress
 * @param query Query to use
 * @param questID ID of quest to increase progress of
 * @param amount Amount to increase progress by
 */
export async function increaseProgress (query: Query, questID: number, amount: number): Promise<void> {
	await query('UPDATE quests SET progress = progress + ? WHERE id = ?', [amount, questID])
}

/**
 *
 * @param query Query to use
 * @param questID ID of the quest to delete (the sql id)
 */
export async function deleteQuest (query: Query, questID: number): Promise<void> {
	await query('DELETE FROM quests WHERE id = ?', [questID])
}

/**
 * Adds a quest to a user
 * @param query Query to use
 * @param userID ID of user to create quest for
 * @param quest The quest being added
 */
export async function createQuest (query: Query, userID: string, quest: Quest): Promise<QuestRow> {
	const packet: OkPacket = await query('INSERT INTO quests (userId, questId, questType, progressGoal, itemReward, xpReward, moneyReward) VALUES (?, ?, ?, ?, ?, ?, ?)', [
		userID,
		quest.id,
		quest.questType,
		quest.progressGoal,
		quest.rewards.item?.name,
		quest.rewards.xp,
		quest.rewards.money
	])

	return {
		id: packet.insertId,
		questId: quest.id,
		userId: userID,
		progress: 0,
		progressGoal: quest.progressGoal,
		questType: quest.questType,
		createdAt: new Date(),
		itemReward: quest.rewards.item?.name,
		xpReward: quest.rewards.xp,
		moneyReward: quest.rewards.money
	}
}
