"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackPlay } from "@/lib/tracking";
import type { GameData, GameRank } from "@/lib/types";
import { resolveResultTone } from "@/lib/resultUtils";
import CommonResult from "@/components/CommonResult";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const BOARD_SIZE = 13;
const PLAYER = 1; // black
const AI = 2; // white
const DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

type Cell = 0 | 1 | 2;
type Pos = { r: number; c: number };
type Turn = "player" | "ai";
type GameResult = "win" | "lose" | "draw" | null;

function makeBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(0));
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function keyOf(p: Pos) {
  return `${p.r}:${p.c}`;
}

function cloneBoard(board: Cell[][]) {
  return board.map((row) => row.slice());
}

function place(board: Cell[][], p: Pos, v: Cell) {
  const next = cloneBoard(board);
  next[p.r][p.c] = v;
  return next;
}

function gatherLine(board: Cell[][], p: Pos, who: Cell, dr: number, dc: number) {
  const line: Pos[] = [{ r: p.r, c: p.c }];
  let r = p.r - dr;
  let c = p.c - dc;
  while (inBounds(r, c) && board[r][c] === who) {
    line.unshift({ r, c });
    r -= dr;
    c -= dc;
  }
  r = p.r + dr;
  c = p.c + dc;
  while (inBounds(r, c) && board[r][c] === who) {
    line.push({ r, c });
    r += dr;
    c += dc;
  }
  return line;
}

function exactFiveFrom(board: Cell[][], p: Pos, who: Cell): Pos[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line = gatherLine(board, p, who, dr, dc);
    if (line.length === 5) return line;
  }
  return null;
}

function isDraw(board: Cell[][]) {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

function emptyCells(board: Cell[][]): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] === 0) out.push({ r, c });
    }
  }
  return out;
}

function immediateWinningMoves(board: Cell[][], who: Cell): Pos[] {
  const wins: Pos[] = [];
  for (const p of emptyCells(board)) {
    const test = place(board, p, who);
    if (exactFiveFrom(test, p, who)) wins.push(p);
  }
  return wins;
}

function analyzeRuns(board: Cell[][], who: Cell) {
  let open4 = 0;
  let closed4 = 0;
  let open3 = 0;

  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] !== who) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const pr = r - dr;
        const pc = c - dc;
        if (inBounds(pr, pc) && board[pr][pc] === who) continue;

        let len = 0;
        let rr = r;
        let cc = c;
        while (inBounds(rr, cc) && board[rr][cc] === who) {
          len += 1;
          rr += dr;
          cc += dc;
        }
        const openA = inBounds(pr, pc) && board[pr][pc] === 0;
        const openB = inBounds(rr, cc) && board[rr][cc] === 0;
        const openEnds = (openA ? 1 : 0) + (openB ? 1 : 0);

        if (len === 4) {
          if (openEnds === 2) open4 += 1;
          if (openEnds === 1) closed4 += 1;
        }
        if (len === 3 && openEnds === 2) open3 += 1;
      }
    }
  }

  return { open4, closed4, open3 };
}

function openThreeBlockingSpots(board: Cell[][], who: Cell): Pos[] {
  const spots = new Map<string, Pos>();
  // Detect contiguous 3-in-a-row with both ends open and block either end.
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] !== who) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const prevR = r - dr;
        const prevC = c - dc;
        if (inBounds(prevR, prevC) && board[prevR][prevC] === who) continue;

        let len = 0;
        let rr = r;
        let cc = c;
        while (inBounds(rr, cc) && board[rr][cc] === who) {
          len += 1;
          rr += dr;
          cc += dc;
        }
        if (len !== 3) continue;
        const leftOpen = inBounds(prevR, prevC) && board[prevR][prevC] === 0;
        const rightOpen = inBounds(rr, cc) && board[rr][cc] === 0;
        if (!leftOpen || !rightOpen) continue;

        const left = { r: prevR, c: prevC };
        const right = { r: rr, c: cc };
        spots.set(keyOf(left), left);
        spots.set(keyOf(right), right);
      }
    }
  }
  return [...spots.values()];
}

function countAdjacent(board: Cell[][], p: Pos) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const rr = p.r + dr;
      const cc = p.c + dc;
      if (inBounds(rr, cc) && board[rr][cc] !== 0) count += 1;
    }
  }
  return count;
}

function pickByAdjacency(board: Cell[][], choices: Pos[]) {
  if (!choices.length) return null;
  let best = -1;
  let bucket: Pos[] = [];
  for (const p of choices) {
    const s = countAdjacent(board, p);
    if (s > best) {
      best = s;
      bucket = [p];
    } else if (s === best) {
      bucket.push(p);
    }
  }
  return bucket[Math.floor(Math.random() * bucket.length)];
}

function bestByPattern(board: Cell[][], who: Cell, predicate: (r: ReturnType<typeof analyzeRuns>) => boolean) {
  const candidates = emptyCells(board);
  const matched: Pos[] = [];
  for (const p of candidates) {
    const test = place(board, p, who);
    const runs = analyzeRuns(test, who);
    if (predicate(runs)) matched.push(p);
  }
  return pickByAdjacency(board, matched);
}

function threateningMoves(board: Cell[][], who: Cell, predicate: (r: ReturnType<typeof analyzeRuns>) => boolean) {
  const out: Pos[] = [];
  for (const p of emptyCells(board)) {
    const test = place(board, p, who);
    const runs = analyzeRuns(test, who);
    if (predicate(runs)) out.push(p);
  }
  return out;
}

function randomAdjacentMove(board: Cell[][]) {
  const all = emptyCells(board);
  if (!all.length) return null;
  const near = all.filter((p) => countAdjacent(board, p) > 0);
  if (near.length) return near[Math.floor(Math.random() * near.length)];
  return all[Math.floor(Math.random() * all.length)];
}

function hasAnyExactFive(board: Cell[][], who: Cell) {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] !== who) continue;
      if (exactFiveFrom(board, { r, c }, who)) return true;
    }
  }
  return false;
}

function findAnyExactFiveLine(board: Cell[][], who: Cell): Pos[] | null {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] !== who) continue;
      const line = exactFiveFrom(board, { r, c }, who);
      if (line) return line;
    }
  }
  return null;
}

function getCandidateMoves(board: Cell[][], radius = 2) {
  const out = new Map<string, Pos>();
  let hasStone = false;
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (board[r][c] === 0) continue;
      hasStone = true;
      for (let dr = -radius; dr <= radius; dr += 1) {
        for (let dc = -radius; dc <= radius; dc += 1) {
          const rr = r + dr;
          const cc = c + dc;
          if (!inBounds(rr, cc) || board[rr][cc] !== 0) continue;
          const p = { r: rr, c: cc };
          out.set(keyOf(p), p);
        }
      }
    }
  }
  if (!hasStone) return [{ r: Math.floor(BOARD_SIZE / 2), c: Math.floor(BOARD_SIZE / 2) }];
  return [...out.values()];
}

function sortCandidates(board: Cell[][], moves: Pos[]) {
  return [...moves].sort((a, b) => countAdjacent(board, b) - countAdjacent(board, a));
}

function estimateThreatScore(board: Cell[][], who: Cell, candidates: Pos[]) {
  let open4 = 0;
  let closed4 = 0;
  let open3 = 0;
  let fork43 = 0;
  let fork33 = 0;
  let instantWins = 0;

  for (const p of candidates) {
    if (board[p.r][p.c] !== 0) continue;
    const test = place(board, p, who);
    if (exactFiveFrom(test, p, who)) instantWins += 1;
    const runs = analyzeRuns(test, who);
    if (runs.open4 >= 1) open4 += 1;
    if (runs.closed4 >= 1) closed4 += 1;
    if (runs.open3 >= 1) open3 += 1;
    if (runs.closed4 >= 1 && runs.open3 >= 1) fork43 += 1;
    if (runs.open3 >= 2) fork33 += 1;
  }

  return (
    instantWins * 200000 +
    open4 * 30000 +
    closed4 * 7000 +
    open3 * 1200 +
    fork43 * 18000 +
    fork33 * 6500
  );
}

function evaluateBoard(board: Cell[][]) {
  if (hasAnyExactFive(board, AI)) return 10_000_000;
  if (hasAnyExactFive(board, PLAYER)) return -10_000_000;

  const cands = getCandidateMoves(board, 2);
  const aiScore = estimateThreatScore(board, AI, cands);
  const playerScore = estimateThreatScore(board, PLAYER, cands);
  return aiScore - playerScore;
}

function minimax(board: Cell[][], depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || isDraw(board) || hasAnyExactFive(board, AI) || hasAnyExactFive(board, PLAYER)) {
    return evaluateBoard(board);
  }

  const all = sortCandidates(board, getCandidateMoves(board, 2));
  const moves = all.slice(0, 14);
  if (!moves.length) return evaluateBoard(board);

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const next = place(board, m, AI);
      const score = minimax(next, depth - 1, alpha, beta, false);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const m of moves) {
    const next = place(board, m, PLAYER);
    const score = minimax(next, depth - 1, alpha, beta, true);
    best = Math.min(best, score);
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAiMove(board: Cell[][]) {
  // Fast tactical checks before minimax.
  const aiWins = immediateWinningMoves(board, AI);
  if (aiWins.length) return pickByAdjacency(board, aiWins);

  const playerWins = immediateWinningMoves(board, PLAYER);
  if (playerWins.length) return pickByAdjacency(board, playerWins);

  const open3Blocks = openThreeBlockingSpots(board, PLAYER);
  if (open3Blocks.length) return pickByAdjacency(board, open3Blocks);

  const rootMoves = sortCandidates(board, getCandidateMoves(board, 2)).slice(0, 18);
  if (!rootMoves.length) return randomAdjacentMove(board);

  let bestScore = -Infinity;
  let bestMoves: Pos[] = [];
  for (const m of rootMoves) {
    const next = place(board, m, AI);
    const score = minimax(next, 2, -Infinity, Infinity, false); // depth 3 total plies
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m];
    } else if (score === bestScore) {
      bestMoves.push(m);
    }
  }
  return pickByAdjacency(board, bestMoves) ?? randomAdjacentMove(board);
}

const SCORE_TIME_CAP_MS = 180000;
const END_REVEAL_MS = 280;

function scoreFromClearMs(ms: number) {
  const clamped = Math.max(0, Math.min(SCORE_TIME_CAP_MS, ms));
  const ratio = 1 - clamped / SCORE_TIME_CAP_MS;
  return Math.max(1, Math.min(100, Math.round(1 + ratio * 99)));
}

function getScoreRank(score: number): GameRank {
  if (score >= 90) return { label: "S", maxMs: 100, color: "#FFD700", title: "Board Oracle", subtitle: "You read every line before it happens.", percentileLabel: "Top 5%" };
  if (score >= 75) return { label: "A", maxMs: 100, color: "#22C55E", title: "Threat Architect", subtitle: "You create pressure and close cleanly.", percentileLabel: "Top 20%" };
  if (score >= 55) return { label: "B", maxMs: 100, color: "#3B82F6", title: "Sequence Reader", subtitle: "Solid lines and good defensive timing.", percentileLabel: "Top 45%" };
  if (score >= 30) return { label: "C", maxMs: 100, color: "#94A3B8", title: "Line Builder", subtitle: "You are building strong Omok fundamentals.", percentileLabel: "Top 75%" };
  return { label: "D", maxMs: 100, color: "#F97316", title: "Stone Starter", subtitle: "Keep playing — your reads sharpen each run.", percentileLabel: "Bottom 25%" };
}

function getBestScore() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("nb_hs_omok");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function saveBestScore(score: number) {
  if (typeof window === "undefined") return false;
  const prev = getBestScore();
  if (prev === null || score > prev) {
    window.localStorage.setItem("nb_hs_omok", String(score));
    return true;
  }
  return false;
}

export default function Omok({ game }: { game: GameData }) {
  const [started, setStarted] = useState(false);
  const [board, setBoard] = useState<Cell[][]>(makeBoard);
  const [turn, setTurn] = useState<Turn>("player");
  const [result, setResult] = useState<GameResult>(null);
  const [ending, setEnding] = useState(false);
  const [endingMessage, setEndingMessage] = useState<string | null>(null);
  const [winning, setWinning] = useState<Set<string>>(new Set());
  const [lastMove, setLastMove] = useState<{ r: number; c: number; who: Cell } | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [clearMs, setClearMs] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [runStartedAt, setRunStartedAt] = useState<number>(0);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ended = result !== null || ending;
  const turnLabel = turn === "player" ? "Black (You)" : "White (AI)";

  const status = useMemo(() => {
    if (result === "win") return "You win! Exactly five in a row.";
    if (result === "lose") return "AI wins.";
    if (result === "draw") return "Draw.";
    return `Turn: ${turnLabel}`;
  }, [result, turnLabel]);

  const restart = () => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
    setStarted(false);
    setBoard(makeBoard());
    setTurn("player");
    setResult(null);
    setEnding(false);
    setEndingMessage(null);
    setWinning(new Set());
    setLastMove(null);
    setIsNewBest(false);
    setClearMs(0);
    setFinalScore(0);
    setRunStartedAt(0);
  };

  useEffect(() => {
    setHighScore(getBestScore());
  }, []);

  useEffect(
    () => () => {
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
    },
    [],
  );

  const finishIfEnded = (next: Cell[][], last: Pos, who: Cell): boolean => {
    const moverExact = exactFiveFrom(next, last, who);

    if (who === PLAYER && moverExact) {
      setBoard(next);
      setWinning(new Set(moverExact.map(keyOf)));
      const elapsed = Math.max(0, Math.round(performance.now() - runStartedAt));
      const score = scoreFromClearMs(elapsed);
      setClearMs(elapsed);
      setFinalScore(score);
      const isNew = saveBestScore(score);
      setIsNewBest(isNew);
      if (isNew) setHighScore(score);
      setEnding(true);
      setEndingMessage("Player made 5 stones in a row.");
      endTimerRef.current = setTimeout(() => {
        setEnding(false);
        setEndingMessage(null);
        setResult("win");
      }, END_REVEAL_MS);
      return true;
    }

    // AI only wins if its latest move itself creates exact-five.
    if (who === AI && moverExact) {
      setBoard(next);
      setWinning(new Set(moverExact.map(keyOf)));
      setFinalScore(0);
      setEnding(true);
      setEndingMessage("AI made 5 stones in a row.");
      endTimerRef.current = setTimeout(() => {
        setEnding(false);
        setEndingMessage(null);
        setResult("lose");
      }, END_REVEAL_MS);
      return true;
    }

    if (isDraw(next)) {
      setBoard(next);
      setFinalScore(0);
      setEnding(true);
      setEndingMessage("Draw. No 5 in a row and board is full.");
      endTimerRef.current = setTimeout(() => {
        setEnding(false);
        setEndingMessage(null);
        setResult("draw");
      }, END_REVEAL_MS);
      return true;
    }
    return false;
  };

  const handlePlayerMove = (p: Pos) => {
    if (ended || turn !== "player") return;
    if (board[p.r][p.c] !== 0) return;
    const next = place(board, p, PLAYER);
    setLastMove({ r: p.r, c: p.c, who: PLAYER });
    if (finishIfEnded(next, p, PLAYER)) return;
    setBoard(next);
    setTurn("ai");
  };

  useEffect(() => {
    if (!started || ended || turn !== "ai") return;
    const timer = window.setTimeout(() => {
      const move = chooseAiMove(board);
      if (!move) {
        if (isDraw(board)) {
          setEnding(true);
          setEndingMessage("Draw. No 5 in a row and board is full.");
          endTimerRef.current = setTimeout(() => {
            setEnding(false);
            setEndingMessage(null);
            setResult("draw");
          }, END_REVEAL_MS);
        }
        return;
      }
      const next = place(board, move, AI);
      setLastMove({ r: move.r, c: move.c, who: AI });
      if (finishIfEnded(next, move, AI)) return;
      setBoard(next);
      setTurn("player");
    }, 180);
    return () => window.clearTimeout(timer);
  }, [board, ended, started, turn]);

  const btnSize = "clamp(24px, 5.6vw, 34px)";

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else restart();
  };
  const afterAd = () => {
    setShowAd(false);
    restart();
  };

  if (result) {
    const percentile = Math.max(0, Math.min(100, finalScore));
    const rank = getScoreRank(finalScore);
    const shareTextOverride =
      result === "win"
        ? `I beat the AI in Omok with ${finalScore}/100. Can you beat me?`
        : `I played Omok on ZAZAZA. Can you beat the AI?`;
    const killerLineOverride =
      result === "win"
        ? `You beat the AI in ${Math.round(clearMs / 1000)}s.`
        : result === "draw"
          ? "Draw. No five-in-a-row before the board filled."
          : "AI wins this round. Run it back.";

    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <CommonResult
          game={game}
          rawScore={finalScore}
          rawUnit="pts"
          normalizedScore={finalScore}
          percentile={percentile}
          rank={rank}
          highScore={highScore}
          isNewBest={isNewBest}
          showAd={showAd}
          onAdDone={afterAd}
          onRetry={handleRetry}
          tone={resolveResultTone(game)}
          killerLineOverride={killerLineOverride}
          shareTextOverride={shareTextOverride}
        />
      </>
    );
  }

  if (!started) {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1.5px solid rgba(27,77,62,0.4)",
          borderRadius: "var(--radius-xl)",
          padding: "34px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 54, marginBottom: 14 }}>⚫</div>
        <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>Omok (13x13)</p>
        <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 20 }}>
          Black first · Exact 5 wins · 6+ does not count
        </p>
        <button
          type="button"
          onClick={() => {
            trackPlay(game.id);
            setRunStartedAt(performance.now());
            setStarted(true);
          }}
          style={{
            border: "none",
            borderRadius: 10,
            padding: "12px 22px",
            background: "#1B4D3E",
            color: "#042012",
            fontWeight: 900,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
          }}
        >
          ▶ PLAY
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#0a0a0f",
        border: "1px solid rgba(148,163,184,0.22)",
        borderRadius: 16,
        padding: "16px 14px 18px",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff" }}>Omok (13x13)</h2>
      <p style={{ margin: "8px 0 0", color: "#9ca3af", fontSize: 13 }}>
        {endingMessage ?? status}
      </p>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            width: "min(100%, 560px)",
            margin: "0 auto",
            aspectRatio: "1 / 1",
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.24)",
            background: "#5d4123",
            boxSizing: "border-box",
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
            {Array.from({ length: BOARD_SIZE }).map((_, i) => {
              const p = (i / (BOARD_SIZE - 1)) * 100;
              return (
                <g key={`line-${i}`}>
                  <line x1={0} y1={p} x2={100} y2={p} stroke="rgba(148,163,184,0.35)" strokeWidth={0.35} />
                  <line x1={p} y1={0} x2={p} y2={100} stroke="rgba(148,163,184,0.35)" strokeWidth={0.35} />
                </g>
              );
            })}
          </svg>

          {Array.from({ length: BOARD_SIZE }).flatMap((_, r) =>
            Array.from({ length: BOARD_SIZE }).map((__, c) => {
              const v = board[r][c];
              const left = `${(c / (BOARD_SIZE - 1)) * 100}%`;
              const top = `${(r / (BOARD_SIZE - 1)) * 100}%`;
              const isWin = winning.has(`${r}:${c}`);
              const isLast = lastMove?.r === r && lastMove?.c === c;
              const lastHighlight = lastMove?.who === PLAYER ? "#f59e0b" : "#38bdf8";
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handlePlayerMove({ r, c })}
                  disabled={ended || turn !== "player" || v !== 0}
                  style={{
                    position: "absolute",
                    left,
                    top,
                    width: btnSize,
                    height: btnSize,
                    transform: "translate(-50%, -50%)",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: ended || turn !== "player" || v !== 0 ? "default" : "pointer",
                    touchAction: "manipulation",
                    display: "grid",
                    placeItems: "center",
                  }}
                  aria-label={`Place at row ${r + 1}, col ${c + 1}`}
                >
                  {v !== 0 && (
                    <span
                      style={{
                        width: "72%",
                        height: "72%",
                        borderRadius: 999,
                        background: v === PLAYER ? "#111" : "#f5f5f5",
                        border: isLast ? `2px solid ${lastHighlight}` : v === PLAYER ? "1px solid #2b2b2b" : "1px solid #9ca3af",
                        boxShadow: isWin ? "0 0 0 2px #1B4D3E, 0 0 12px rgba(27,77,62,0.45)" : "0 1px 4px rgba(0,0,0,0.45)",
                      }}
                    />
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>

    </div>
  );
}

