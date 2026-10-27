/* XO CHAI — luật Tapatan (Ấn Độ) cho bàn 3×3.
   Thuần logic, không phụ thuộc DOM/canvas. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XO = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PLAYERS = ['shinv', 'brb'];
  const META = {
    shinv: {
      id: 'shinv', name: 'ShinV', short: 'SHINV',
      color: '#e45a35', bright: '#ff9a63', dark: '#8d2a19',
      bottle: 'cam', jersey: 'áo đỏ Manchester United'
    },
    brb: {
      id: 'brb', name: 'BRB', short: 'BRB',
      color: '#c9a44e', bright: '#f3d98b', dark: '#7d6432',
      bottle: 'đen', jersey: 'áo Real Madrid trắng'
    }
  };

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // 8 hướng kề: ngang, dọc, chéo. Không nhảy cóc.
  const NEIGHBORS = (() => {
    const out = Array.from({ length: 9 }, () => []);
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) out[i].push(nr * 3 + nc);
        }
      }
    }
    return out;
  })();

  const other = (p) => (p === 'shinv' ? 'brb' : 'shinv');

  function createRound(startPlayer = 'shinv') {
    return {
      board: Array(9).fill(null),
      turn: startPlayer,
      startPlayer,
      selected: null,
      winner: null,
      winLine: null,
      winReason: null,
      draw: false,
      moves: 0,
      placed: { shinv: 0, brb: 0 },
      lastMoves: { shinv: null, brb: null },
      lastAction: null,
      stalemate: false,
      timeout: false,
      repeatLoss: false
    };
  }

  function createMatch(startPlayer = 'shinv') {
    return {
      bestOf: 3,
      wins: { shinv: 0, brb: 0 },
      roundNo: 1,
      startPlayer,
      round: createRound(startPlayer),
      roundHistory: [],
      draws: 0,
      status: 'playing',
      matchWinner: null
    };
  }

  function countOnBoard(round, player) {
    return round.board.reduce((n, cell) => n + (cell === player ? 1 : 0), 0);
  }

  function phaseFor(round, player) {
    return countOnBoard(round, player) >= 3 ? 'move' : 'place';
  }

  function currentPhase(match) {
    return phaseFor(match.round, match.round.turn);
  }

  function bothPlaced(round) {
    return countOnBoard(round, 'shinv') >= 3 && countOnBoard(round, 'brb') >= 3;
  }

  function findWin(board, player) {
    for (const line of LINES) {
      if (line.every((i) => board[i] === player)) return line.slice();
    }
    return null;
  }

  function emptyCells(round) {
    const out = [];
    round.board.forEach((v, i) => { if (v === null) out.push(i); });
    return out;
  }

  function ownCells(round, player) {
    const out = [];
    round.board.forEach((v, i) => { if (v === player) out.push(i); });
    return out;
  }

  function adjacentCells(index) {
    return NEIGHBORS[index].slice();
  }

  function isAdjacent(from, to) {
    return NEIGHBORS[from] && NEIGHBORS[from].includes(to);
  }

  /** Tất cả nước đi hợp lệ ở giai đoạn di chuyển. */
  function legalMoves(round, player) {
    if (!bothPlaced(round)) return [];
    const out = [];
    for (const from of ownCells(round, player)) {
      for (const to of NEIGHBORS[from]) {
        if (round.board[to] === null) out.push({ from, to });
      }
    }
    return out;
  }

  function finishRound(match, player, line, reason) {
    const round = match.round;
    round.winner = player;
    round.winLine = line ? line.slice() : null;
    round.winReason = reason;
    match.wins[player] += 1;
    match.roundHistory.push({
      roundNo: match.roundNo,
      winner: player,
      line: line ? line.slice() : null,
      reason,
      moves: round.moves,
      startPlayer: round.startPlayer
    });
    if (match.wins[player] >= 2) {
      match.status = 'matchOver';
      match.matchWinner = player;
    } else {
      match.status = 'roundOver';
    }
  }

  function checkStalemate(match, player) {
    const round = match.round;
    if (!bothPlaced(round)) return false;
    const moves = legalMoves(round, player);
    if (moves.length > 0) return false;
    round.stalemate = true;
    finishRound(match, other(player), null, 'stalemate');
    return true;
  }

  function moveIsRepeat(round, player, from, to) {
    const prev = round.lastMoves[player];
    if (prev && prev.from === to && prev.to === from) {
      return (prev.repeat || 0) + 1;
    }
    return 0;
  }

  /**
   * Người chơi chọn một ô.
   * - Chưa đủ 3 chai: đặt chai vào ô trống.
   * - Đã đủ 3 chai: chọn chai của mình, rồi đặt sang ô trống KỀ CẬN.
   * Trả về object mô tả kết quả để UI phát animation/log.
   */
  function applyAction(match, player, cell) {
    if (!match || match.status === 'matchOver') {
      return { ok: false, reason: 'match_over', message: 'Trận đã kết thúc.' };
    }
    if (match.status !== 'playing' || match.round.winner) {
      return { ok: false, reason: 'round_over', message: 'Ván này đã có kết quả.' };
    }
    const round = match.round;
    if (player !== round.turn) {
      return { ok: false, reason: 'not_turn', message: 'Chưa tới lượt.' };
    }
    if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
      return { ok: false, reason: 'invalid_cell', message: 'Ô không hợp lệ.' };
    }

    const phase = phaseFor(round, player);
    const occupant = round.board[cell];

    if (phase === 'place') {
      if (occupant !== null) {
        return {
          ok: false,
          reason: 'occupied',
          message: occupant === player
            ? 'Chai của bạn đã ở đó. Chọn ô trống.'
            : 'Ô này có chai của đối thủ.'
        };
      }
      round.board[cell] = player;
      round.placed[player] += 1;
      round.moves += 1;
      round.selected = null;
      const line = findWin(round.board, player);
      const result = {
        ok: true, type: 'place', player, to: cell, from: null,
        line, wins: false, stalemate: false, timeout: false, repeatLoss: false
      };
      if (line) {
        finishRound(match, player, line, 'line');
        result.wins = true;
        result.matchOver = match.status === 'matchOver';
        result.matchWinner = match.matchWinner;
      } else {
        round.turn = other(player);
        if (checkStalemate(match, round.turn)) {
          result.stalemate = true;
          result.winner = round.winner;
          result.matchOver = match.status === 'matchOver';
        }
        if (match.status === 'playing' && currentPhase(match) === 'move') {
          round.lastMoves[round.turn] = null; // bắt đầu đếm lặp cho người mới
        }
      }
      round.lastAction = result;
      return result;
    }

    // Giai đoạn di chuyển: bắt buộc nhấc một chai của mình.
    if (round.selected === null) {
      if (occupant === player) {
        round.selected = cell;
        const result = { ok: true, type: 'select', player, from: cell, to: null, adjacent: adjacentCells(cell) };
        round.lastAction = result;
        return result;
      }
      return {
        ok: false,
        reason: 'must_move',
        message: 'Bạn đã đủ 3 chai. Chọn một chai của mình để nhấc lên.'
      };
    }

    if (cell === round.selected) {
      round.selected = null;
      const result = { ok: true, type: 'deselect', player, from: cell, to: null };
      round.lastAction = result;
      return result;
    }
    if (occupant === player) {
      round.selected = cell;
      const result = { ok: true, type: 'select', player, from: cell, to: null, adjacent: adjacentCells(cell) };
      round.lastAction = result;
      return result;
    }
    if (occupant !== null) {
      return { ok: false, reason: 'occupied', message: 'Chỉ được đặt chai vào ô trống.' };
    }
    const from = round.selected;
    if (!isAdjacent(from, cell)) {
      return {
        ok: false,
        reason: 'not_adjacent',
        message: 'Tapatan chỉ cho phép di chuyển sang ô kề cạnh (ngang, dọc hoặc chéo).'
      };
    }

    const repeat = moveIsRepeat(round, player, from, cell);
    round.lastMoves[player] = { from, to: cell, repeat };
    round.board[from] = null;
    round.board[cell] = player;
    round.selected = null;
    round.moves += 1;
    const result = {
      ok: true, type: 'move', player, from, to: cell,
      line: null, wins: false, stalemate: false, timeout: false, repeatLoss: false
    };

    // Luật lặp nước: quá 3 lần đảo qua lại giữa cùng 2 ô => thua.
    if (repeat > 3) {
      round.repeatLoss = true;
      finishRound(match, other(player), null, 'repeat');
      result.repeatLoss = true;
      result.matchOver = match.status === 'matchOver';
      result.matchWinner = match.matchWinner;
      round.lastAction = result;
      return result;
    }

    const line = findWin(round.board, player);
    if (line) {
      result.line = line;
      result.wins = true;
      finishRound(match, player, line, 'line');
      result.matchOver = match.status === 'matchOver';
      result.matchWinner = match.matchWinner;
      round.lastAction = result;
      return result;
    }

    round.turn = other(player);
    if (checkStalemate(match, round.turn)) {
      result.stalemate = true;
      result.winner = round.winner;
      result.matchOver = match.status === 'matchOver';
    }
    round.lastAction = result;
    return result;
  }

  /** Hết 3 giây ở lượt di chuyển => thua ván. */
  function applyTimeout(match, player) {
    if (!match || match.status !== 'playing' || match.round.winner) {
      return { ok: false, reason: 'not_playing' };
    }
    if (match.round.turn !== player) {
      return { ok: false, reason: 'not_turn' };
    }
    if (!bothPlaced(match.round) || phaseFor(match.round, player) !== 'move') {
      return { ok: false, reason: 'not_move_phase' };
    }
    const round = match.round;
    round.timeout = true;
    finishRound(match, other(player), null, 'timeout');
    const result = {
      ok: true,
      type: 'timeout',
      player,
      winner: round.winner,
      timeout: true,
      matchOver: match.status === 'matchOver',
      matchWinner: match.matchWinner
    };
    round.lastAction = result;
    return result;
  }

  function nextRound(match) {
    if (!match || match.status === 'matchOver') {
      return { ok: false, reason: 'match_over' };
    }
    if (match.status !== 'roundOver') {
      return { ok: false, reason: 'round_not_over' };
    }
    match.roundNo += 1;
    const nextStarter = other(match.round.startPlayer);
    match.startPlayer = nextStarter;
    match.round = createRound(nextStarter);
    match.status = 'playing';
    return { ok: true, roundNo: match.roundNo, startPlayer: nextStarter };
  }

  function resetMatch(startPlayer = 'shinv') {
    return createMatch(startPlayer);
  }

  function getState(match) {
    if (!match) return null;
    return {
      roundNo: match.roundNo,
      wins: { ...match.wins },
      turn: match.round.turn,
      phase: phaseFor(match.round, match.round.turn),
      selected: match.round.selected,
      board: match.round.board.slice(),
      status: match.status,
      matchWinner: match.matchWinner,
      moves: match.round.moves,
      placed: { ...match.round.placed },
      empty: emptyCells(match.round),
      startPlayer: match.round.startPlayer,
      winner: match.round.winner,
      winLine: match.round.winLine ? match.round.winLine.slice() : null,
      winReason: match.round.winReason,
      stalemate: match.round.stalemate,
      timeout: match.round.timeout,
      repeatLoss: match.round.repeatLoss
    };
  }

  return {
    PLAYERS,
    META,
    LINES,
    NEIGHBORS,
    other,
    createRound,
    createMatch,
    resetMatch,
    countOnBoard,
    bothPlaced,
    phaseFor,
    currentPhase,
    findWin,
    emptyCells,
    ownCells,
    adjacentCells,
    isAdjacent,
    legalMoves,
    checkStalemate,
    applyAction,
    applyTimeout,
    nextRound,
    getState
  };
});
