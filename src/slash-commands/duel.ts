import { CommandOptionType, SlashCreator, CommandContext, ComponentType, Message, ComponentContext, ComponentSelectMenu } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons } from '../config'
import { Affliction, afflictions } from '../resources/afflictions'
import { allItems, items } from '../resources/items'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Ammunition, HealingMedical, Item, StimulantMedical, Weapon } from '../types/Items'
import { BackpackItemRow, ItemWithRow, UserRow } from '../types/mysql'
import { CollectorObject } from '../utils/ComponentCollector'
import { GRAY_BUTTON, GREEN_BUTTON, RED_BUTTON } from '../utils/constants'
import { addItemToBackpack, createItem, deleteItem, getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { addHealth, addXp, getUserRow, increaseDeaths, increaseKills, lowerHealth } from '../utils/db/players'
import { getUserQuests, increaseProgress } from '../utils/db/quests'
import { getEquips, getItemDisplay, getItemPrice, getItems, sortItemsByAmmo, sortItemsByLevel, sortItemsByValue } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { addStatusEffects, getEffectsDisplay } from '../utils/playerUtils'
import { BodyPart, getAttackDamage, getAttackString, getBodyPartHit } from '../utils/attackUtils'
import { combineArrayWithAnd, formatHealth, formatMoney, getBodyPartEmoji } from '../utils/stringUtils'

type ItemWithRowOfType<T extends Item> = ItemWithRow<BackpackItemRow> & { item: T }

interface AttackChoice {
	choice: 'attack'
	weapon: ItemWithRowOfType<Weapon> | { item: Weapon, row: undefined }
	ammo?: ItemWithRowOfType<Ammunition>
	limbTarget?: BodyPart
}
interface HealChoice {
	choice: 'use a medical item'
	itemRow: ItemWithRowOfType<HealingMedical>
}
interface StimulantChoice {
	choice: 'use a stimulant'
	itemRow: ItemWithRowOfType<StimulantMedical>
}
interface FleeChoice {
	choice: 'try to flee'
}
type PlayerChoice = (AttackChoice | HealChoice | StimulantChoice | FleeChoice) & { speed: number }

const maxStimulantsPerDuel = 4

class DuelCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'duel',
			description: 'Fight another player for their loot.',
			longDescription: 'Fight another scavenger. Take turns using your weapons, whoever dies will lose all of the items in their inventory.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to fight.',
				required: true
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			deferEphemeral: true
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.member) {
			throw new Error('Member not attached to interaction')
		}

		const member = ctx.members.get(ctx.options.user)
		if (!member) {
			await ctx.send({
				content: `${icons.danger} You must specify someone to duel against!`
			})
			return
		}
		else if (member.id === ctx.user.id) {
			await ctx.send({
				content: `${icons.danger} You cannot duel yourself!`
			})
			return
		}
		else if (this.app.activeDuelers.has(ctx.user.id)) {
			await ctx.send({
				content: `${icons.warning} You cannot start another duel while you are already in one.`,
				components: []
			})
			return
		}
		else if (this.app.activeDuelers.has(member.id)) {
			await ctx.send({
				content: `${icons.warning} **${member.displayName}** is in another fight right now!`,
				components: []
			})
			return
		}

		const memberData = await getUserRow(query, member.id)
		if (!memberData) {
			await ctx.send({
				content: `${icons.warning} **${member.displayName}** does not have an account!`
			})
			return
		}

		await ctx.send({
			content: 'Sending duel request...'
		})

		let botMessage = await ctx.sendFollowUp({
			content: `<@${member.id}>, **${ctx.member.displayName}** would like to fight you!`,
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GREEN_BUTTON('Accept Duel', 'confirmed'), RED_BUTTON('Decline', 'canceled')]
			}]
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === member.id))[0]

			if (confirmed.customID !== 'confirmed') {
				await botMessage.edit({
					content: `${icons.danger} **${member.displayName}** declined the duel invite.`,
					components: []
				})
				return
			}

			const preTransaction = await beginTransaction()
			const player1Data = (await getUserRow(preTransaction.query, ctx.user.id, true))!
			const player2Data = (await getUserRow(preTransaction.query, member.id, true))!
			const player1Inventory = await getUserBackpack(preTransaction.query, ctx.user.id, true)
			const player2Inventory = await getUserBackpack(preTransaction.query, member.id, true)
			const player1Stimulants: StimulantMedical[] = []
			const player1Afflictions: Affliction[] = []
			const player2Stimulants: StimulantMedical[] = []
			const player2Afflictions: Affliction[] = []

			if (this.app.activeDuelers.has(ctx.user.id)) {
				await preTransaction.commit()
				await confirmed.editParent({
					content: `${icons.warning} **${ctx.member.displayName}** is in another fight right now!`,
					components: []
				})
				return
			}
			else if (this.app.activeDuelers.has(member.id)) {
				await preTransaction.commit()
				await confirmed.editParent({
					content: `${icons.warning} **${member.displayName}** is in another fight right now!`,
					components: []
				})
				return
			}

			this.app.activeDuelers.add(ctx.user.id).add(member.id)
			await preTransaction.commit()

			const playerChoices = new Map<string, PlayerChoice>()
			let turnNumber = 1
			let duelIsActive = true
			let player1AttackCtx: ComponentContext | undefined
			let player2AttackCtx: ComponentContext | undefined

			await confirmed.editParent({
				content: `<@${ctx.user.id}> <@${member.id}>, Turn #1 - select your action:`,
				embeds: [
					this.getDuelEmbed(
						ctx.member,
						member,
						player1Data,
						player2Data,
						player1Inventory,
						player2Inventory,
						1,
						player1Stimulants,
						player2Stimulants,
						player1Afflictions,
						player2Afflictions
					).embed
				],
				components: [{
					type: ComponentType.ACTION_ROW,
					components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', false, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', false, '💉'), RED_BUTTON('Try to Flee', 'flee')]
				}]
			})

			const runTurn = () => new Promise<void>((resolve, reject) => {
				const turnCollector = this.app.componentCollector.createCollector(botMessage.id, i => i.user.id === ctx.user.id || i.user.id === member.id, 40000)
				const actionCollectors: CollectorObject[] = []
				let player1ChoiceLocked = false
				let player2ChoiceLocked = false

				turnCollector.collector.on('collect', async actionCtx => {
					try {
						const playerChoice = playerChoices.get(actionCtx.user.id)
						const playerLocked = actionCtx.user.id === ctx.user.id ? player1ChoiceLocked : player2ChoiceLocked
						const otherPlayerID = actionCtx.user.id === ctx.user.id ? member.id : ctx.user.id

						if (playerChoice) {
							await actionCtx.send({
								ephemeral: true,
								content: `${icons.danger} You have already selected \`${playerChoice.choice}\` this turn. Currently waiting for <@${otherPlayerID}> to select an action.`
							})
						}
						else if (playerLocked) {
							await actionCtx.send({
								ephemeral: true,
								content: `${icons.danger} You cannot change your action after you have already selected one.` +
									' You must complete your chosen action within **40 seconds** or your turn will be skipped.'
							})
						}
						else if (actionCtx.customID === 'attack') {
							if (actionCtx.user.id === ctx.user.id) {
								player1ChoiceLocked = true
							}
							else {
								player2ChoiceLocked = true
							}

							await actionCtx.acknowledge()

							const preSelectPlayerBackpackRows = await getUserBackpack(query, actionCtx.user.id)
							const preSelectPlayerInventory = getItems(preSelectPlayerBackpackRows)
							let components: ComponentSelectMenu[] = [
								{
									type: ComponentType.SELECT,
									custom_id: 'weapon',
									placeholder: 'Select a weapon from your inventory to use.',
									options: [
										...(sortItemsByLevel(preSelectPlayerInventory.items, true).filter(i => ['Melee Weapon', 'Ranged Weapon', 'Throwable Weapon'].includes(i.item.type))).slice(0, 24).map(i => {
											const iconID = i.item.icon.match(/:([0-9]*)>/)
											const weaponDesc = i.item.type === 'Throwable Weapon' && i.item.spreadsDamageToLimbs ?
												`${i.item.damage} (${Math.round(i.item.damage / i.item.spreadsDamageToLimbs)} x ${i.item.spreadsDamageToLimbs} limbs) damage. ${i.item.penetration.toFixed(1)} armor penetration.` :
												i.item.type === 'Melee Weapon' || i.item.type === 'Throwable Weapon' ?
													`${i.item.damage} damage. ${i.item.penetration.toFixed(1)} armor penetration.` :
													'Damage determined by ammunition.'


											return {
												label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
												value: i.row.id.toString(),
												description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}${weaponDesc}`,
												emoji: iconID ? {
													id: iconID[1],
													name: i.item.name
												} : undefined
											}
										}),
										{
											label: 'Fists',
											value: 'fists',
											description: '10 damage. 0.0 armor penetration.',
											emoji: {
												name: '👊'
											}
										}
									]
								}
							]

							const attackMessage = await actionCtx.sendFollowUp({
								ephemeral: true,
								content: 'What weapon do you want to attack with?',
								components: [{
									type: ComponentType.ACTION_ROW,
									components
								}]
							})
							const attackCollector = this.app.componentCollector.createCollector(attackMessage.id, i => i.user.id === actionCtx.user.id, 60000)
							let weapon: ItemWithRowOfType<Weapon> | { item: Weapon, row?: undefined }
							let ammo: ItemWithRowOfType<Ammunition> | undefined
							let limbTarget: BodyPart | undefined

							actionCollectors.push(attackCollector)

							attackCollector.collector.on('collect', async attackCtx => {
								try {
									await attackCtx.acknowledge()

									if (attackCtx.customID === 'weapon') {
										const weaponItemRow = preSelectPlayerInventory.items.find(i => i.row.id.toString() === attackCtx.values[0])
										const weaponItem = weaponItemRow?.item

										if (attackCtx.values[0] === 'fists') {
											weapon = {
												item: {
													type: 'Melee Weapon',
													name: 'fists',
													aliases: [],
													icon: '👊',
													slotsUsed: 0,
													itemLevel: 1,
													damage: 10,
													accuracy: 50,
													durability: 1,
													penetration: 0,
													speed: 0
												}
											}
										}
										else if (!weaponItemRow || !weaponItem) {
											await attackMessage.edit({
												content: `${icons.danger} Weapon not found in your inventory. Please select another weapon:`
											})
											return
										}
										else {
											if (weaponItem.type === 'Ranged Weapon') {
												const userPossibleAmmo = preSelectPlayerInventory.items.filter((row, i) =>
													row.item.type === 'Ammunition' &&
													row.item.ammoFor.includes(weaponItem) &&
													preSelectPlayerInventory.items.map(r => r.item.name).indexOf(row.item.name) === i
												)

												if (!userPossibleAmmo.length) {
													await attackMessage.edit({
														content: `${icons.danger} You don't have any ammo for your ${getItemDisplay(weaponItemRow.item, weaponItemRow.row, { showEquipped: false, showDurability: false })}.` +
															` You need one of the following ammunitions in your inventory:\n\n${allItems.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponItem)).map(i => getItemDisplay(i)).join(', ')}.` +
															'\n\nPlease select another weapon:'
													})
													return
												}

												// user must select ammo
												const ammoSortedByBest = sortItemsByAmmo(userPossibleAmmo, true)

												components = [{
													type: ComponentType.SELECT,
													custom_id: 'ammo',
													placeholder: 'Select an ammunition from your inventory to use.',
													options: ammoSortedByBest.map(i => {
														const ammoItem = i.item as Ammunition
														const iconID = i.item.icon.match(/:([0-9]*)>/)
														const ammoDesc = ammoItem.spreadsDamageToLimbs ?
															`${ammoItem.damage} (${Math.round(ammoItem.damage / ammoItem.spreadsDamageToLimbs)} x ${ammoItem.spreadsDamageToLimbs} limbs) damage. ${ammoItem.penetration.toFixed(1)} armor penetration.` :
															`${ammoItem.damage} damage. ${ammoItem.penetration.toFixed(1)} armor penetration.`

														return {
															label: i.item.name.replace(/_/g, ' '),
															value: i.row.id.toString(),
															description: ammoDesc,
															emoji: iconID ? {
																id: iconID[1],
																name: i.item.name
															} : undefined
														}
													})
												}]

												await attackMessage.edit({
													content: `${icons.warning} Which ammo do you want to use with your ${getItemDisplay(weaponItemRow.item)}?`,
													components: [{
														type: ComponentType.ACTION_ROW,
														components
													}]
												})
											}

											weapon = weaponItemRow as ItemWithRowOfType<Weapon>
										}
									}
									else if (attackCtx.customID === 'ammo') {
										const ammoItemRow = preSelectPlayerInventory.items.find(i => i.row.id.toString() === attackCtx.values[0])

										if (!ammoItemRow) {
											await attackMessage.edit({
												content: `${icons.danger} Ammo not found in your inventory. Please select a different ammunition:`
											})
										}

										ammo = ammoItemRow as ItemWithRowOfType<Ammunition>
									}

									if (attackCtx.customID === 'limb') {
										if (attackCtx.values[0] !== 'none') {
											limbTarget = attackCtx.values[0] as BodyPart
										}

										attackCollector.stopCollector()
										await attackMessage.edit({
											content: `${icons.checkmark} ${getItemDisplay(weapon!.item)} ${ammo ? `(ammo: ${getItemDisplay(ammo.item)})` : ''} selected as your weapon!`,
											components: [{
												type: ComponentType.ACTION_ROW,
												components: components.map(c => ({ ...c, disabled: true }))
											}]
										})
									}
									else if ((weapon && ammo) || (weapon && weapon.item.type !== 'Ranged Weapon')) {
										components = [
											{
												type: ComponentType.SELECT,
												custom_id: 'limb',
												placeholder: 'Select a limb to target.',
												options: [
													{
														label: 'Head',
														value: 'head',
														description: 'Deals more damage. Higher chance of missing.',
														emoji: {
															name: getBodyPartEmoji('head')
														}
													},
													{
														label: 'Chest',
														value: 'chest',
														description: 'Deals base damage. Armor can reduce damage.',
														emoji: {
															name: getBodyPartEmoji('chest')
														}
													},
													{
														label: 'Arms',
														value: 'arm',
														description: 'Deals less damage. Armor does not protect arms.',
														emoji: {
															name: getBodyPartEmoji('arm')
														}
													},
													{
														label: 'Legs',
														value: 'leg',
														description: 'Deals less damage. Armor does not protect legs.',
														emoji: {
															name: getBodyPartEmoji('leg')
														}
													},
													{
														label: 'Don\'t target any limbs.',
														value: 'none',
														description: 'You\'re targeted limb is random but you will never miss.',
														emoji: {
															name: '🚫'
														}
													}
												]
											}
										]

										await attackMessage.edit({
											content: `${getItemDisplay(weapon.item)} selected as your weapon! What limb do you want to target?`,
											components: [{
												type: ComponentType.ACTION_ROW,
												components
											}]
										})
									}
								}
								catch (err) {
									logger.warn(err)
								}
							})

							attackCollector.collector.on('end', async msg => {
								try {
									if (msg === 'time') {
										await attackMessage.edit({
											content: `${icons.timer} You ran out of time to complete this attack. Your turn has been skipped.`,
											components: [{
												type: ComponentType.ACTION_ROW,
												components: components.map(c => ({ ...c, disabled: true }))
											}]
										})
										return
									}

									actionCollectors.splice(actionCollectors.indexOf(attackCollector), 1)

									playerChoices.set(actionCtx.user.id, {
										choice: 'attack',
										weapon,
										ammo,
										limbTarget,
										speed: weapon.item.speed
									})

									if (actionCtx.user.id === ctx.user.id) {
										player1AttackCtx = actionCtx
									}
									else {
										player2AttackCtx = actionCtx
									}

									// end turn if both players have finished actions
									if (playerChoices.get(otherPlayerID)) {
										turnCollector.stopCollector()
									}
								}
								catch (err) {
									logger.error(err)
								}
							})
						}
						else if (actionCtx.customID === 'heal') {
							await actionCtx.acknowledge()

							const preHealPlayerData = (await getUserRow(query, actionCtx.user.id))!
							const preHealBackpackRows = await getUserBackpack(query, actionCtx.user.id)
							const preHealInventory = getItems(preHealBackpackRows)
							const possibleHealItems = preHealInventory.items.filter(i => i.item.type === 'Medical' && i.item.subtype === 'Healing')
							const preHealMaxPossible = preHealPlayerData.maxHealth - preHealPlayerData.health

							if (!possibleHealItems.length) {
								await actionCtx.send({
									ephemeral: true,
									content: `${icons.danger} You don't have any healing items in your inventory. Please select a different action.`
								})
								return
							}
							else if (preHealMaxPossible <= 0) {
								await actionCtx.send({
									ephemeral: true,
									content: `${icons.danger} You are already at max health. Please select a different action.`
								})
								return
							}

							// valid heal, lock in action choice
							if (actionCtx.user.id === ctx.user.id) {
								player1ChoiceLocked = true
							}
							else {
								player2ChoiceLocked = true
							}

							const components: ComponentSelectMenu[] = [
								{
									type: ComponentType.SELECT,
									custom_id: 'item',
									placeholder: 'Select a medical item from your inventory to use.',
									options: [
										...sortItemsByLevel(possibleHealItems, true).slice(0, 25).map(i => {
											const iconID = i.item.icon.match(/:([0-9]*)>/)
											const itemDesc = i.item.type === 'Medical' && i.item.subtype === 'Healing' ?
												`Heals for ${i.item.healsFor} HP.` :
												''

											return {
												label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
												value: i.row.id.toString(),
												description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}${itemDesc}`,
												emoji: iconID ? {
													id: iconID[1],
													name: i.item.name
												} : undefined
											}
										})
									]
								}
							]
							const healMessage = await actionCtx.sendFollowUp({
								ephemeral: true,
								content: 'What item do you want to heal with?',
								components: [{
									type: ComponentType.ACTION_ROW,
									components
								}]
							})
							const healCollector = this.app.componentCollector.createCollector(healMessage.id, i => i.user.id === actionCtx.user.id, 60000)
							let healItem: ItemWithRowOfType<HealingMedical>

							actionCollectors.push(healCollector)

							healCollector.collector.on('collect', async healCtx => {
								try {
									const healItemRow = preHealInventory.items.find(i => i.row.id.toString() === healCtx.values[0])

									await healCtx.acknowledge()

									if (!healItemRow) {
										await healMessage.edit({
											content: `${icons.danger} Item not found in your inventory. Please select another item:`
										})
										return
									}

									healItem = healItemRow as ItemWithRowOfType<HealingMedical>
									healCollector.stopCollector()

									await healMessage.edit({
										content: `${icons.checkmark} ${getItemDisplay(healItemRow.item)} selected!`,
										components: [{
											type: ComponentType.ACTION_ROW,
											components: components.map(c => ({ ...c, disabled: true }))
										}]
									})
								}
								catch (err) {
									logger.warn(err)
								}
							})

							healCollector.collector.on('end', async msg => {
								try {
									if (msg === 'time') {
										await healMessage.edit({
											content: `${icons.timer} You ran out of time to select an item. Your turn has been skipped.`,
											components: [{
												type: ComponentType.ACTION_ROW,
												components: components.map(c => ({ ...c, disabled: true }))
											}]
										})
										return
									}

									actionCollectors.splice(actionCollectors.indexOf(healCollector), 1)

									playerChoices.set(actionCtx.user.id, {
										choice: 'use a medical item',
										itemRow: healItem,
										speed: healItem.item.speed
									})

									// end turn if both players have finished actions
									if (playerChoices.get(otherPlayerID)) {
										turnCollector.stopCollector()
									}
								}
								catch (err) {
									logger.error(err)
								}
							})
						}
						else if (actionCtx.customID === 'stimulant') {
							await actionCtx.acknowledge()

							const preHealBackpackRows = await getUserBackpack(query, actionCtx.user.id)
							const preHealInventory = getItems(preHealBackpackRows)
							const playerStimulants = actionCtx.user.id === ctx.user.id ? player1Stimulants : player2Stimulants
							const playerStimItems = preHealInventory.items.filter(i => i.item.type === 'Medical' && i.item.subtype === 'Stimulant')
							const possibleStimulants = playerStimItems.filter(i => !playerStimulants.some(stim => stim.name === i.item.name))

							if (!playerStimItems.length) {
								await actionCtx.send({
									ephemeral: true,
									content: `${icons.danger} You don't have any stimulants in your inventory. Please select a different action.`
								})
								return
							}
							else if (!possibleStimulants.length) {
								// user has stimulants but they are already active, cannot inject the same stimulant twice
								await actionCtx.send({
									ephemeral: true,
									content: `${icons.danger} You don't have any stimulants that you can inject right now. Please select a different action.`
								})
								return
							}
							else if (playerStimulants.length >= maxStimulantsPerDuel) {
								// user has used max stimulants in this duel already
								await actionCtx.send({
									ephemeral: true,
									content: `${icons.danger} You can only inject up to **${maxStimulantsPerDuel}** stimulants per duel. Please select a different action.`
								})
								return
							}

							// valid stimulant, lock in action choice
							if (actionCtx.user.id === ctx.user.id) {
								player1ChoiceLocked = true
							}
							else {
								player2ChoiceLocked = true
							}

							const components: ComponentSelectMenu[] = [
								{
									type: ComponentType.SELECT,
									custom_id: 'item',
									placeholder: 'Select a stimulant from your inventory to use.',
									options: [
										...sortItemsByLevel(playerStimItems, true).slice(0, 25).map(i => {
											const item = i.item as StimulantMedical
											const iconID = i.item.icon.match(/:([0-9]*)>/)
											const effectsDisplay = []

											if (item.effects.accuracyBonus) {
												effectsDisplay.push(`Accuracy ${item.effects.accuracyBonus > 0 ? '+' : '-'}${Math.abs(item.effects.accuracyBonus)}%.`)
											}
											if (item.effects.damageBonus) {
												effectsDisplay.push(`Damage dealt ${item.effects.damageBonus > 0 ? '+' : '-'}${Math.abs(item.effects.damageBonus)}%.`)
											}
											if (item.effects.damageReduction) {
												effectsDisplay.push(`Damage taken ${item.effects.damageReduction > 0 ? '-' : '+'}${Math.abs(item.effects.damageReduction)}%.`)
											}

											return {
												label: `${i.item.name.replace(/_/g, ' ')} (ID: ${i.row.id})`,
												value: i.row.id.toString(),
												description: `${i.row.durability ? `${i.row.durability} uses left. ` : ''}${effectsDisplay.join(' ') || 'No viable effects.'}`,
												emoji: iconID ? {
													id: iconID[1],
													name: i.item.name
												} : undefined
											}
										})
									]
								}
							]
							const stimMessage = await actionCtx.sendFollowUp({
								ephemeral: true,
								content: 'What stimulant do you want to use?',
								components: [{
									type: ComponentType.ACTION_ROW,
									components
								}]
							})
							const stimCollector = this.app.componentCollector.createCollector(stimMessage.id, i => i.user.id === actionCtx.user.id, 60000)
							let stimItem: ItemWithRowOfType<StimulantMedical>

							actionCollectors.push(stimCollector)

							stimCollector.collector.on('collect', async stimCtx => {
								try {
									const stimItemRow = preHealInventory.items.find(i => i.row.id.toString() === stimCtx.values[0])

									await stimCtx.acknowledge()

									if (!stimItemRow) {
										await stimMessage.edit({
											content: `${icons.danger} Item not found in your inventory. Please select another item:`
										})
										return
									}

									stimItem = stimItemRow as ItemWithRowOfType<StimulantMedical>
									stimCollector.stopCollector()

									await stimMessage.edit({
										content: `${icons.checkmark} ${getItemDisplay(stimItemRow.item)} selected!`,
										components: [{
											type: ComponentType.ACTION_ROW,
											components: components.map(c => ({ ...c, disabled: true }))
										}]
									})
								}
								catch (err) {
									logger.warn(err)
								}
							})

							stimCollector.collector.on('end', async msg => {
								try {
									if (msg === 'time') {
										await stimMessage.edit({
											content: `${icons.timer} You ran out of time to select an item. Your turn has been skipped.`,
											components: [{
												type: ComponentType.ACTION_ROW,
												components: components.map(c => ({ ...c, disabled: true }))
											}]
										})
										return
									}

									actionCollectors.splice(actionCollectors.indexOf(stimCollector), 1)

									playerChoices.set(actionCtx.user.id, {
										choice: 'use a stimulant',
										itemRow: stimItem,
										speed: stimItem.item.speed
									})

									// end turn if both players have finished actions
									if (playerChoices.get(otherPlayerID)) {
										turnCollector.stopCollector()
									}
								}
								catch (err) {
									logger.error(err)
								}
							})
						}
						else if (actionCtx.customID === 'flee') {
							if (actionCtx.user.id === ctx.user.id) {
								player1ChoiceLocked = true
							}
							else {
								player2ChoiceLocked = true
							}

							await actionCtx.acknowledge()

							playerChoices.set(actionCtx.user.id, {
								choice: 'try to flee',
								speed: 1000
							})

							// end turn if both players have finished actions
							if (playerChoices.get(otherPlayerID)) {
								turnCollector.stopCollector()
							}

							await actionCtx.send({
								ephemeral: true,
								content: `${icons.checkmark} Attempt to flee selected!`
							})
						}
					}
					catch (err) {
						logger.warn(err)
					}
				})

				turnCollector.collector.on('end', async msg => {
					// handle end of turn
					for (const actionCollector of actionCollectors) {
						// stop all sub-component collectors such as the weapon selection menu
						actionCollector.stopCollector('time')
					}

					try {
						await botMessage.edit({
							content: `${icons.timer} Turn #${turnNumber} selection has ended.`,
							components: [{
								type: ComponentType.ACTION_ROW,
								components: [GRAY_BUTTON('Attack', 'attack', true, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', true, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', true, '💉'), RED_BUTTON('Try to Flee', 'flee', true)]
							}]
						})
					}
					catch (err) {
						logger.warn(err)
					}

					resolve()
				})
			})

			while (duelIsActive) {
				try {
					await runTurn()

					const player1Choice = playerChoices.get(ctx.user.id)
					const player2Choice = playerChoices.get(member.id)
					const player1Speed = player1Choice?.speed || 0
					const player2Speed = player2Choice?.speed || 0
					const orderedChoices = [{ user: ctx.user.id, action: player1Choice, speed: player1Speed }, { user: member.id, action: player2Choice, speed: player2Speed }]
						.map(c => ({ ...c, random: Math.random() }))
						.sort((a, b) => {
							if (a.speed > b.speed) {
								return -1
							}
							else if (a.speed < b.speed) {
								return 1
							}

							return b.random - a.random
						})
						.map(c => ({ user: c.user, action: c.action }))
					const messages: string[][] = [[], []]

					for (let i = 0; i < orderedChoices.length; i++) {
						const userChoice = orderedChoices[i]

						if (!userChoice.action) {
							messages[i].push(`<@${userChoice.user}> did not select an action.`)
						}
						else if (userChoice.action.choice === 'try to flee') {
							const chance = 0.1

							if (Math.random() <= chance) {
								// success
								duelIsActive = false
								messages[i].push(`<@${userChoice.user}> flees from the duel! The duel has ended.`)
								this.app.activeDuelers.delete(ctx.user.id)
								this.app.activeDuelers.delete(member.id)
								break
							}
							else {
								messages[i].push(`${icons.danger} <@${userChoice.user}> tries to flee from the duel (10% chance) but fails!`)
							}
						}
						else if (userChoice.action.choice === 'use a medical item') {
							const choice = userChoice.action
							const healTransaction = await beginTransaction()
							const playerData = (await getUserRow(healTransaction.query, userChoice.user, true))!
							const playerBackpackRows = await getUserBackpack(healTransaction.query, userChoice.user, true)
							const playerInventory = getItems(playerBackpackRows)

							const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

							if (!hasItem) {
								await healTransaction.commit()
								messages[i].push(`${icons.danger} <@${userChoice.user}> did not have the item they wanted to heal with. Their turn has been skipped.`)
								continue
							}

							const maxHeal = Math.min(playerData.maxHealth - playerData.health, choice.itemRow.item.healsFor)
							const curedAfflictions = []

							if (!choice.itemRow.row.durability || choice.itemRow.row.durability - 1 <= 0) {
								await deleteItem(healTransaction.query, choice.itemRow.row.id)
							}
							else {
								await lowerItemDurability(healTransaction.query, choice.itemRow.row.id, 1)
							}

							if (choice.itemRow.item.curesBitten || choice.itemRow.item.curesBrokenArm || choice.itemRow.item.curesBurning) {
								const playerAfflictions = userChoice.user === ctx.user.id ? player1Afflictions : player2Afflictions

								for (let affIndex = playerAfflictions.length - 1; affIndex >= 0; affIndex--) {
									const affliction = playerAfflictions[affIndex]

									if (choice.itemRow.item.curesBitten && affliction.name === 'Bitten') {
										curedAfflictions.push(affliction)
										playerAfflictions.splice(affIndex, 1)
									}
									else if (choice.itemRow.item.curesBrokenArm && affliction.name === 'Broken Arm') {
										curedAfflictions.push(affliction)
										playerAfflictions.splice(affIndex, 1)
									}
									else if (choice.itemRow.item.curesBurning && affliction.name === 'Burning') {
										curedAfflictions.push(affliction)
										playerAfflictions.splice(affIndex, 1)
									}
								}
							}

							await addHealth(healTransaction.query, userChoice.user, maxHeal)
							await healTransaction.commit()

							const itemDisplay = getItemDisplay(choice.itemRow.item, {
								...choice.itemRow.row,
								durability: choice.itemRow.row.durability ? choice.itemRow.row.durability - 1 : undefined
							}, {
								showID: false
							})

							messages[i].push(`<@${userChoice.user}> uses a ${itemDisplay} to heal for **${maxHeal}** health.` +
								`\n<@${userChoice.user}> now has ${formatHealth(playerData.health + maxHeal, playerData.maxHealth)} **${playerData.health + maxHeal} / ${playerData.maxHealth}** health.` +
								`${curedAfflictions.length ? `\n<@${userChoice.user}> cured the following afflictions: ${combineArrayWithAnd(curedAfflictions.map(a => a.name))}` : ''}`)
						}
						else if (userChoice.action.choice === 'use a stimulant') {
							const choice = userChoice.action
							const stimTransaction = await beginTransaction()
							const playerBackpackRows = await getUserBackpack(stimTransaction.query, userChoice.user, true)
							const playerInventory = getItems(playerBackpackRows)

							const hasItem = playerInventory.items.find(itm => itm.row.id === choice.itemRow.row.id)

							if (!hasItem) {
								await stimTransaction.commit()
								messages[i].push(`${icons.danger} <@${userChoice.user}> did not have the stimulant they wanted to use. Their turn has been skipped.`)
								continue
							}

							if (!choice.itemRow.row.durability || choice.itemRow.row.durability - 1 <= 0) {
								await deleteItem(stimTransaction.query, choice.itemRow.row.id)
							}
							else {
								await lowerItemDurability(stimTransaction.query, choice.itemRow.row.id, 1)
							}

							const playerStimulants = userChoice.user === ctx.user.id ? player1Stimulants : player2Stimulants

							// ensure multiple of the same stimulant don't stack
							if (!playerStimulants.includes(choice.itemRow.item)) {
								playerStimulants.push(choice.itemRow.item)
							}

							await stimTransaction.commit()

							const itemDisplay = getItemDisplay(choice.itemRow.item, {
								...choice.itemRow.row,
								durability: choice.itemRow.row.durability ? choice.itemRow.row.durability - 1 : undefined
							}, {
								showID: false
							})
							const effectsDisplay = getEffectsDisplay(choice.itemRow.item.effects)

							messages[i].push(`<@${userChoice.user}> injects themself with ${itemDisplay}.` +
								`\n\n__Effects Received__\n${effectsDisplay.join('\n')}`)
						}
						else {
							// user chose to attack
							const otherPlayerID = userChoice.user === ctx.user.id ? member.id : ctx.user.id
							const atkTransaction = await beginTransaction()

							// fetch user row to prevent changes during attack
							await getUserRow(atkTransaction.query, userChoice.user, true)

							const choice = userChoice.action
							const playerBackpackRows = await getUserBackpack(atkTransaction.query, userChoice.user, true)
							const victimData = (await getUserRow(atkTransaction.query, otherPlayerID, true))!
							const victimBackpackRows = await getUserBackpack(atkTransaction.query, otherPlayerID, true)
							const playerInventory = getItems(playerBackpackRows)
							const victimInventory = getItems(victimBackpackRows)
							const victimEquips = getEquips(victimBackpackRows)
							const playerStimulants = userChoice.user === ctx.user.id ? player1Stimulants : player2Stimulants
							const playerAfflictions = userChoice.user === ctx.user.id ? player1Afflictions : player2Afflictions
							const victimStimulants = userChoice.user === ctx.user.id ? player2Stimulants : player1Stimulants
							const victimAfflictions = userChoice.user === ctx.user.id ? player2Afflictions : player1Afflictions
							const stimulantEffects = addStatusEffects(playerStimulants, playerAfflictions)
							const victimEffects = addStatusEffects(victimStimulants, victimAfflictions)
							const stimulantDamageMulti = (1 + (stimulantEffects.damageBonus / 100) - (victimEffects.damageReduction / 100))

							const weaponChoice = choice.weapon
							const hasWeapon = !weaponChoice.row || playerInventory.items.find(itm => itm.row.id === weaponChoice.row.id)
							const hasAmmo = playerInventory.items.find(itm => itm.row.id === choice.ammo?.row.id)
							const bodyPartHit = getBodyPartHit(choice.weapon.item.accuracy + stimulantEffects.accuracyBonus, choice.limbTarget)
							const missedPartChoice = choice.limbTarget && (choice.limbTarget !== bodyPartHit.result || !bodyPartHit.accurate)
							const victimItemsRemoved: number[] = []
							const limbsHit = []
							let attackPenetration
							let totalDamage

							// verify user has weapon they want to attack with
							if (!hasWeapon || !choice.weapon) {
								await atkTransaction.commit()
								messages[i].push(`${icons.danger} <@${userChoice.user}> did not have the weapon they wanted to use. Their turn has been skipped.`)
								continue
							}
							else if (choice.weapon.item.type === 'Ranged Weapon') {
								if (!hasAmmo || !choice.ammo) {
									await atkTransaction.commit()
									messages[i].push(`${icons.danger} <@${userChoice.user}> did not have the ammunition they wanted to use. Their turn has been skipped.`)
									continue
								}

								attackPenetration = choice.ammo.item.penetration
								await deleteItem(atkTransaction.query, choice.ammo.row.id)

								if (choice.ammo.item.spreadsDamageToLimbs) {
									limbsHit.push({
										damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti) / choice.ammo.item.spreadsDamageToLimbs, choice.ammo.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})

									for (let i2 = 0; i2 < choice.ammo.item.spreadsDamageToLimbs - 1; i2++) {
										let limb = getBodyPartHit(choice.weapon.item.accuracy)

										// make sure no duplicate limbs are hit
										while (limbsHit.find(l => l.limb === limb.result)) {
											limb = getBodyPartHit(choice.weapon.item.accuracy)
										}

										limbsHit.push({
											damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti) / choice.ammo.item.spreadsDamageToLimbs, choice.ammo.item.penetration, limb.result, victimEquips.armor?.item, victimEquips.helmet?.item),
											limb: limb.result
										})
									}
								}
								else {
									limbsHit.push({
										damage: getAttackDamage((choice.ammo.item.damage * stimulantDamageMulti), choice.ammo.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})
								}

								totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

								if (missedPartChoice) {
									messages[i].push(`<@${userChoice.user}> tries to shoot <@${otherPlayerID}> in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item)} (ammo: ${getItemDisplay(choice.ammo.item)}) **BUT MISSES!**\n`)
								}
								else {
									messages[i].push(getAttackString(choice.weapon.item, `<@${userChoice.user}>`, `<@${otherPlayerID}>`, limbsHit, totalDamage, choice.ammo.item))
								}
							}
							else if (choice.weapon.item.type === 'Throwable Weapon') {
								attackPenetration = choice.weapon.item.penetration

								if (choice.weapon.item.spreadsDamageToLimbs) {
									limbsHit.push({
										damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti) / choice.weapon.item.spreadsDamageToLimbs, choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})

									for (let i2 = 0; i2 < choice.weapon.item.spreadsDamageToLimbs - 1; i2++) {
										let limb = getBodyPartHit(choice.weapon.item.accuracy)

										// make sure no duplicate limbs are hit
										while (limbsHit.find(l => l.limb === limb.result)) {
											limb = getBodyPartHit(choice.weapon.item.accuracy)
										}

										limbsHit.push({
											damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti) / choice.weapon.item.spreadsDamageToLimbs, choice.weapon.item.penetration, limb.result, victimEquips.armor?.item, victimEquips.helmet?.item),
											limb: limb.result
										})
									}
								}
								else {
									limbsHit.push({
										damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti), choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
										limb: bodyPartHit.result
									})
								}

								totalDamage = limbsHit.reduce((prev, curr) => prev + curr.damage.total, 0)

								if (missedPartChoice) {
									messages[i].push(`${icons.danger} <@${userChoice.user}> tries to throw a ${getItemDisplay(choice.weapon.item)} at <@${otherPlayerID}>'s ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** **BUT MISSES!**\n`)
								}
								else {
									messages[i].push(getAttackString(choice.weapon.item, `<@${userChoice.user}>`, `<@${otherPlayerID}>`, limbsHit, totalDamage))

									if (choice.weapon.item.subtype === 'Incendiary Grenade') {
										messages[i].push(`${icons.debuff} <@${otherPlayerID}> is Burning! (${combineArrayWithAnd(getEffectsDisplay(afflictions.Burning.effects))})`)

										if (userChoice.user === ctx.user.id) {
											player2Afflictions.push(afflictions.Burning)
										}
										else {
											player1Afflictions.push(afflictions.Burning)
										}
									}
								}
							}
							else {
								// melee weapon
								attackPenetration = choice.weapon.item.penetration
								limbsHit.push({
									damage: getAttackDamage((choice.weapon.item.damage * stimulantDamageMulti), choice.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item),
									limb: bodyPartHit.result
								})
								totalDamage = limbsHit[0].damage.total

								if (missedPartChoice) {
									messages[i].push(`${icons.danger} <@${userChoice.user}> tries to hit <@${otherPlayerID}> in the ${getBodyPartEmoji(choice.limbTarget!)} **${choice.limbTarget}** with their ${getItemDisplay(choice.weapon.item)} **BUT MISSES!**\n`)
								}
								else {
									messages[i].push(getAttackString(choice.weapon.item, `<@${userChoice.user}>`, `<@${otherPlayerID}>`, limbsHit, totalDamage))
								}
							}

							// remove weapon annd ammo
							if (choice.weapon.row && (!choice.weapon.row.durability || choice.weapon.row.durability - 1 <= 0)) {
								messages[i].push(`${icons.danger} <@${userChoice.user}>'s ${getItemDisplay(choice.weapon.item, choice.weapon.row, { showDurability: false, showEquipped: false })} broke from this attack.`)

								await deleteItem(atkTransaction.query, choice.weapon.row.id)
							}
							else if (choice.weapon.row && choice.weapon.row.durability) {
								messages[i].push(`<@${userChoice.user}>'s ${getItemDisplay(choice.weapon.item, choice.weapon.row, { showDurability: false, showEquipped: false })} now has **${choice.weapon.row.durability - 1}** durability.`)

								await lowerItemDurability(atkTransaction.query, choice.weapon.row.id, 1)
							}

							if (!missedPartChoice) {
								for (const result of limbsHit) {
									if (result.limb === 'head' && victimEquips.helmet) {
										messages[i].push(`<@${otherPlayerID}>'s helmet (${getItemDisplay(victimEquips.helmet.item)}) reduced the damage by **${result.damage.reduced}**.`)

										// only lower helmet durability if attackers weapon is within 1 penetration (exclusive) of
										// the level of armor victim is wearing (so if someone used a knife with 1.0 level penetration
										// against someone who had level 3 armor, the armor would NOT lose durability)
										if (attackPenetration > victimEquips.helmet.item.level - 1) {
											if (victimEquips.helmet.row.durability - 1 <= 0) {
												messages[i].push(`<@${otherPlayerID}>'s ${getItemDisplay(victimEquips.helmet.item)} broke from this attack!`)

												await deleteItem(atkTransaction.query, victimEquips.helmet.row.id)
												victimItemsRemoved.push(victimEquips.helmet.row.id)
											}
											else {
												await lowerItemDurability(atkTransaction.query, victimEquips.helmet.row.id, 1)
											}
										}
									}
									else if (result.limb === 'chest' && victimEquips.armor) {
										messages[i].push(`<@${otherPlayerID}>'s armor (${getItemDisplay(victimEquips.armor.item)}) reduced the damage by **${result.damage.reduced}**.`)

										// only lower armor durability if attackers weapon is within 1 penetration (exclusive) of
										// the level of armor victim is wearing (so if someone used a knife with 1.0 level penetration
										// against someone who had level 3 armor, the armor would NOT lose durability)
										if (attackPenetration > victimEquips.armor.item.level - 1) {
											if (victimEquips.armor.row.durability - 1 <= 0) {
												messages[i].push(`<@${otherPlayerID}>'s ${getItemDisplay(victimEquips.armor.item)} broke from this attack!`)

												await deleteItem(atkTransaction.query, victimEquips.armor.row.id)
												victimItemsRemoved.push(victimEquips.armor.row.id)
											}
											else {
												await lowerItemDurability(atkTransaction.query, victimEquips.armor.row.id, 1)
											}
										}
									}
									else if (result.limb === 'arm' && Math.random() <= 0.2) {
										messages[i].push(`${icons.debuff} <@${otherPlayerID}>'s arm was broken! (${combineArrayWithAnd(getEffectsDisplay(afflictions['Broken Arm'].effects))})`)

										if (userChoice.user === ctx.user.id) {
											player2Afflictions.push(afflictions['Broken Arm'])
										}
										else {
											player1Afflictions.push(afflictions['Broken Arm'])
										}
									}
								}
							}

							// have to filter out the removed armor/helmet to prevent sql reference errors
							const victimLoot = victimInventory.items.filter(itm => !victimItemsRemoved.includes(itm.row.id))

							if (!missedPartChoice && victimData.health - totalDamage <= 0) {
								const killQuests = (await getUserQuests(atkTransaction.query, userChoice.user, true)).filter(q => q.questType === 'Player Kills' || q.questType === 'Any Kills')
								let xpEarned = 15

								for (const victimItem of victimLoot) {
									// 3 xp per level of the item
									xpEarned += victimItem.item.itemLevel * 3

									await removeItemFromBackpack(atkTransaction.query, victimItem.row.id)
								}

								// create dog tags for victim
								const otherPlayerUser = userChoice.user === ctx.user.id ? member.user : ctx.user
								const dogTagsRow = await createItem(atkTransaction.query, items.dog_tags.name, { displayName: `${otherPlayerUser.username.replace(/`/g, '')}#${otherPlayerUser.discriminator}'s dog tags` })
								victimLoot.push({
									item: items.dog_tags,
									row: { ...dogTagsRow, equipped: 0 }
								})

								await increaseKills(atkTransaction.query, userChoice.user, 'player', 1)
								await increaseDeaths(atkTransaction.query, otherPlayerID, 1)
								await addXp(atkTransaction.query, userChoice.user, xpEarned)

								// check if user has any kill quests
								for (const quest of killQuests) {
									if (quest.progress < quest.progressGoal) {
										await increaseProgress(atkTransaction.query, quest.id, 1)
									}
								}

								messages[i].push(`☠️ <@${otherPlayerID}> **DIED!** They dropped **${victimLoot.length}** items.`, `**<@${userChoice.user}> wins** and earned 🌟 ***+${xpEarned}*** xp for this kill.`)
							}
							else if (!missedPartChoice) {
								await lowerHealth(atkTransaction.query, otherPlayerID, totalDamage)

								messages[i].push(`<@${otherPlayerID}> is left with ${formatHealth(victimData.health - totalDamage, victimData.maxHealth)} **${victimData.health - totalDamage}** health.`)
							}

							// commit changes
							await atkTransaction.commit()

							if (!missedPartChoice && victimData.health - totalDamage <= 0) {
								// end the duel
								this.app.activeDuelers.delete(ctx.user.id)
								this.app.activeDuelers.delete(member.id)
								duelIsActive = false

								// user picks items from victims inventory
								const maxPossibleItemsToPick = Math.min(victimLoot.length, 5)
								const components: ComponentSelectMenu[] = [
									{
										type: ComponentType.SELECT,
										min_values: 1,
										max_values: maxPossibleItemsToPick,
										custom_id: 'items',
										placeholder: 'Select up to 5 items to keep.',
										options: sortItemsByValue(victimLoot, true).slice(0, 25).map(itm => {
											const iconID = itm.item.icon.match(/:([0-9]*)>/)

											return {
												label: `${itm.row.displayName ? itm.row.displayName : itm.item.name.replace(/_/g, ' ')} (ID: ${itm.row.id})`,
												value: itm.row.id.toString(),
												description: `${itm.row.durability ? `${itm.row.durability} uses left. ` : ''}Worth ${formatMoney(getItemPrice(itm.item, itm.row), false, false)}`,
												emoji: iconID ? {
													id: iconID[1],
													name: itm.item.name
												} : undefined
											}
										})
									}
								]

								const playerAttackCtx = userChoice.user === ctx.user.id ? player1AttackCtx : player2AttackCtx
								if (playerAttackCtx) {
									setTimeout(async () => {
										try {
											const itemSelectMessage = await playerAttackCtx.sendFollowUp({
												ephemeral: true,
												content: `<@${userChoice.user}>, **You won the duel!** Select up to **5** items from <@${otherPlayerID}>'s inventory to keep.`,
												components: [{
													type: ComponentType.ACTION_ROW,
													components
												}]
											})

											try {
												const itemChoices = (await this.app.componentCollector.awaitClicks(itemSelectMessage.id, int => int.user.id === userChoice.user, 60000))[0]
												const itemsPicked = victimLoot.filter(itm => itemChoices.values.includes(itm.row.id.toString()))

												try {
													await itemChoices.acknowledge()
												}
												catch (err) {
													logger.warn(err)
												}

												try {
													for (const victimItem of victimLoot) {
														if (itemsPicked.some(itm => itm.row.id === victimItem.row.id)) {
															await addItemToBackpack(query, userChoice.user, victimItem.row.id)
														}
														else {
															await deleteItem(query, victimItem.row.id)
														}
													}

													await itemSelectMessage.edit({
														content: `${icons.checkmark} Successfully transferred **${itemsPicked.length}** items to your inventory:` +
															`\n\n${itemsPicked.map(itm => getItemDisplay(itm.item, itm.row, { showEquipped: false })).join('\n')}`,
														components: []
													})
												}
												catch (err) {
													logger.warn(err)
												}
											}
											catch (err) {
												for (const victimItem of victimLoot) {
													await deleteItem(query, victimItem.row.id)
												}

												await itemSelectMessage.edit({
													content: `${icons.danger} You ran out of time to select which items to keep.`,
													components: [{
														type: ComponentType.ACTION_ROW,
														components: components.map(c => ({ ...c, disabled: true }))
													}]
												})
											}
										}
										catch (err) {
											logger.warn(err)

											for (const victimItem of victimLoot) {
												await deleteItem(query, victimItem.row.id)
											}
										}
									}, 5000)
								}
								else {
									// this shouldn't happen but JUST IN CASE IT DOES
									logger.error(`User ${userChoice.user} attack context not set after attack selection`)

									for (const victimItem of victimLoot) {
										await deleteItem(query, victimItem.row.id)
									}
								}

								// break out of the loop to prevent other players turn
								break
							}
						}
					}

					if (!player1Choice && !player2Choice) {
						duelIsActive = false
						this.app.activeDuelers.delete(ctx.user.id)
						this.app.activeDuelers.delete(member.id)
						messages.push(['Neither players selected an action, the duel has been ended early.'])
					}

					const actionsEmbed = new Embed()
						.setTitle(`Duel - ${ctx.member.displayName} vs ${member.displayName}`)
						.setDescription(messages.filter(msg => msg.length).map((msg, i) => `${i <= 1 ? `${i + 1}. ` : ''}${msg.join('\n')}`).join('\n\n'))
						.setFooter(`Turn #${turnNumber} · actions are ordered by speed (higher speed action goes first)`)

					await confirmed.sendFollowUp({
						embeds: [actionsEmbed.embed]
					})
				}
				catch (err) {
					// TODO cancel duel early due to an error?
					logger.warn(err)
				}
				finally {
					playerChoices.clear()

					if (duelIsActive) {
						if (turnNumber >= 20) {
							duelIsActive = false
							this.app.activeDuelers.delete(ctx.user.id)
							this.app.activeDuelers.delete(member.id)
							await confirmed.sendFollowUp({
								content: `${icons.danger} <@${ctx.user.id}> <@${member.id}>, **The max turn limit (20) has been reached!** The duel ends in a tie, neither players will lose their items.`
							})
						}
						else {
							const player1DataV = (await getUserRow(query, ctx.user.id))!
							const player2DataV = (await getUserRow(query, member.id))!
							const player1InventoryV = await getUserBackpack(query, ctx.user.id)
							const player2InventoryV = await getUserBackpack(query, member.id)

							turnNumber += 1
							botMessage = await confirmed.sendFollowUp({
								content: `<@${ctx.user.id}> <@${member.id}>, Turn #${turnNumber} - select your action:`,
								embeds: [
									this.getDuelEmbed(
										ctx.member,
										member,
										player1DataV,
										player2DataV,
										player1InventoryV,
										player2InventoryV,
										turnNumber,
										player1Stimulants,
										player2Stimulants,
										player1Afflictions,
										player2Afflictions
									).embed
								],
								components: [{
									type: ComponentType.ACTION_ROW,
									components: [GRAY_BUTTON('Attack', 'attack', false, '🗡️'), GRAY_BUTTON('Use Medical Item', 'heal', false, '🩹'), GRAY_BUTTON('Use Stimulant', 'stimulant', false, '💉'), RED_BUTTON('Try to Flee', 'flee')]
								}]
							})
						}
					}
				}
			}
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} **${member.displayName}** did not respond to the duel invite.`,
				components: []
			})
		}
	}

	getDuelEmbed (
		player1: ResolvedMember,
		player2: ResolvedMember,
		player1Data: UserRow,
		player2Data: UserRow,
		player1Inventory: BackpackItemRow[],
		player2Inventory: BackpackItemRow[],
		turnNumber: number,
		player1Stimulants: StimulantMedical[],
		player2Stimulants: StimulantMedical[],
		player1Afflictions: Affliction[],
		player2Afflictions: Affliction[]
	): Embed {
		const player1Equips = getEquips(player1Inventory)
		const player2Equips = getEquips(player2Inventory)
		const player1Effects = addStatusEffects(player1Stimulants, player1Afflictions)
		const player2Effects = addStatusEffects(player2Stimulants, player2Afflictions)
		const player1EffectsDisplay = getEffectsDisplay(player1Effects)
		const player2EffectsDisplay = getEffectsDisplay(player2Effects)

		const duelEmb = new Embed()
			.setTitle(`Duel - ${player1.displayName} vs ${player2.displayName}`)
			.addField(`${player1.user.username}#${player1.user.discriminator} (Level ${player1Data.level})`,
				`__**Health**__\n**${player1Data.health} / ${player1Data.maxHealth}** HP\n${formatHealth(player1Data.health, player1Data.maxHealth)}` +
				`\n\n__**Gear**__\n**Backpack**: ${player1Equips.backpack ? getItemDisplay(player1Equips.backpack.item, player1Equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${player1Equips.helmet ? getItemDisplay(player1Equips.helmet.item, player1Equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${player1Equips.armor ? getItemDisplay(player1Equips.armor.item, player1Equips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${player1Stimulants.length ? player1Stimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${player1Afflictions.length ? combineArrayWithAnd(player1Afflictions.map(a => a.name)) : 'None'}` +
				`${player1EffectsDisplay.length ? `\n\n__**Effects**__\n${player1EffectsDisplay.join('\n')}` : ''}`,
				true)
			.addField(`${player2.user.username}#${player2.user.discriminator} (Level ${player2Data.level})`,
				`__**Health**__\n**${player2Data.health} / ${player2Data.maxHealth}** HP\n${formatHealth(player2Data.health, player2Data.maxHealth)}` +
				`\n\n__**Gear**__\n**Backpack**: ${player2Equips.backpack ? getItemDisplay(player2Equips.backpack.item, player2Equips.backpack.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Helmet**: ${player2Equips.helmet ? getItemDisplay(player2Equips.helmet.item, player2Equips.helmet.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n**Body Armor**: ${player2Equips.armor ? getItemDisplay(player2Equips.armor.item, player2Equips.armor.row, { showEquipped: false, showID: false }) : 'None'}` +
				`\n\n__**Stimulants**__\n${player2Stimulants.length ? player2Stimulants.map(i => getItemDisplay(i)).join('\n') : 'None'}` +
				`\n\n__**Afflictions**__\n${player2Afflictions.length ? combineArrayWithAnd(player2Afflictions.map(a => a.name)) : 'None'}` +
				`${player2EffectsDisplay.length ? `\n\n__**Effects**__\n${player2EffectsDisplay.join('\n')}` : ''}`,
				true)
			.setFooter(`Turn #${turnNumber} / 20 max · 40 seconds to make selection`)

		return duelEmb
	}
}

export default DuelCommand
