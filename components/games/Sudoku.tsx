"use client";

import { trackPlay } from "@/lib/tracking";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameData } from "@/lib/types";
import ShareCopiedToast from "@/components/ShareCopiedToast";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import { createSharedResultUrl } from "@/lib/createSharedResultUrl";
import type { ResultSharePayloadV1 } from "@/lib/resultShareTypes";
import { shareZazazaChallenge } from "@/lib/shareResultChallenge";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import LeaderboardSection from "@/components/LeaderboardSection";

type Phase = "idle" | "playing" | "puzzle_complete" | "milestone" | "done";
type Cell = { value: number; given: boolean };
type Grid = Cell[][];

const SIZE = 9;
const BOX = 3;
const MIN_SCORE_PER_PUZZLE = 100;
const MAX_SCORE_PER_PUZZLE = 10_000;

function emptyNumbers(): number[][] {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cloneNumbers(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

function cellKey(r: number, c: number): string {
  return `${r}:${c}`;
}

function difficultyForLevel(level: number): { label: "Easy" | "Medium" | "Hard" | "Expert"; remove: number; multiplier: number } {
  if (level <= 3) return { label: "Easy", remove: 35, multiplier: 5 };
  if (level <= 6) return { label: "Medium", remove: 45, multiplier: 8 };
  if (level <= 9) return { label: "Hard", remove: 52, multiplier: 12 };
  return { label: "Expert", remove: 57, multiplier: 20 };
}

function isValidPlacement(board: number[][], r: number, c: number, n: number): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (board[r][i] === n) return false;
    if (board[i][c] === n) return false;
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let rr = br; rr < br + BOX; rr++) {
    for (let cc = bc; cc < bc + BOX; cc++) {
      if (board[rr][cc] === n) return false;
    }
  }
  return true;
}

function findBestEmpty(board: number[][]): { r: number; c: number; candidates: number[] } | null {
  let best: { r: number; c: number; candidates: number[] } | null = null;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) continue;
      const candidates: number[] = [];
      for (let n = 1; n <= 9; n++) {
        if (isValidPlacement(board, r, c, n)) candidates.push(n);
      }
      if (candidates.length === 0) return { r, c, candidates };
      if (!best || candidates.length < best.candidates.length) {
        best = { r, c, candidates };
        if (candidates.length === 1) return best;
      }
    }
  }
  return best;
}

function solveBacktracking(board: number[][], randomized: boolean): boolean {
  const spot = findBestEmpty(board);
  if (!spot) return true;
  if (spot.candidates.length === 0) return false;
  const nums = randomized ? shuffle(spot.candidates) : spot.candidates;
  for (const n of nums) {
    board[spot.r][spot.c] = n;
    if (solveBacktracking(board, randomized)) return true;
    board[spot.r][spot.c] = 0;
  }
  return false;
}

function countSolutions(board: number[][], limit: number): number {
  let count = 0;
  const dfs = (): void => {
    if (count >= limit) return;
    const spot = findBestEmpty(board);
    if (!spot) {
      count++;
      return;
    }
    if (spot.candidates.length === 0) return;
    for (const n of spot.candidates) {
      board[spot.r][spot.c] = n;
      dfs();
      board[spot.r][spot.c] = 0;
      if (count >= limit) return;
    }
  };
  dfs();
  return count;
}

function generateSolvedBoard(): number[][] {
  const board = emptyNumbers();
  solveBacktracking(board, true);
  return board;
}

function carvePuzzle(solution: number[][], removeCount: number): number[][] {
  const puzzle = cloneNumbers(solution);
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;
  for (const p of positions) {
    if (removed >= removeCount) break;
    const r = Math.floor(p / SIZE);
    const c = p % SIZE;
    if (puzzle[r][c] === 0) continue;
    const prev = puzzle[r][c];
    puzzle[r][c] = 0;
    const probe = cloneNumbers(puzzle);
    const solutions = countSolutions(probe, 2);
    if (solutions === 1) {
      removed++;
    } else {
      puzzle[r][c] = prev;
    }
  }
  return puzzle;
}

function toGridCells(puzzle: number[][]): Grid {
  return puzzle.map((row) => row.map((v) => ({ value: v, given: v !== 0 })));
}

function computeConflicts(grid: Grid): Set<string> {
  const set = new Set<string>();
  const markGroup = (cells: Array<{ r: number; c: number; value: number }>) => {
    const m = new Map<number, Array<{ r: number; c: number }>>();
    for (const cell of cells) {
      if (cell.value === 0) continue;
      const list = m.get(cell.value) ?? [];
      list.push({ r: cell.r, c: cell.c });
      m.set(cell.value, list);
    }
    for (const list of m.values()) {
      if (list.length <= 1) continue;
      for (const pos of list) set.add(cellKey(pos.r, pos.c));
    }
  };

  for (let r = 0; r < SIZE; r++) {
    markGroup(Array.from({ length: SIZE }, (_, c) => ({ r, c, value: grid[r][c].value })));
  }
  for (let c = 0; c < SIZE; c++) {
    markGroup(Array.from({ length: SIZE }, (_, r) => ({ r, c, value: grid[r][c].value })));
  }
  for (let br = 0; br < SIZE; br += BOX) {
    for (let bc = 0; bc < SIZE; bc += BOX) {
      const cells: Array<{ r: number; c: number; value: number }> = [];
      for (let r = br; r < br + BOX; r++) {
        for (let c = bc; c < bc + BOX; c++) {
          cells.push({ r, c, value: grid[r][c].value });
        }
      }
      markGroup(cells);
    }
  }

  return set;
}

function levelOutcome(levelsCompleted: number): string {
  if (levelsCompleted <= 2) return "You gave up on Easy? 😅";
  if (levelsCompleted <= 5) return "Decent. Your brain is warming up 🧠";
  if (levelsCompleted <= 8) return "Medium crusher. Not bad at all 💪";
  if (levelsCompleted <= 11) return "Hard mode? You're the real deal 🔥";
  return "Expert Sudoku? Are you even human? 🤖";
}

function difficultyReached(levelsCompleted: number): string {
  if (levelsCompleted <= 0) return "Easy";
  return difficultyForLevel(levelsCompleted).label;
}

function mmss(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function progressPct(level: number): number {
  return Math.min(100, ((level - 1) % 3) * 50);
}

export default function Sudoku({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(1);
  const [puzzleGrid, setPuzzleGrid] = useState<Grid>(toGridCells(emptyNumbers()));
  const [solution, setSolution] = useState<number[][]>(emptyNumbers());
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [pointsLastPuzzle, setPointsLastPuzzle] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [showAd, setShowAd] = useState(false);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const timerStartedAtRef = useRef<number | null>(null);
  const levelsCompleted = times.length;
  const curDifficulty = difficultyForLevel(level);

  const conflicts = useMemo(() => computeConflicts(puzzleGrid), [puzzleGrid]);

  useEffect(() => {
    const raw = getHighScore(game.id);
    setHighScore(raw == null ? null : -raw);
  }, [game.id]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      if (timerStartedAtRef.current == null) return;
      const sec = Math.floor((performance.now() - timerStartedAtRef.current) / 1000);
      setElapsedSec(sec);
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  const startLevel = useCallback((targetLevel: number) => {
    const d = difficultyForLevel(targetLevel);
    const solved = generateSolvedBoard();
    const puzzle = carvePuzzle(solved, d.remove);
    setLevel(targetLevel);
    setPuzzleGrid(toGridCells(puzzle));
    setSolution(solved);
    setSelected(null);
    setElapsedSec(0);
    timerStartedAtRef.current = performance.now();
    setPhase("playing");
  }, []);

  const startGame = useCallback(() => {
    trackPlay(game.id);
    setTotalScore(0);
    setTimes([]);
    setMilestoneText(null);
    setPointsLastPuzzle(0);
    setIsNewBest(false);
    startLevel(1);
  }, [game.id, startLevel]);

  const finishGame = useCallback(() => {
    const isNew = saveHighScore(game.id, -totalScore);
    setIsNewBest(isNew);
    if (isNew) setHighScore(totalScore);
    setPhase("done");
  }, [game.id, totalScore]);

  const handleCellInput = useCallback(
    (num: number) => {
      if (phase !== "playing" || !selected) return;
      const cell = puzzleGrid[selected.r][selected.c];
      if (cell.given) return;

      setPuzzleGrid((prev) => {
        const next = prev.map((row) => row.map((c) => ({ ...c })));
        next[selected.r][selected.c].value = num;
        return next;
      });
      playBeep("tap");
    },
    [phase, selected, puzzleGrid],
  );

  const handleErase = useCallback(() => {
    if (phase !== "playing" || !selected) return;
    const cell = puzzleGrid[selected.r][selected.c];
    if (cell.given) return;
    setPuzzleGrid((prev) => {
      const next = prev.map((row) => row.map((c) => ({ ...c })));
      next[selected.r][selected.c].value = 0;
      return next;
    });
  }, [phase, selected, puzzleGrid]);

  useEffect(() => {
    if (phase !== "playing") return;
    const solved = puzzleGrid.every((row, r) => row.every((cell, c) => cell.value === solution[r][c]));
    if (!solved) return;

    const sec = elapsedSec;
    const points = Math.max(MIN_SCORE_PER_PUZZLE, MAX_SCORE_PER_PUZZLE - sec * curDifficulty.multiplier);
    setPointsLastPuzzle(points);
    setTotalScore((s) => s + points);
    setTimes((t) => [...t, sec]);
    playBeep("success");
    setPhase("puzzle_complete");
  }, [phase, puzzleGrid, solution, elapsedSec, curDifficulty.multiplier]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (phase !== "playing") return;
      const k = ev.key;
      if (k >= "1" && k <= "9") {
        ev.preventDefault();
        handleCellInput(Number(k));
        return;
      }
      if (k === "Backspace" || k === "Delete" || k === "0") {
        ev.preventDefault();
        handleErase();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleCellInput, handleErase]);

  const goNextPuzzle = useCallback(() => {
    const nextLevel = level + 1;
    const justFinished = level;
    if (justFinished % 3 === 0) {
      const nextDiff = difficultyForLevel(nextLevel).label;
      setMilestoneText(`You've reached ${nextDiff} difficulty! 🎯`);
      setPhase("milestone");
      return;
    }
    startLevel(nextLevel);
  }, [level, startLevel]);

  const continueFromMilestone = useCallback(() => {
    setMilestoneText(null);
    startLevel(level + 1);
  }, [level, startLevel]);

  const handleRetry = useCallback(() => {
    if (shouldShowAd()) setShowAd(true);
    else {
      setShowAd(false);
      setPhase("idle");
    }
  }, []);

  const afterAd = useCallback(() => {
    setShowAd(false);
    setPhase("idle");
  }, []);

  const avgSec = levelsCompleted > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / levelsCompleted) : 0;

  const onShare = useCallback(async () => {
    const diffLabel = difficultyReached(levelsCompleted);
    const outcome = levelOutcome(levelsCompleted);
    const payload: ResultSharePayloadV1 = {
      v: 1,
      kind: "sudoku",
      category: "brain-age",
      id: "sudoku",
      accent: game.accent,
      totalScore,
      levelsCompleted,
      avgSec,
      difficultyLabel: diffLabel,
      outcomeLine: outcome,
      ogScore: String(totalScore),
      ogLabel: diffLabel,
      ogEmoji: "🧩",
      ogPercentileLine: `${levelsCompleted} levels · avg ${mmss(avgSec)} / puzzle · peak ${diffLabel}.`,
      ogTestName: game.title,
    };
    const url = await createSharedResultUrl(payload);
    const text = `🧩 I got ${diffLabel} in ${game.title}! Score: ${totalScore} pts. ${levelsCompleted} levels · avg ${mmss(avgSec)} / puzzle. Can you beat me? ${url}`;
    await shareZazazaChallenge({
      title: `🧩 ${game.title} | ZAZAZA`,
      text,
      url,
      onCopied: () => {
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2200);
      },
      analytics: { content_type: "brain_test", item_id: "sudoku" },
    });
  }, [avgSec, game.accent, game.title, levelsCompleted, totalScore]);

  if (phase === "done") {
    return (
      <>
        <ShareCopiedToast show={shareCopied} />
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: "min(92vw, 420px)",
              borderRadius: 18,
              border: "1px solid var(--border-md)",
              background: "var(--bg-card)",
              padding: "20px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 8 }}>🧩</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 8 }}>
              SPEED SUDOKU RESULTS
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: game.accent, letterSpacing: "-0.02em", marginBottom: 8 }}>{totalScore}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", marginBottom: 14 }}>TOTAL SCORE</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Levels completed</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{levelsCompleted}</div>
              </div>
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Avg time / puzzle</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{mmss(avgSec)}</div>
              </div>
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Difficulty reached</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{difficultyReached(levelsCompleted)}</div>
              </div>
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Best score</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{highScore ?? totalScore}</div>
              </div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 14 }}>{levelOutcome(levelsCompleted)}</div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleRetry}
                className="pressable"
                style={{
                  width: "50%",
                  background: "var(--bg-elevated)",
                  color: "var(--text-1)",
                  border: "1px solid var(--border-md)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ▶ PLAY AGAIN
              </button>
              <button
                type="button"
                onClick={() => void onShare()}
                className="pressable"
                style={{
                  width: "50%",
                  background: game.accent,
                  color: "#000",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Share to Challenge a Friend
              </button>
            </div>
          </div>
          <LeaderboardSection gameId={game.id} rawScore={totalScore} rawUnit="pts" accent={game.accent} />
        </div>
      </>
    );
  }

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(30px,6vw,52px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 16 }}>🧩</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 800, marginBottom: 8 }}>Timed Sudoku Protocol</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4, lineHeight: 1.6, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            No time limit. Solve at your pace — but faster solves score higher.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28, lineHeight: 1.5, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            9x9 Sudoku · auto-level progression · unique-solution generated puzzles.
          </p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
            ▶ PLAY
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "puzzle_complete" || phase === "milestone") && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "14px 10px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap", padding: "0 4px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
              Level <span style={{ color: game.accent, fontWeight: 800 }}>{level}</span> — {curDifficulty.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>Score <span style={{ color: game.accent, fontWeight: 800 }}>{totalScore}</span></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>Time {mmss(elapsedSec)}</div>
          </div>

          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ width: `${progressPct(level)}%`, height: "100%", background: game.accent, transition: "width 220ms ease" }} />
          </div>

          {phase === "milestone" ? (
            <div style={{ textAlign: "center", padding: "18px 8px 10px" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{milestoneText}</div>
              <button
                type="button"
                onClick={continueFromMilestone}
                className="pressable"
                style={{
                  background: game.accent,
                  color: "#000",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 18px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Continue →
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  maxWidth: 460,
                  margin: "0 auto",
                  border: "3px solid var(--border-md)",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "var(--bg-elevated)",
                }}
              >
                {puzzleGrid.map((row, r) =>
                  row.map((cell, c) => {
                    const key = cellKey(r, c);
                    const isSelected = selected?.r === r && selected?.c === c;
                    const hasConflict = conflicts.has(key);
                    const borderTop = r % 3 === 0 ? 3 : 1;
                    const borderLeft = c % 3 === 0 ? 3 : 1;
                    const borderRight = c === 8 ? 3 : 1;
                    const borderBottom = r === 8 ? 3 : 1;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelected({ r, c })}
                        style={{
                          borderTop: `${borderTop}px solid var(--border-md)`,
                          borderLeft: `${borderLeft}px solid var(--border-md)`,
                          borderRight: `${borderRight}px solid var(--border-md)`,
                          borderBottom: `${borderBottom}px solid var(--border-md)`,
                          background: isSelected
                            ? `${game.accent}30`
                            : hasConflict
                              ? "rgba(239,68,68,0.22)"
                              : "transparent",
                          color: cell.given ? "#d1d5db" : "#cbd5e1",
                          fontSize: "clamp(14px, 3.2vw, 24px)",
                          fontWeight: cell.given ? 800 : 700,
                          cursor: "pointer",
                          lineHeight: 1,
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {cell.value === 0 ? "" : cell.value}
                      </button>
                    );
                  }),
                )}
              </div>

              {phase === "puzzle_complete" && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div className="anim-fade-up" style={{ fontSize: 24, marginBottom: 4 }}>✨ Puzzle complete!</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                    Time: {mmss(times[times.length - 1] ?? elapsedSec)} · Earned: +{pointsLastPuzzle} · Total: {totalScore}
                  </div>
                  <button
                    type="button"
                    onClick={goNextPuzzle}
                    className="pressable"
                    style={{
                      background: game.accent,
                      color: "#000",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      padding: "10px 18px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Next Puzzle →
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 12 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={phase !== "playing"}
                    onClick={() => handleCellInput(n)}
                    className="pressable"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-1)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 0",
                      fontSize: 18,
                      fontWeight: 700,
                      cursor: phase === "playing" ? "pointer" : "default",
                      opacity: phase === "playing" ? 1 : 0.55,
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={phase !== "playing"}
                  onClick={handleErase}
                  className="pressable"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 0",
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    cursor: phase === "playing" ? "pointer" : "default",
                    opacity: phase === "playing" ? 1 : 0.55,
                  }}
                >
                  ERASE
                </button>
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <button
              type="button"
              onClick={finishGame}
              className="pressable"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "8px 14px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              End Game
            </button>
          </div>
        </div>
      )}
    </>
  );
}
