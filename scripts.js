/*
 * Minimal NES/GB-style Tetris scaffold focused on Issue #3:
 * - line clear detection (1–4 lines)
 * - NES scoring (40/100/300/1200 * (level + 1))
 *
 * NOTE: Levels/speed progression are intentionally not implemented (Issue #4).
 */

(() => {
  const COLS = 10;
  const ROWS = 20;
  const CELL = 24;

  // Keep level fixed at 0 until Issue #4 lands.
  const FIXED_LEVEL = 0;

  // NES scoring table (lines cleared at once => points).
  const NES_LINE_SCORES = {
    1: 40,
    2: 100,
    3: 300,
    4: 1200,
  };

  const COLORS = {
    I: "#5ad7ff",
    O: "#ffe45a",
    T: "#c77dff",
    S: "#58f28a",
    Z: "#ff5a6b",
    J: "#6ea8ff",
    L: "#ff9f5a",
  };

  // 4x4-ish matrices; rotations are precomputed for simplicity.
  const TETROMINOES = {
    I: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
    O: [
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    T: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
    S: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 0, 0],
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
    Z: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
    ],
    J: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
    L: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
  };

  const PIECE_KEYS = Object.keys(TETROMINOES);

  /** @returns {{key: string, rotation: number, x: number, y: number}} */
  function randomPiece() {
    const key = PIECE_KEYS[(Math.random() * PIECE_KEYS.length) | 0];
    const rotation = 0;
    const matrix = TETROMINOES[key][rotation];
    const width = matrix[0].length;
    const x = ((COLS - width) / 2) | 0;
    const y = -1; // spawn slightly above the visible playfield
    return { key, rotation, x, y };
  }

  function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function forEachFilledCell(matrix, fn) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) fn(r, c);
      }
    }
  }

  function collides(board, piece) {
    const matrix = TETROMINOES[piece.key][piece.rotation];
    let hit = false;
    forEachFilledCell(matrix, (r, c) => {
      const x = piece.x + c;
      const y = piece.y + r;

      if (x < 0 || x >= COLS || y >= ROWS) {
        hit = true;
        return;
      }

      if (y >= 0 && board[y][x]) {
        hit = true;
      }
    });
    return hit;
  }

  function mergePiece(board, piece) {
    const matrix = TETROMINOES[piece.key][piece.rotation];
    forEachFilledCell(matrix, (r, c) => {
      const x = piece.x + c;
      const y = piece.y + r;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        board[y][x] = piece.key;
      }
    });
  }

  /**
   * Detects and clears completed lines.
   * @returns {number} number of cleared lines (0-4)
   */
  function clearCompletedLines(board) {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      const isFull = board[y].every((cell) => cell !== 0);
      if (isFull) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        cleared++;
        y++; // recheck current index after splice/unshift
      }
    }
    return cleared;
  }

  function scoreForLines(lines, level) {
    if (!lines) return 0;
    const base = NES_LINE_SCORES[lines] || 0;
    return base * (level + 1);
  }

  function draw(ctx, board, piece) {
    ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);

    // Grid background
    ctx.fillStyle = "#06080d";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Settled blocks
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const key = board[y][x];
        if (key) {
          drawCell(ctx, x, y, COLORS[key]);
        }
      }
    }

    // Active piece
    const matrix = TETROMINOES[piece.key][piece.rotation];
    forEachFilledCell(matrix, (r, c) => {
      const x = piece.x + c;
      const y = piece.y + r;
      if (y >= 0) drawCell(ctx, x, y, COLORS[piece.key]);
    });

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(COLS * CELL, y * CELL + 0.5);
      ctx.stroke();
    }
  }

  function drawCell(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);

    // simple highlight/shadow for a chunky NES-ish look
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(x * CELL + 1.5, y * CELL + CELL - 2.5);
    ctx.lineTo(x * CELL + 1.5, y * CELL + 1.5);
    ctx.lineTo(x * CELL + CELL - 2.5, y * CELL + 1.5);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.moveTo(x * CELL + CELL - 2.5, y * CELL + 1.5);
    ctx.lineTo(x * CELL + CELL - 2.5, y * CELL + CELL - 2.5);
    ctx.lineTo(x * CELL + 1.5, y * CELL + CELL - 2.5);
    ctx.stroke();
  }

  function main() {
    const canvas = document.getElementById("game");
    const scoreEl = document.getElementById("score");

    if (!(canvas instanceof HTMLCanvasElement) || !scoreEl) {
      // eslint-disable-next-line no-console
      console.error("Missing required DOM elements");
      return;
    }

    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let board = createEmptyBoard();
    let piece = randomPiece();
    let score = 0;

    function updateScoreDisplay() {
      scoreEl.textContent = String(score);
    }

    function reset() {
      board = createEmptyBoard();
      piece = randomPiece();
      score = 0;
      updateScoreDisplay();
    }

    function spawnNextPiece() {
      piece = randomPiece();
      if (collides(board, piece)) {
        // Game over: reset for now (persistence/over screen out of scope).
        reset();
      }
    }

    function lockAndClear() {
      mergePiece(board, piece);
      const cleared = clearCompletedLines(board);
      if (cleared) {
        score += scoreForLines(cleared, FIXED_LEVEL);
        updateScoreDisplay();
      }
      spawnNextPiece();
    }

    function move(dx) {
      const next = { ...piece, x: piece.x + dx };
      if (!collides(board, next)) piece = next;
    }

    function rotate() {
      const nextRotation = (piece.rotation + 1) % TETROMINOES[piece.key].length;
      const candidate = { ...piece, rotation: nextRotation };

      // Simple wall kicks: try no shift, then +/-1, +/-2
      const kicks = [0, 1, -1, 2, -2];
      for (const k of kicks) {
        const kicked = { ...candidate, x: candidate.x + k };
        if (!collides(board, kicked)) {
          piece = kicked;
          return;
        }
      }
    }

    function softDrop() {
      const next = { ...piece, y: piece.y + 1 };
      if (!collides(board, next)) {
        piece = next;
      } else {
        lockAndClear();
      }
    }

    function hardDrop() {
      let next = { ...piece };
      while (!collides(board, { ...next, y: next.y + 1 })) {
        next = { ...next, y: next.y + 1 };
      }
      piece = next;
      lockAndClear();
    }

    // Fixed gravity speed (Issue #4 will handle levels/speed).
    let lastTick = performance.now();
    const gravityMs = 650;

    function loop(now) {
      if (now - lastTick >= gravityMs) {
        softDrop();
        lastTick = now;
      }

      draw(ctx, board, piece);
      requestAnimationFrame(loop);
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        rotate();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        softDrop();
      } else if (e.key === " ") {
        e.preventDefault();
        hardDrop();
      } else if (e.key === "Enter") {
        e.preventDefault();
        reset();
      }
    });

    updateScoreDisplay();
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
