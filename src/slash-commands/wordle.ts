import { SlashCreator, CommandContext, Message, CommandOptionType, Member, ComponentType, TextInputStyle, ComponentContext, ModalInteractionContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { beginTransaction, query } from '../utils/db/mysql'
import { addMoney, getUserRow, removeMoney } from '../utils/db/players'
import { formatMoney } from '../utils/stringUtils'
import Embed from '../structures/Embed'
import { CONFIRM_BUTTONS, GRAY_BUTTON, GREEN_BUTTON } from '../utils/constants'
import { disableAllComponents } from '../utils/messageUtils'
import { logger } from '../utils/logger'
import fs from 'fs'
import path from 'path'
import { createCooldown, getCooldown } from '../utils/db/cooldowns'

type Letter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
	| 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'

const fullWordList = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'resources', 'wordle', 'englishwords.txt'), { encoding: 'utf-8' }).split(/\r?\n/).filter(Boolean)
const gameWordList = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'resources', 'wordle', 'wordlist.txt'), { encoding: 'utf-8' }).split(/\r?\n/).filter(Boolean)
const MAX_GUESSES = 5
const wordleTutorial = new Embed()
	.setTitle('How to Play')
	.setDescription('Each guess must be a valid five-letter word. Click the "Input Guess" button to submit a guess.' +
		`\n\n${icons.wordle.green.w}${(['e', 'a', 'r', 'y'] as const).map(letter => icons.wordle.gray[letter]).join('')} - The letter **W** is in the word and in the correct spot.` +
		`\n${icons.wordle.yellow.p}${(['i', 'l', 'l', 's'] as const).map(letter => icons.wordle.gray[letter]).join('')} - The letter **P** is in the word but in the wrong spot.` +
		`\n${(['v', 'a', 'g', 'u', 'e'] as const).map(letter => icons.wordle.gray[letter]).join('')} - None of these letters appear in the word.`)

class WordleCommand extends CustomSlashCommand<'wordle'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'wordle',
			description: 'Play a game of wordle against the merchant.',
			longDescription: 'Bet some coins in a game of wordle against the merchant.',
			category: 'equipment',
			options: [{
				type: CommandOptionType.INTEGER,
				name: 'amount',
				description: 'Amount of coins to bet.',
				required: true
			}],
			guildModsOnly: false,
			worksInDMs: false,
			worksDuringDuel: false,
			guildIDs: [],
			minimumLocationLevel: 2
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.member) {
			throw new Error('Member not attached to interaction')
		}

		const preUserData = (await getUserRow(query, ctx.user.id))!

		const bet = ctx.options.amount as number

		if (preUserData.money < bet) {
			await ctx.send({
				content: `${icons.danger} You don't have that much copper. You only have **${formatMoney(preUserData.money)}**.`
			})
			return
		}
		else if (bet > this.getBetLimit(preUserData.locationLevel)) {
			await ctx.send({
				content: `${icons.danger} You cannot bet more than ${formatMoney(this.getBetLimit(preUserData.locationLevel))}.`
			})
			return
		}

		const preGambleCD = await getCooldown(query, ctx.user.id, 'wordle')
		if (preGambleCD) {
			await ctx.send({
				content: `${icons.timer} You will have to wait **${preGambleCD}** before you can play wordle again.`,
				components: []
			})
			return
		}

		let botMessage = await ctx.send({
			content: `Gamble **${formatMoney(bet)}** on a game of wordle? You will have **${MAX_GUESSES}** tries to guess the word correctly.`,
			embeds: [wordleTutorial.embed],
			components: CONFIRM_BUTTONS
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

			await confirmed.acknowledge()

			if (confirmed.customID !== 'confirmed') {
				await confirmed.editParent({
					content: `${icons.checkmark} Wordle canceled.`,
					components: []
				})
				return
			}
		}
		catch (err) {
			await botMessage.edit({
				content: `${icons.danger} Command timed out.`,
				components: disableAllComponents(CONFIRM_BUTTONS)
			})
			return
		}

		const preTransaction = await beginTransaction()
		const preData = (await getUserRow(preTransaction.query, ctx.user.id, true))!

		if (preData.money < bet) {
			await ctx.editOriginal({
				content: `${icons.danger} You don't have **${formatMoney(bet)}** copper. You only have **${formatMoney(preData.money)}**.`,
				components: []
			})
			return
		}

		const gambleCD = await getCooldown(preTransaction.query, ctx.user.id, 'wordle', true)
		if (gambleCD) {
			await ctx.editOriginal({
				content: `${icons.timer} You will have to wait **${gambleCD}** before you can play wordle again.`,
				components: []
			})
			return
		}

		await createCooldown(preTransaction.query, ctx.user.id, 'wordle', 3 * 60)
		await removeMoney(preTransaction.query, ctx.user.id, bet)
		await preTransaction.commit()

		const guesses: string[] = []
		const word = gameWordList[Math.floor(Math.random() * gameWordList.length)]
		let gameActive = true

		logger.info(`Wordle word: ${word}`)

		botMessage = await ctx.editOriginal({
			content: `Guess #1 / ${MAX_GUESSES} · **${MAX_GUESSES}** guesses remaining`,
			embeds: [this.getWordleEmbed(ctx.member, bet, word, []).embed],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GRAY_BUTTON('Input Guess', 'guess')]
			}]
		})

		while (gameActive) {
			try {
				const modalCtx = await this.awaitTurn(ctx, botMessage, guesses)

				await botMessage.edit({
					components: [{
						type: ComponentType.ACTION_ROW,
						components: [GREEN_BUTTON('Input Guess', 'guess', true)]
					}]
				})
				await modalCtx.defer()

				if (modalCtx.values.text_input.toLowerCase() === word) {
					const winnings = bet * 2

					await addMoney(query, ctx.user.id, winnings)

					gameActive = false
					botMessage = await modalCtx.send({
						content: `**You won ${formatMoney(winnings)}!** WOOooo`,
						embeds: [this.getWordleEmbed(ctx.member!, bet, word, guesses).embed]
					}) as Message
				}
				else if (guesses.length >= MAX_GUESSES) {
					gameActive = false
					botMessage = await modalCtx.send({
						content: `You've exhausted all of your guesses. **You lost ${formatMoney(bet)}!** The word was **${word}**.`,
						embeds: [this.getWordleEmbed(ctx.member!, bet, word, guesses).embed]
					}) as Message
				}
				else {
					botMessage = await modalCtx.send({
						content: `Guess #${guesses.length + 1} · **${MAX_GUESSES - guesses.length}** guesses remaining`,
						embeds: [this.getWordleEmbed(ctx.member!, bet, word, guesses).embed],
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [GRAY_BUTTON('Input Guess', 'guess')]
						}]
					}) as Message
				}
			}
			catch (err) {
				await botMessage.edit({
					content: `${icons.danger} You ran out of time to guess the correct word. **You lost ${formatMoney(bet)}!** The word was **${word}**.`,
					components: disableAllComponents(botMessage.components)
				})
			}
		}
	}

	awaitTurn (ctx: CommandContext, botMessage: Message, guesses: string[]): Promise<ModalInteractionContext> {
		return new Promise((resolve, reject) => {
			const { collector, stopCollector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 60000)

			collector.on('collect', async guessCtx => {
				try {
					if (guessCtx.customID === 'guess') {
						const inputCtx = await this.awaitGuess(guessCtx)

						if (guesses.length >= MAX_GUESSES) {
							await inputCtx.send({
								content: `You have already submitted **${MAX_GUESSES}** guesses!`,
								ephemeral: true
							})
							return
						}
						else if (!fullWordList.includes(inputCtx.values.text_input)) {
							await inputCtx.send({
								content: 'You must enter a valid word.',
								ephemeral: true
							})
							return
						}

						// valid guess
						guesses.push(inputCtx.values.text_input)
						stopCollector()
						resolve(inputCtx)
					}
				}
				catch (err) {
					// modal timed out, continue
				}
			})

			collector.on('end', async msg => {
				try {
					if (msg === 'time') {
						reject(msg)
					}
				}
				catch (err) {
					logger.warn(err)
				}
			})
		})
	}

	awaitGuess (ctx: ComponentContext): Promise<ModalInteractionContext> {
		let finished = false

		return Promise.race([
			new Promise<ModalInteractionContext>((resolve, reject) => {
				ctx.sendModal({
					title: 'Wordle Gamble',
					components: [
						{
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.TEXT_INPUT,
									label: 'Please enter your guess:',
									style: TextInputStyle.SHORT,
									custom_id: 'text_input',
									placeholder: 'Type something...',
									min_length: 5,
									max_length: 5,
									required: true
								}
							]
						}
					]
				}, async mctx => {
					if (finished) {
						try {
							await mctx.send({
								content: `${icons.danger} The wordle game has expired.`,
								ephemeral: true
							})
						}
						catch (err) {
							logger.warn(err)
						}

						return
					}

					resolve(mctx)
				}).catch(reject)
			}),

			// if user clicks outside of the modal or lets it sit there forever, discord doesnt send anything so using this timeout to ensure code doesnt halt
			new Promise<never>((resolve, reject) => setTimeout(() => {
				finished = true
				reject(new Error('Guess was never inputted'))
			}, 60 * 1000))
		])
	}

	getWordleEmbed (member: Member, bet: number, word: string, guesses: string[]): Embed {
		const embed = new Embed()
			.setAuthor(`${member.displayName}'s Wordle Gamble`, member.avatarURL)
		const display = []

		for (let i = 0; i < 5; i++) {
			if (!guesses[i]) {
				display.push(icons.wordle.empty.repeat(5))
			}
			else {
				const wordLetters = word.split('')
				const wordLettersModified = word.split('')
				const guessLetters = guesses[i].split('')
				const yellowLetters = []
				const greenLetters = []
				const rowDisplay: string[] = guessLetters.map(l => icons.wordle.gray[l as Letter])

				for (let i2 = 0; i2 < guesses[i].length; i2++) {
					const letter = guesses[i][i2]

					if (!this.isLetter(letter)) {
						throw new Error(`${letter} is not a valid letter`)
					}

					if (letter === word[i2]) {
						rowDisplay[i2] = icons.wordle.green[letter]
						greenLetters.push(letter)
						wordLettersModified[i2] = ''
					}
				}

				for (let i2 = 0; i2 < guesses[i].length; i2++) {
					const letter = guesses[i][i2]

					if (!this.isLetter(letter)) {
						throw new Error(`${letter} is not a valid letter`)
					}

					const occurances = wordLetters.filter(l => l === letter)
					const existingOccurances = [...yellowLetters, ...greenLetters].filter(l => l === letter)

					if (occurances.length > 0 && existingOccurances.length < occurances.length && wordLettersModified[i2] !== '') {
						rowDisplay[i2] = icons.wordle.yellow[letter]
						yellowLetters.push(letter)
					}
				}

				display.push(rowDisplay.join(''))
			}
		}

		embed.setDescription(`Bet: ${formatMoney(bet)}\n\n${display.join('\n')}`)

		return embed
	}

	getBetLimit (locationLevel: number): number {
		return 250 * locationLevel
	}

	isLetter (letter: string): letter is Letter {
		if ([
			'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
			'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
		].includes(letter)) {
			return true
		}

		return false
	}
}

export default WordleCommand
