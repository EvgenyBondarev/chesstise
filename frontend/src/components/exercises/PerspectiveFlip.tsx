import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useStopwatch, formatTime } from '../../hooks/useStopwatch'
import type { Square } from 'chess.js'
import type { BoardOrientation, RunResult } from '../../types'
import {
	ALL_SQUARES,
	getVisualQuadrant,
	shuffleArray,
	noConsecDupes,
} from '../../utils/chessUtils'
import { speak, playSound, playCongratsSound } from '../../utils/speechUtils'
import { useSessionStore } from '../../store/sessionStore'
import { useProfileStore } from '../../store/profileStore'
import { useAnnouncer } from '../../hooks/useAnnouncer'
import AccessibleBoard from '../common/AccessibleBoard'
import StatsPanel from '../common/StatsPanel'

const ID = 'cell-guesser' as const
const BOARD_SIZE = 360
const ROUND_SIZE = 30
const DIM = { boxShadow: 'inset 0 0 0 1000px rgba(13,17,23,0.72)' }

type Perspective = 'white' | 'black' | 'both'
type Entry = { square: Square; orientation: BoardOrientation }

function buildDeck(p: Perspective): Entry[] {
	if (p !== 'both') {
		const entries = ALL_SQUARES.map(sq => ({ square: sq, orientation: p as BoardOrientation }))
		return noConsecDupes(shuffleArray(entries).slice(0, ROUND_SIZE), e => e.square)
	}
	// 'both': guarantee exactly half white, half black so neither side dominates
	const half = ROUND_SIZE >> 1
	const wPool = shuffleArray(ALL_SQUARES.map(sq => ({ square: sq, orientation: 'white' as BoardOrientation })))
	const bPool = shuffleArray(ALL_SQUARES.map(sq => ({ square: sq, orientation: 'black' as BoardOrientation })))
	return noConsecDupes(shuffleArray([...wPool.slice(0, half), ...bPool.slice(0, half)]), e => e.square)
}

function homeSquare(o: BoardOrientation): Square {
	return o === 'white' ? 'a1' : 'h8'
}

function isBetter(a: RunResult, b: RunResult): boolean {
	// 1. No hint beats hint (undefined → hint was on)
	const aNoHint = a.hint === false
	const bNoHint = b.hint === false
	if (aNoHint !== bNoHint) return aNoHint
	// 2. Both sides beats single side (undefined → single side)
	const aBoth = a.perspective === 'both'
	const bBoth = b.perspective === 'both'
	if (aBoth !== bBoth) return aBoth
	// 3. More correct guesses
	if (a.correct !== b.correct) return a.correct > b.correct
	// 4. Less time
	return a.timeMs < b.timeMs
}

function runMode(r: RunResult): string {
	const p = r.perspective ?? 'single'
	const h = r.hint === false ? 'no hint' : 'hint'
	return `${p} · ${h}`
}

export default function CellGuesser() {
	const { stats, recordAttempt, resetStats } = useSessionStore()
	const myStats = stats[ID]
	const { announce, liveA, liveB } = useAnnouncer()
	const { addCellGuesserRun, cellGuesserRuns } = useProfileStore()

	const [perspective, setPerspective] = useState<Perspective>('both')
	const [deck, setDeck] = useState<Entry[]>(() => buildDeck('both'))
	const [idx, setIdx] = useState(0)
	const [lastResult, setLast] = useState<'correct' | 'incorrect' | null>(null)
	const [showHint, setShowHint] = useState(false)
	const [started, setStarted] = useState(false)
	const [completed, setCompleted] = useState(false)
	const [finalCorrect, setFinalCorrect] = useState(0)
	const [isNewBest, setIsNewBest] = useState(false)
	useEffect(() => { if (isNewBest) playCongratsSound(); }, [isNewBest])

	const correctRef = useRef(0)
	const { elapsed, start: startTimer, stop: stopTimer, clear: clearTimer } = useStopwatch()

	const bestRun =
		cellGuesserRuns.length > 0
			? cellGuesserRuns.reduce((b, r) => (isBetter(r, b) ? r : b))
			: null

	const { square: current, orientation } = deck[idx]
	const quadrant = getVisualQuadrant(current, orientation)
	const orientLabel = orientation === 'white' ? 'white' : 'black'

	// Voice + aria announcement on each new square (and when session first starts)
	useEffect(() => {
		if (!started) return
		announce(
			`${orientLabel} perspective, quadrant ${quadrant}. Find and select square: ${current}`
		)
		speak(`${orientLabel} ${current}`)
	}, [current, started]) // eslint-disable-line react-hooks/exhaustive-deps

	const dimStyles = useMemo(() => {
		const s: Record<string, React.CSSProperties> = {}
		for (const sq of ALL_SQUARES)
			if (getVisualQuadrant(sq, orientation) !== quadrant) s[sq] = DIM
		return s
	}, [quadrant, orientation])

	const completeSession = useCallback(() => {
		const finalTime = stopTimer()
		const finalCorrectCount = correctRef.current
		const run: RunResult = {
			timeMs: finalTime,
			correct: finalCorrectCount,
			total: ROUND_SIZE,
			hint: showHint,
			perspective,
			date: new Date().toISOString(),
		}
		// Read fresh from the store to avoid stale-closure bug
		const runs = useProfileStore.getState().cellGuesserRuns
		const existingBest =
			runs.length > 0 ? runs.reduce((b, r) => (isBetter(r, b) ? r : b)) : null
		setFinalCorrect(finalCorrectCount)
		setIsNewBest(existingBest === null || isBetter(run, existingBest))
		addCellGuesserRun(run)
		setCompleted(true)
	}, [stopTimer, addCellGuesserRun, showHint, perspective])

	const advance = useCallback(() => {
		const next = idx + 1
		if (next >= deck.length) completeSession()
		else setIdx(next)
		setLast(null)
	}, [idx, deck.length, completeSession])

	const handleSelect = useCallback(
		(sq: Square) => {
			if (lastResult !== null) return
			const ok = sq === current
			if (ok) correctRef.current++
			playSound(ok)
			setLast(ok ? 'correct' : 'incorrect')
			recordAttempt(ID, ok)
			announce(ok ? `Correct! ${sq}` : `Wrong — the target was ${current}`)
			setTimeout(advance, ok ? 400 : 800)
		},
		[current, lastResult, recordAttempt, announce, advance]
	)

	const startNewSession = useCallback((p: Perspective) => {
		clearTimer()
		correctRef.current = 0
		resetStats(ID)
		setDeck(buildDeck(p))
		setIdx(0)
		setLast(null)
		setCompleted(false)
		setStarted(false)
		setFinalCorrect(0)
		setIsNewBest(false)
	}, [clearTimer, resetStats])

	const handleStart = useCallback(() => {
		startTimer()
		setStarted(true)
	}, [startTimer])

	const handleRestart = useCallback(() => {
		correctRef.current = 0
		resetStats(ID)
		setDeck(buildDeck(perspective))
		setIdx(0)
		setLast(null)
		setFinalCorrect(0)
		setIsNewBest(false)
		setCompleted(false)
		startTimer()
	}, [perspective, resetStats, startTimer])

	useEffect(() => {
		if (started && !completed) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 's' || e.ctrlKey || e.metaKey || e.altKey) return
			const el = document.activeElement as HTMLElement | null
			if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
			e.preventDefault()
			if (completed) handleRestart()
			else handleStart()
		}
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [started, completed, handleStart, handleRestart])

	const handlePerspectiveChange = useCallback(
		(p: Perspective) => {
			setPerspective(p)
			startNewSession(p)
		},
		[startNewSession]
	)

	const quadrantLabel = useCallback(
		(sq: Square) => `quadrant ${getVisualQuadrant(sq, orientation)}`,
		[orientation]
	)

	// ── Pre-game ─────────────────────────────────────────────────
	if (!started) {
		const recentRuns = [...cellGuesserRuns].reverse().slice(0, 10)
		const bestDate = bestRun?.date
		return (
			<div className='exercise-page'>
				<h1 className='exercise-title'>Cell Guesser</h1>
					<div className='pregame-screen'>
					<p className='pregame-desc'>
						{ROUND_SIZE} squares — find each on the board as fast as you can
					</p>
					{bestRun && (
						<p className='pregame-best'>
							Best: {bestRun.correct}/{bestRun.total} in{' '}
							{formatTime(bestRun.timeMs)} · {runMode(bestRun)}
						</p>
					)}
					<details className='color-hint-details'>
						<summary>How is the best result ranked?</summary>
						<div className='color-hint-body'>
							<p>Harder settings earn a higher rank — even if the score or time is worse.</p>
							<ol>
								<li><strong>No hint</strong> beats using the quadrant hint</li>
								<li><strong>Both sides</strong> beats playing as one colour only</li>
								<li>More <strong>correct</strong> guesses</li>
								<li><strong>Faster</strong> time</li>
							</ol>
						</div>
					</details>
					<div className='pregame-options'>
						<select
							className='perspective-select'
							value={perspective}
							onChange={(e) =>
								handlePerspectiveChange(e.target.value as Perspective)
							}
							aria-label='Choose board perspective'
						>
							<option value='both'>Both sides</option>
							<option value='white'>White only</option>
							<option value='black'>Black only</option>
						</select>
						<label className='hint-toggle'>
							<input
								type='checkbox'
								checked={showHint}
								onChange={(e) => setShowHint(e.target.checked)}
							/>
							Quadrant hint
						</label>
					</div>
					<button className='game-btn' onClick={handleStart}>
						Start (s)
					</button>
					{cellGuesserRuns.length > 0 && (
						<table className='run-history'>
							<thead>
								<tr>
									<th>Date</th>
									<th>Correct</th>
									<th>Time</th>
									<th>Mode</th>
								</tr>
							</thead>
							<tbody>
								{recentRuns.map((r, i) => (
									<tr key={i} className={r.date === bestDate ? 'best-run' : ''}>
										<td>{new Date(r.date).toLocaleString()}</td>
										<td>
											{r.correct}/{r.total}
										</td>
										<td>{formatTime(r.timeMs)}</td>
										<td>{runMode(r)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>
		)
	}

	// ── Completion ───────────────────────────────────────────────
	if (completed) {
		const recentRuns = [...cellGuesserRuns].reverse().slice(0, 10)
		const bestDate = bestRun?.date
		return (
			<div className='exercise-page'>
				<h1 className='exercise-title'>Cell Guesser</h1>
					<div className='completion-screen'>
					<p className='completion-label'>
						{ROUND_SIZE} squares — session complete
					</p>
					<p className='completion-score'>
						{finalCorrect}/{ROUND_SIZE} correct
					</p>
					<p className='completion-time'>{formatTime(elapsed)}</p>
					{isNewBest ? (
						<p className='completion-badge new-best'>New best!</p>
					) : (
						bestRun && (
							<p className='completion-badge'>
								Best: {bestRun.correct}/{bestRun.total} in{' '}
								{formatTime(bestRun.timeMs)} · {runMode(bestRun)}
							</p>
						)
					)}
					{cellGuesserRuns.length > 1 && (
						<table className='run-history'>
							<thead>
								<tr>
									<th>Date</th>
									<th>Correct</th>
									<th>Time</th>
									<th>Mode</th>
								</tr>
							</thead>
							<tbody>
								{recentRuns.map((r, i) => (
									<tr key={i} className={r.date === bestDate ? 'best-run' : ''}>
										<td>{new Date(r.date).toLocaleString()}</td>
										<td>
											{r.correct}/{r.total}
										</td>
										<td>{formatTime(r.timeMs)}</td>
										<td>{runMode(r)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
					<button
						className='game-btn'
						onClick={handleRestart}
					>
						Start again (s)
					</button>
				</div>
			</div>
		)
	}

	// ── In-game ──────────────────────────────────────────────────
	return (
		<div className='exercise-page exercise-page--wide'>
			<div
				role='status'
				aria-live='polite'
				aria-atomic='true'
				className='sr-only'
			>
				{liveA}
			</div>
			<div
				role='status'
				aria-live='polite'
				aria-atomic='true'
				className='sr-only'
			>
				{liveB}
			</div>

			<h1 className='exercise-title'>Cell Guesser</h1>

			<div className='exercise-body'>
				<div className='board-col'>
					<div className='prompt-card'>
						<label htmlFor='perspective-select' className='sr-only'>
							Board perspective
						</label>
						<select
							id='perspective-select'
							className='perspective-select'
							value={perspective}
							onChange={(e) =>
								handlePerspectiveChange(e.target.value as Perspective)
							}
							aria-label='Choose board perspective'
						>
							<option value='both'>Both sides</option>
							<option value='white'>White only</option>
							<option value='black'>Black only</option>
						</select>

						<label className='hint-toggle' title='Show quadrant hint'>
							<input
								type='checkbox'
								checked={showHint}
								onChange={(e) => setShowHint(e.target.checked)}
							/>
							Quadrant hint
						</label>
						{showHint && (
							<span className='prompt-badge' aria-hidden='true'>
								Q{quadrant}
							</span>
						)}

						<span className={`orient-pill ${orientation}`} aria-hidden='true'>
							{orientation === 'white' ? '♔ White' : '♚ Black'}
						</span>
						<span
							className='prompt-target'
							aria-label={`${orientLabel} view, quadrant ${quadrant}. Find square ${current}`}
						>
							{current}
						</span>

						<span className='stopwatch' aria-live='off'>
							{formatTime(elapsed)}
						</span>
						<span className='round-counter' aria-live='off'>
							{idx + 1}/{ROUND_SIZE}
						</span>
					</div>

					<div
						className={`board-wrap${lastResult ? ` flash-${lastResult}` : ''}`}
					>
						<AccessibleBoard
							position={{}}
							boardWidth={BOARD_SIZE}
							boardOrientation={orientation}
							customSquareStyles={showHint ? dimStyles : {}}
							onSquareSelect={handleSelect}
							getSquareLabel={quadrantLabel}
							ariaLabel={`Chess board, ${orientLabel} orientation, quadrant ${quadrant} highlighted. Arrow keys to navigate, Enter to select square ${current}.`}
							disabled={lastResult !== null}
							initialCursor={homeSquare(orientation)}
						/>
					</div>
				</div>

				<StatsPanel
					stats={myStats}
					lastResult={lastResult}
					onReset={handleRestart}
				/>
			</div>
		</div>
	)
}
