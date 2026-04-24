"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameData } from "@/lib/types";
import { trackPlay } from "@/lib/tracking";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import LeaderboardSection from "@/components/LeaderboardSection";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import ShareCopiedToast from "@/components/ShareCopiedToast";
import { shareZazazaChallenge } from "@/lib/shareResultChallenge";
import CommonResult from "@/components/CommonResult";
import { resolveResultTone } from "@/lib/resultUtils";

type Phase = "idle" | "playing" | "round_clear" | "done";
type Cell = { value: number; given: boolean };
type Grid = Cell[][];
type PuzzleConfig = { size: number; boxRows: number; boxCols: number; remove: number; label: string };

const ROUNDS: PuzzleConfig[] = [
  { size: 4, boxRows: 2, boxCols: 2, remove: 8, label: "Round 1 · 4x4" },
  { size: 6, boxRows: 2, boxCols: 3, remove: 18, label: "Round 2 · 6x6" },
  { size: 9, boxRows: 3, boxCols: 3, remove: 45, label: "Round 3 · 9x9" },
];

function emptyNumbers(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

function cloneNumbers(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cellKey(r: number, c: number): string {
  return `${r}:${c}`;
}

function isValidPlacement(board: number[][], r: number, c: number, n: number, cfg: PuzzleConfig): boolean {
  for (let i = 0; i < cfg.size; i++) {
    if (board[r][i] === n) return false;
    if (board[i][c] === n) return false;
  }
  const br = Math.floor(r / cfg.boxRows) * cfg.boxRows;
  const bc = Math.floor(c / cfg.boxCols) * cfg.boxCols;
  for (let rr = br; rr < br + cfg.boxRows; rr++) {
    for (let cc = bc; cc < bc + cfg.boxCols; cc++) {
      if (board[rr][cc] === n) return false;
    }
  }
  return true;
}

function findBestEmpty(board: number[][], cfg: PuzzleConfig): { r: number; c: number; candidates: number[] } | null {
  let best: { r: number; c: number; candidates: number[] } | null = null;
  for (let r = 0; r < cfg.size; r++) {
    for (let c = 0; c < cfg.size; c++) {
      if (board[r][c] !== 0) continue;
      const candidates: number[] = [];
      for (let n = 1; n <= cfg.size; n++) {
        if (isValidPlacement(board, r, c, n, cfg)) candidates.push(n);
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

function solveBacktracking(board: number[][], cfg: PuzzleConfig, randomized: boolean): boolean {
  const spot = findBestEmpty(board, cfg);
  if (!spot) return true;
  if (spot.candidates.length === 0) return false;
  const nums = randomized ? shuffle(spot.candidates) : spot.candidates;
  for (const n of nums) {
    board[spot.r][spot.c] = n;
    if (solveBacktracking(board, cfg, randomized)) return true;
    board[spot.r][spot.c] = 0;
  }
  return false;
}

function countSolutions(board: number[][], cfg: PuzzleConfig, limit: number): number {
  let count = 0;
  const dfs = (): void => {
    if (count >= limit) return;
    const spot = findBestEmpty(board, cfg);
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

function generateSolvedBoard(cfg: PuzzleConfig): number[][] {
  const board = emptyNumbers(cfg.size);
  const ok = solveBacktracking(board, cfg, true);
  if (!ok) throw new Error(`Failed to generate solved board for ${cfg.size}x${cfg.size}`);
  return board;
}

function carvePuzzle(solution: number[][], cfg: PuzzleConfig): number[][] {
  const puzzle = cloneNumbers(solution);
  const positions = shuffle(Array.from({ length: cfg.size * cfg.size }, (_, i) => i));
  let removed = 0;
  for (const p of positions) {
    if (removed >= cfg.remove) break;
    const r = Math.floor(p / cfg.size);
    const c = p % cfg.size;
    if (puzzle[r][c] === 0) continue;
    const prev = puzzle[r][c];
    puzzle[r][c] = 0;
    const probe = cloneNumbers(puzzle);
    const solutions = countSolutions(probe, cfg, 2);
    if (solutions === 1) removed++;
    else puzzle[r][c] = prev;
  }
  return puzzle;
}

function generateValidatedPuzzle(cfg: PuzzleConfig): { solution: number[][]; puzzle: number[][] } {
  // Defensive generation: retry until we get exactly one solution.
  // This guarantees we never surface an unsolvable/ambiguous board to users.
  const MAX_ATTEMPTS = 8;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const solved = generateSolvedBoard(cfg);
    const puzzle = carvePuzzle(solved, cfg);
    const probe = cloneNumbers(puzzle);
    const solutions = countSolutions(probe, cfg, 2);
    if (solutions === 1) return { solution: solved, puzzle };
  }
  throw new Error(`Failed to generate a validated ${cfg.size}x${cfg.size} puzzle after retries`);
}

function toGridCells(puzzle: number[][]): Grid {
  return puzzle.map((row) => row.map((v) => ({ value: v, given: v !== 0 })));
}

function computeConflicts(grid: Grid, cfg: PuzzleConfig): Set<string> {
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

  for (let r = 0; r < cfg.size; r++) {
    markGroup(Array.from({ length: cfg.size }, (_, c) => ({ r, c, value: grid[r][c].value })));
  }
  for (let c = 0; c < cfg.size; c++) {
    markGroup(Array.from({ length: cfg.size }, (_, r) => ({ r, c, value: grid[r][c].value })));
  }
  for (let br = 0; br < cfg.size; br += cfg.boxRows) {
    for (let bc = 0; bc < cfg.size; bc += cfg.boxCols) {
      const cells: Array<{ r: number; c: number; value: number }> = [];
      for (let r = br; r < br + cfg.boxRows; r++) {
        for (let c = bc; c < bc + cfg.boxCols; c++) {
          cells.push({ r, c, value: grid[r][c].value });
        }
      }
      markGroup(cells);
    }
  }
  return set;
}

function mmss(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function boxLabel(cfg: PuzzleConfig): string {
  return `${cfg.boxRows}x${cfg.boxCols} boxes`;
}

function vibeLine(completedAllRounds: boolean, totalSec: number): string {
  if (!completedAllRounds) return "NPC vibes. Finish all 3 rounds for main character energy.";
  if (totalSec <= 180) return "Main Character Energy ⚡";
  if (totalSec <= 300) return "Grid Hero Mode 🧠";
  if (totalSec <= 480) return "Steady Solver Energy 👍";
  return "NPC vibes (for now). Run it back.";
}

function getRunScore(completedRounds: number, totalSec: number): number {
  // Completion is primary. Time gives bonus only inside a completed tier.
  if (completedRounds <= 0) return 0;
  if (completedRounds === 1) return 33;
  if (completedRounds === 2) return 66;
  // completed 3 rounds: 67..100 based on speed
  const t = Math.max(90, Math.min(600, totalSec));
  const fastBonus = Math.round(((600 - t) / (600 - 90)) * 33);
  return Math.max(67, Math.min(100, 67 + fastBonus));
}

function rankFromNormalized(game: GameData, normalized: number) {
  if (normalized >= 90) return game.stats.ranks[0] ?? { label: "S", color: "#FFD700", title: "Main Character Energy", subtitle: "Fast and clean under pressure.", maxMs: 0, percentileLabel: "Top 5%" };
  if (normalized >= 75) return game.stats.ranks[1] ?? game.stats.ranks[0];
  if (normalized >= 55) return game.stats.ranks[2] ?? game.stats.ranks[game.stats.ranks.length - 1];
  if (normalized >= 30) return game.stats.ranks[3] ?? game.stats.ranks[game.stats.ranks.length - 1];
  return game.stats.ranks[game.stats.ranks.length - 1] ?? { label: "D", color: "#94A3B8", title: "NPC vibes", subtitle: "Come back stronger.", maxMs: 999999, percentileLabel: "Bottom 25%" };
}

export default function MiniSpeedSudoku({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [roundIdx, setRoundIdx] = useState(0);
  const [puzzleGrid, setPuzzleGrid] = useState<Grid>(toGridCells(emptyNumbers(4)));
  const [solution, setSolution] = useState<number[][]>(emptyNumbers(4));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [roundTimes, setRoundTimes] = useState<number[]>([]);
  const [showAd, setShowAd] = useState(false);
  const [bestSec, setBestSec] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalTotalSec, setFinalTotalSec] = useState<number>(0);
  const [completedAllRounds, setCompletedAllRounds] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const timerStartedAtRef = useRef<number | null>(null);
  const cfg = ROUNDS[roundIdx] ?? ROUNDS[0];
  const conflicts = useMemo(() => computeConflicts(puzzleGrid, cfg), [puzzleGrid, cfg]);
  const totalSec = roundTimes.reduce((a, b) => a + b, 0);
  const leaderboardMs = (completedAllRounds ? finalTotalSec : finalTotalSec + 1800) * 1000;
  const completedRounds = Math.min(3, roundTimes.length);
  const normalizedScore = getRunScore(completedRounds, finalTotalSec);
  const percentile = Math.max(1, Math.min(99, normalizedScore));
  const resultRank = rankFromNormalized(game, normalizedScore);

  useEffect(() => {
    const raw = getHighScore(game.id);
    if (raw != null && raw < 0) setBestSec(-raw);
  }, [game.id]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      if (timerStartedAtRef.current == null) return;
      setElapsedSec(Math.floor((performance.now() - timerStartedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  const startRound = useCallback((idx: number) => {
    const nextCfg = ROUNDS[idx] ?? ROUNDS[0];
    const { solution: solved, puzzle } = generateValidatedPuzzle(nextCfg);
    setRoundIdx(idx);
    setPuzzleGrid(toGridCells(puzzle));
    setSolution(solved);
    setSelected(null);
    setElapsedSec(0);
    timerStartedAtRef.current = performance.now();
    setPhase("playing");
  }, []);

  const startGame = useCallback(() => {
    trackPlay(game.id);
    setRoundTimes([]);
    setIsNewBest(false);
    setFinalTotalSec(0);
    setCompletedAllRounds(false);
    startRound(0);
  }, [game.id, startRound]);

  const finishRun = useCallback(
    (finalTimes: number[]) => {
      const sec = finalTimes.reduce((a, b) => a + b, 0);
      const isNew = saveHighScore(game.id, -sec);
      setIsNewBest(isNew);
      if (isNew) setBestSec(sec);
      setFinalTotalSec(sec);
      setCompletedAllRounds(true);
      setPhase("done");
    },
    [game.id],
  );

  const endGameNow = useCallback(() => {
    const sec = roundTimes.reduce((a, b) => a + b, 0) + (phase === "playing" ? elapsedSec : 0);
    setFinalTotalSec(sec);
    setCompletedAllRounds(false);
    setIsNewBest(false);
    setPhase("done");
  }, [roundTimes, phase, elapsedSec]);

  const handleCellInput = useCallback(
    (num: number) => {
      if (phase !== "playing" || !selected) return;
      const cell = puzzleGrid[selected.r]?.[selected.c];
      if (!cell || cell.given) return;
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
    const cell = puzzleGrid[selected.r]?.[selected.c];
    if (!cell || cell.given) return;
    setPuzzleGrid((prev) => {
      const next = prev.map((row) => row.map((c) => ({ ...c })));
      next[selected.r][selected.c].value = 0;
      return next;
    });
  }, [phase, selected, puzzleGrid]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (phase !== "playing") return;
      const k = ev.key;
      if (k >= "1" && k <= String(cfg.size)) {
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
  }, [phase, cfg.size, handleCellInput, handleErase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const solved = puzzleGrid.every((row, r) => row.every((cell, c) => cell.value === solution[r]?.[c]));
    if (!solved) return;
    const sec = elapsedSec;
    setRoundTimes((prev) => {
      const next = [...prev, sec];
      const nextRound = roundIdx + 1;
      if (nextRound >= ROUNDS.length) {
        finishRun(next);
      } else {
        setPhase("round_clear");
      }
      return next;
    });
    playBeep("success");
  }, [phase, puzzleGrid, solution, elapsedSec, roundIdx, finishRun]);

  const goNextRound = useCallback(() => {
    startRound(roundIdx + 1);
  }, [roundIdx, startRound]);

  const handleRetry = useCallback(() => {
    if (shouldShowAd()) setShowAd(true);
    else setPhase("idle");
  }, []);

  const onShare = useCallback(async () => {
    const url = "/brain-age/mini-speed-sudoku";
    const vibe = vibeLine(completedAllRounds, finalTotalSec);
    const text = completedAllRounds
      ? `⏱️ I cleared Mini Speed Sudoku in ${mmss(finalTotalSec)} (${roundTimes.length}/3 rounds). ${vibe} Can you beat me? https://zazaza.app${url}`
      : `⏱️ I got ${mmss(finalTotalSec)} in Mini Speed Sudoku (${roundTimes.length}/3 rounds). ${vibe} Try it: https://zazaza.app${url}`;
    await shareZazazaChallenge({
      title: "Mini Speed Sudoku | ZAZAZA",
      text,
      url,
      onCopied: () => {
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2200);
      },
      replaceUrlBeforeShare: false,
    });
  }, [completedAllRounds, finalTotalSec, roundTimes.length]);

  const afterAd = useCallback(() => {
    setShowAd(false);
    setPhase("idle");
  }, []);

  if (phase === "done") {
    const shareTextOverride = completedAllRounds
      ? `⏱️ I finished Mini Speed Sudoku in ${mmss(finalTotalSec)} (${roundTimes.length}/3 rounds). Main Character Energy? Try to beat this.`
      : `⏱️ I got ${mmss(finalTotalSec)} in Mini Speed Sudoku (${roundTimes.length}/3 rounds). NPC vibes for now — your turn.`;
    const benchmarkNoteOverride = completedAllRounds
      ? null
      : "Benchmark: DNF; global average complete run is 5 min 20 sec.";
    return (
      <>
        {/* Keep this toast alive for compatibility with fallback sharing paths. */}
        <ShareCopiedToast show={shareCopied} />
        <CommonResult
          game={game}
          rawScore={leaderboardMs}
          rawUnit="ms"
          normalizedScore={normalizedScore}
          percentile={percentile}
          rank={resultRank}
          highScore={bestSec == null ? null : bestSec * 1000}
          isNewBest={isNewBest}
          showAd={showAd}
          onAdDone={afterAd}
          onRetry={handleRetry}
          tone={resolveResultTone(game)}
          shareTextOverride={shareTextOverride}
          benchmarkNoteOverride={benchmarkNoteOverride}
        />
      </>
    );
  }

  const progress = ((Math.min(roundIdx + (phase === "round_clear" ? 1 : 0), 2) + (phase === "playing" ? elapsedSec / Math.max(1, elapsedSec + 20) : 0)) / 3) * 100;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(30px,6vw,52px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 16 }}>🧩</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,20px)", fontWeight: 800, marginBottom: 8 }}>Mini Speed Sudoku</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4, lineHeight: 1.6, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Three rounds in one run: 4x4, then 6x6, then 9x9.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28, lineHeight: 1.5, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Fastest total completion time wins the leaderboard.
          </p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
            ▶ START RUN
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "round_clear") && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "14px 10px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap", padding: "0 4px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>{cfg.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>Timer {mmss(elapsedSec)}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
              Total {mmss(roundTimes.reduce((a, b) => a + b, 0) + elapsedSec)}
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
            Use digits 1-{cfg.size} · {boxLabel(cfg)}
          </div>
          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, progress)}%`, height: "100%", background: game.accent, transition: "width 220ms ease" }} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cfg.size}, minmax(0, 1fr))`,
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
                const borderTop = r % cfg.boxRows === 0 ? 3 : 1;
                const borderLeft = c % cfg.boxCols === 0 ? 3 : 1;
                const borderRight = c === cfg.size - 1 ? 3 : 1;
                const borderBottom = r === cfg.size - 1 ? 3 : 1;
                const isBoxTop = r % cfg.boxRows === 0;
                const isBoxLeft = c % cfg.boxCols === 0;
                const isBoxRight = c === cfg.size - 1;
                const isBoxBottom = r === cfg.size - 1;
                const majorBorderColor = cfg.size === 6 ? "rgba(34,211,238,0.9)" : "var(--border-md)";
                const minorBorderColor = "var(--border-md)";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected({ r, c })}
                    style={{
                      borderTop: `${borderTop}px solid ${isBoxTop ? majorBorderColor : minorBorderColor}`,
                      borderLeft: `${borderLeft}px solid ${isBoxLeft ? majorBorderColor : minorBorderColor}`,
                      borderRight: `${borderRight}px solid ${isBoxRight ? majorBorderColor : minorBorderColor}`,
                      borderBottom: `${borderBottom}px solid ${isBoxBottom ? majorBorderColor : minorBorderColor}`,
                      background: isSelected ? `${game.accent}30` : hasConflict ? "rgba(239,68,68,0.22)" : "transparent",
                      color: cell.given ? "#d1d5db" : "#cbd5e1",
                      fontSize: "clamp(14px, 3vw, 24px)",
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

          {phase === "round_clear" && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <div className="anim-fade-up" style={{ fontSize: 22, marginBottom: 4 }}>Round clear!</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                This round: {mmss(roundTimes[roundTimes.length - 1] ?? elapsedSec)}
              </div>
              <button
                type="button"
                onClick={goNextRound}
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
                Next Round →
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 12 }}>
            {Array.from({ length: cfg.size }, (_, i) => i + 1).map((n) => (
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
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <button
              type="button"
              onClick={endGameNow}
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
