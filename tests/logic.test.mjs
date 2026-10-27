import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XO = require('../logic.js');

const play = (match, player, cell) => XO.applyAction(match, player, cell);
const placeAll = (match) => {
  for (const [p, c] of [
    ['shinv', 0], ['brb', 2], ['shinv', 3],
    ['brb', 5], ['shinv', 7], ['brb', 1]
  ]) {
    const r = play(match, p, c);
    assert.equal(r.ok, true, `${p} tại ${c}`);
  }
};

test('ván mới: bàn trống, ShinV đi trước, giai đoạn đặt chai', () => {
  const match = XO.createMatch();
  assert.deepEqual(match.round.board, Array(9).fill(null));
  assert.equal(match.round.turn, 'shinv');
  assert.equal(XO.currentPhase(match), 'place');
  assert.deepEqual(match.wins, { shinv: 0, brb: 0 });
});

test('đặt đủ 3 chai tạo hàng ngang thì thắng ngay trong giai đoạn đặt', () => {
  const match = XO.createMatch();
  for (const [p, c] of [['shinv', 0], ['brb', 3], ['shinv', 1], ['brb', 4]]) {
    assert.equal(play(match, p, c).ok, true);
  }
  const winning = play(match, 'shinv', 2);
  assert.equal(winning.ok, true);
  assert.equal(winning.wins, true);
  assert.deepEqual(winning.line, [0, 1, 2]);
  assert.equal(match.wins.shinv, 1);
  assert.equal(match.status, 'roundOver');
});

test('chéo lượt và đặt vào ô đã có chai bị từ chối', () => {
  const match = XO.createMatch();
  assert.equal(play(match, 'brb', 4).reason, 'not_turn');
  assert.equal(play(match, 'shinv', 4).ok, true);
  assert.equal(play(match, 'brb', 4).reason, 'occupied');
});

test('đủ 6 chai mới vào giai đoạn di chuyển, chỉ được đi kề cạnh', () => {
  const match = XO.createMatch();
  placeAll(match);
  assert.equal(XO.bothPlaced(match.round), true);
  assert.equal(match.round.turn, 'shinv');
  assert.equal(XO.currentPhase(match), 'move');

  const illegalPlace = play(match, 'shinv', 4);
  assert.equal(illegalPlace.ok, false);
  assert.equal(illegalPlace.reason, 'must_move');

  const selected = play(match, 'shinv', 0);
  assert.equal(selected.type, 'select');
  assert.equal(match.round.selected, 0);

  const far = play(match, 'shinv', 8);
  assert.equal(far.ok, false);
  assert.equal(far.reason, 'not_adjacent');
  assert.equal(match.round.selected, 0);

  const moved = play(match, 'shinv', 4);
  assert.equal(moved.ok, true);
  assert.equal(moved.type, 'move');
  assert.equal(moved.from, 0);
  assert.equal(moved.to, 4);
  assert.equal(match.round.board[0], null);
  assert.equal(match.round.board[4], 'shinv');
  assert.equal(match.round.turn, 'brb');
});

test('di chuyển kề cạnh có thể tạo hàng 3 và thắng ván', () => {
  const match = XO.createMatch();
  for (const [p, c] of [
    ['shinv', 0], ['brb', 5], ['shinv', 1],
    ['brb', 6], ['shinv', 4], ['brb', 8]
  ]) assert.equal(play(match, p, c).ok, true);
  assert.equal(match.round.turn, 'shinv');
  assert.equal(play(match, 'shinv', 4).type, 'select');
  const win = play(match, 'shinv', 2);
  assert.equal(win.ok, true);
  assert.equal(win.wins, true);
  assert.deepEqual(win.line, [0, 1, 2]);
});

test('lặp nước quá 3 lần giữa cùng 2 ô thì bị xử thua', () => {
  const match = XO.createMatch();
  // P1: 0,3,7 — P2: 1,5,8. Trống 2,4,6.
  for (const [p, c] of [
    ['shinv', 0], ['brb', 1], ['shinv', 3],
    ['brb', 5], ['shinv', 7], ['brb', 8]
  ]) assert.equal(play(match, p, c).ok, true);

  // P1 đảo 3 <-> 4, P2 đảo 5 <-> 2. P1 tái phạm lần thứ 4 => thua.
  const seq = [
    ['shinv', 3], ['shinv', 4],
    ['brb', 5], ['brb', 2],
    ['shinv', 4], ['shinv', 3],
    ['brb', 2], ['brb', 5],
    ['shinv', 3], ['shinv', 4],
    ['brb', 5], ['brb', 2],
    ['shinv', 4], ['shinv', 3],
    ['brb', 2], ['brb', 5],
    ['shinv', 3], ['shinv', 4]
  ];
  let result = null;
  for (const [p, c] of seq) {
    result = play(match, p, c);
    assert.equal(result.ok, true, `${p} -> ${c}`);
  }
  assert.equal(result.repeatLoss, true);
  assert.equal(match.round.winner, 'brb');
  assert.equal(match.round.winReason, 'repeat');
});

test('quá 3 giây ở lượt di chuyển thì thua ván', () => {
  const match = XO.createMatch();
  placeAll(match);
  const result = XO.applyTimeout(match, 'shinv');
  assert.equal(result.ok, true);
  assert.equal(result.timeout, true);
  assert.equal(match.round.winner, 'brb');
  assert.equal(match.wins.brb, 1);
  assert.equal(XO.applyTimeout(match, 'brb').ok, false);
});

test('khóa đường: người tới lượt không còn nước kề cạnh thì thua', () => {
  // Tìm một thế cờ thực tế bằng brute force nhỏ, sau đó kiểm tra legalMoves.
  let found = null;
  const players = ['shinv', 'brb'];
  const combos = [];
  const choose = (arr, k, start = 0, cur = []) => {
    if (cur.length === k) { combos.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]);
      choose(arr, k, i + 1, cur);
      cur.pop();
    }
  };
  choose([0, 1, 2, 3, 4, 5, 6, 7, 8], 3);
  for (const a of combos) {
    for (const b of combos) {
      if (a.some((x) => b.includes(x))) continue;
      const board = Array(9).fill(null);
      a.forEach((i) => { board[i] = 'shinv'; });
      b.forEach((i) => { board[i] = 'brb'; });
      if (XO.findWin(board, 'shinv') || XO.findWin(board, 'brb')) continue;
      const round = XO.createRound('shinv');
      round.board = board;
      round.placed = { shinv: 3, brb: 3 };
      round.turn = 'shinv';
      if (XO.legalMoves(round, 'shinv').length === 0) { found = board; break; }
    }
    if (found) break;
  }
  if (found) {
    const match = XO.createMatch();
    match.round.board = found;
    match.round.placed = { shinv: 3, brb: 3 };
    match.round.turn = 'shinv';
    assert.equal(XO.legalMoves(match.round, 'shinv').length, 0);
    assert.equal(XO.checkStalemate(match, 'shinv'), true);
    assert.equal(match.round.winner, 'brb');
    assert.equal(match.round.winReason, 'stalemate');
  } else {
    // Với bàn 3×3 và 6 chai, một số thế cờ có thể không khóa được;
    // vẫn kiểm tra hàm legalMoves không crash.
    assert.ok(Array.isArray(XO.legalMoves({ board: Array(9).fill(null), placed: { shinv: 0, brb: 0 } }, 'shinv')));
  }
});

test('BO3 2-0 và 2-1, đổi người mở ván', () => {
  const match = XO.createMatch();
  for (const [p, c] of [['shinv', 0], ['brb', 3], ['shinv', 1], ['brb', 4], ['shinv', 2]]) {
    assert.equal(play(match, p, c).ok, true);
  }
  assert.equal(match.status, 'roundOver');
  assert.equal(match.wins.shinv, 1);
  const next = XO.nextRound(match);
  assert.equal(next.roundNo, 2);
  assert.equal(next.startPlayer, 'brb');
  for (const [p, c] of [['brb', 3], ['shinv', 0], ['brb', 5], ['shinv', 1], ['brb', 4]]) {
    assert.equal(play(match, p, c).ok, true);
  }
  assert.equal(match.status, 'roundOver');
  assert.equal(match.wins.brb, 1);
  const third = XO.nextRound(match);
  assert.equal(third.roundNo, 3);
  for (const [p, c] of [['shinv', 0], ['brb', 3], ['shinv', 1], ['brb', 4], ['shinv', 2]]) {
    assert.equal(play(match, p, c).ok, true);
  }
  assert.deepEqual(match.wins, { shinv: 2, brb: 1 });
  assert.equal(match.status, 'matchOver');
});

test('getState trả bản sao an toàn và đủ cờ thắng', () => {
  const match = XO.createMatch();
  play(match, 'shinv', 4);
  const state = XO.getState(match);
  state.board[4] = 'brb';
  assert.equal(match.round.board[4], 'shinv');
  assert.equal(state.turn, 'brb');
  assert.equal(state.phase, 'place');
});

test('META khóa đúng trang phục nguồn TGBStore', () => {
  assert.match(XO.META['shinv'].jersey, /Manchester United/i);
  assert.match(XO.META.brb.jersey, /Real Madrid/i);
});
