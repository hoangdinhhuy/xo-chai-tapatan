import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XO = require('./logic.js');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const LB_PATH = process.env.LEADERBOARD_PATH || path.join(ROOT, 'leaderboard.json');
const DATA_FILE = LB_PATH;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4'
};

// ---------------------------------------------------------------------------
// Online 1v1: in-memory queue/rooms + leaderboard. Chỉ lưu tên, không tài khoản.
// ---------------------------------------------------------------------------
const tokens = new Map();
const rooms = new Map();
const queue = [];
const leaderboard = new Map();

try {
  const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (Array.isArray(saved)) {
    for (const row of saved) {
      if (row && row.name) leaderboard.set(String(row.name).slice(0, 18), {
        name: String(row.name).slice(0, 18),
        wins: Math.max(0, Number(row.wins) || 0),
        losses: Math.max(0, Number(row.losses) || 0),
        matches: Math.max(0, Number(row.matches) || 0)
      });
    }
  }
} catch { /* chưa có file BXH */ }

function saveLeaderboard() {
  try {
    const rows = [...leaderboard.values()].sort(sortBoard);
    fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2));
  } catch { /* không chặn game nếu ổ đĩa lỗi */ }
}

function sortBoard(a, b) {
  return (b.wins - a.wins) || (a.losses - b.losses) || a.name.localeCompare(b.name);
}

function cleanName(raw) {
  const name = String(raw || '').replace(/[<>{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18);
  return name.length >= 2 ? name : null;
}

function makeToken() {
  return crypto.randomBytes(18).toString('hex');
}

function makeRoomId() {
  return 'r_' + crypto.randomBytes(5).toString('hex');
}

function getToken(token) {
  return tokens.get(String(token || ''));
}

function queueRemove(token) {
  const i = queue.indexOf(token);
  if (i >= 0) queue.splice(i, 1);
}

function recordMatch(room) {
  if (room.recorded || !room.match?.matchWinner) return;
  room.recorded = true;
  const winnerSide = room.match.matchWinner;
  const loserSide = XO.other(winnerSide);
  const winnerName = room.players[winnerSide]?.name;
  const loserName = room.players[loserSide]?.name;
  if (winnerName) {
    const row = leaderboard.get(winnerName) || { name: winnerName, wins: 0, losses: 0, matches: 0 };
    row.wins += 1;
    row.matches += 1;
    leaderboard.set(winnerName, row);
  }
  if (loserName) {
    const row = leaderboard.get(loserName) || { name: loserName, wins: 0, losses: 0, matches: 0 };
    row.losses += 1;
    row.matches += 1;
    leaderboard.set(loserName, row);
  }
  saveLeaderboard();
  room.finishedAt = Date.now();
}

function roomSnapshot(room, token) {
  const player = getToken(token);
  const you = player?.side || 'shinv';
  const opponent = XO.other(you);
  return {
    roomId: room.id,
    status: room.status,
    you,
    names: {
      shinv: room.players.shinv?.name || 'ShinV',
      brb: room.players.brb?.name || 'BRB'
    },
    opponentName: (room.players[opponent] || room.players[you])?.name || 'Đối thủ',
    match: room.match,
    turnEndsAt: room.deadline,
    readyYou: room.ready.has(you),
    readyOpponent: room.ready.has(opponent),
    reason: room.reason || null
  };
}

function setDeadlineForTurn(room) {
  if (room.status !== 'playing' || !room.match) {
    room.deadline = null;
    return;
  }
  room.deadline = XO.currentPhase(room.match) === 'move' ? Date.now() + 3000 : null;
}

function updateRoom(room) {
  if (!room || !room.match) return;
  if (room.status === 'playing' && room.deadline && Date.now() >= room.deadline) {
    const active = room.match.round.turn;
    const result = XO.applyTimeout(room.match, active);
    if (result.ok) {
      room.status = room.match.status;
      room.reason = 'timeout';
      room.deadline = null;
      if (room.match.status === 'matchOver') recordMatch(room);
      room.ready.clear();
    }
  }
  if (room.status === 'playing' && XO.currentPhase(room.match) === 'move' && !room.deadline) {
    room.deadline = Date.now() + 3000;
  }
  if (room.status !== 'playing') room.deadline = null;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 32 * 1024) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('bad_json')); }
    });
    req.on('error', reject);
  });
}

function onlineApi(req, res, url) {
  const action = url.pathname.slice('/api/online/'.length);
  if (req.method === 'GET' && action === 'leaderboard') {
    return json(res, 200, {
      ok: true,
      leaderboard: [...leaderboard.values()].sort(sortBoard).slice(0, 20)
    });
  }

  return readBody(req).then((body) => {
    const token = String(body.token || url.searchParams.get('token') || '');
    const player = getToken(token);

    if (action === 'join') {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
      const name = cleanName(body.name);
      if (!name) return json(res, 400, { ok: false, error: 'Tên cần từ 2 đến 18 ký tự.' });
      const newToken = makeToken();
      tokens.set(newToken, { token: newToken, name, room: null, side: null, queued: false, lastSeen: Date.now() });
      return json(res, 200, { ok: true, token: newToken, name });
    }

    if (!player) return json(res, 401, { ok: false, error: 'Phiên chơi đã hết. Hãy tìm trận lại.' });
    player.lastSeen = Date.now();

    if (action === 'queue') {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
      if (player.queued) {
        return json(res, 200, { ok: true, status: 'waiting', name: player.name });
      }
      // Dọn người đã đóng tab / không còn poll khỏi hàng đợi.
      for (let i = queue.length - 1; i >= 0; i--) {
        const qp = getToken(queue[i]);
        if (!qp || qp.room || Date.now() - (qp.lastSeen || 0) > 30000) {
          if (qp) qp.queued = false;
          queue.splice(i, 1);
        }
      }
      const otherToken = queue.find((q) => q !== token && getToken(q) && !getToken(q).room);
      if (otherToken) {
        queueRemove(otherToken);
        const other = getToken(otherToken);
        player.queued = false;
        other.queued = false;
        const room = {
          id: makeRoomId(),
          players: {
            shinv: { token: otherToken, name: other.name },
            brb: { token, name: player.name }
          },
          match: XO.createMatch('shinv'),
          status: 'playing',
          deadline: null,
          ready: new Set(),
          reason: null,
          recorded: false,
          createdAt: Date.now()
        };
        rooms.set(room.id, room);
        other.room = room.id;
        other.side = 'shinv';
        player.room = room.id;
        player.side = 'brb';
        setDeadlineForTurn(room);
        return json(res, 200, { ok: true, state: roomSnapshot(room, token) });
      }
      player.queued = true;
      queue.push(token);
      return json(res, 200, { ok: true, status: 'waiting', name: player.name });
    }

    if (action === 'state') {
      if (!player.room) return json(res, 200, { ok: true, status: player.queued ? 'waiting' : 'idle' });
      const room = rooms.get(player.room);
      if (!room) return json(res, 200, { ok: true, status: 'ended', reason: 'left' });
      updateRoom(room);
      return json(res, 200, { ok: true, state: roomSnapshot(room, token) });
    }

    if (action === 'action') {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
      if (!player.room) return json(res, 400, { ok: false, error: 'Bạn chưa ở trong trận.' });
      const room = rooms.get(player.room);
      if (!room) return json(res, 400, { ok: false, error: 'Trận đã kết thúc.' });
      updateRoom(room);
      if (room.status !== 'playing') {
        return json(res, 409, { ok: false, error: 'Ván đã kết thúc.', state: roomSnapshot(room, token) });
      }
      if (room.match.round.turn !== player.side) {
        return json(res, 409, { ok: false, error: 'Chưa tới lượt bạn.' });
      }
      const to = Number(body.to);
      const from = body.from === null || body.from === undefined ? null : Number(body.from);
      let result;
      if (from !== null && from !== to) {
        const selected = XO.applyAction(room.match, player.side, from);
        if (!selected.ok) {
          return json(res, 400, { ok: false, error: selected.message, state: roomSnapshot(room, token) });
        }
        result = XO.applyAction(room.match, player.side, to);
      } else {
        result = XO.applyAction(room.match, player.side, to);
      }
      if (!result.ok) {
        return json(res, 400, { ok: false, error: result.message, state: roomSnapshot(room, token) });
      }
      room.status = room.match.status;
      room.reason = room.match.round.winReason;
      setDeadlineForTurn(room);
      if (room.match.status === 'matchOver') {
        room.deadline = null;
        recordMatch(room);
      }
      return json(res, 200, { ok: true, state: roomSnapshot(room, token) });
    }

    if (action === 'ready') {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
      if (!player.room) return json(res, 400, { ok: false, error: 'Bạn chưa ở trong trận.' });
      const room = rooms.get(player.room);
      if (!room) return json(res, 400, { ok: false, error: 'Trận đã kết thúc.' });
      updateRoom(room);
      if (room.status === 'roundOver') {
        room.ready.add(player.side);
        if (room.ready.size >= 2) {
          room.ready.clear();
          const next = XO.nextRound(room.match);
          if (next.ok) {
            room.status = 'playing';
            room.reason = null;
            setDeadlineForTurn(room);
          }
        }
      }
      return json(res, 200, { ok: true, state: roomSnapshot(room, token) });
    }

    if (action === 'leave') {
      player.queued = false;
      queueRemove(token);
      if (player.room) {
        const room = rooms.get(player.room);
        if (room) {
          const otherSide = XO.other(player.side);
          const otherToken = room.players[otherSide]?.token;
          if (otherToken && getToken(otherToken)) {
            const other = getToken(otherToken);
            other.room = null;
            other.side = null;
            other.queued = false;
          }
          rooms.delete(room.id);
        }
      }
      player.room = null;
      player.side = null;
      tokens.delete(token);
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { ok: false, error: 'API không tồn tại.' });
  }).catch((err) => {
    json(res, 400, { ok: false, error: err.message === 'bad_json' ? 'JSON không hợp lệ.' : 'Yêu cầu không hợp lệ.' });
  });
}

// ---------------------------------------------------------------------------
// Static files
// ---------------------------------------------------------------------------
function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  const rel = decoded === '/' ? '/index.html' : decoded;
  const full = path.resolve(ROOT, '.' + rel);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) return null;
  return full;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/online/')) {
    onlineApi(req, res, url);
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  let file = safePath(req.url || '/');
  if (!file) {
    res.writeHead(400);
    res.end('Bad path');
    return;
  }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('not a file');
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Không tìm thấy file. Chạy npm start tại thư mục game.');
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`[XO CHAI] Cổng ${PORT} đã bị chiếm — có server khác đang chạy (thường là lần npm start trước).`);
    console.error('Cách xử lý:');
    console.error(`  1) Tắt server đang chiếm cổng:`);
    console.error(`     Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
    console.error('  2) Hoặc chạy ở cổng khác:');
    console.error('     $env:PORT = 4174; npm start');
    console.error(`  3) Hoặc chỉ cần mở http://127.0.0.1:${PORT} — server cũ vẫn đang phục vụ game.`);
    console.error('');
    process.exit(1);
  }
  if (err && err.code === 'EACCES') {
    console.error(`[XO CHAI] Không có quyền mở cổng ${PORT}. Thử cổng khác: $env:PORT = 4174; npm start`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`XO CHAI đang chạy tại http://${HOST}:${PORT}`);
  console.log('Nhấn Ctrl+C để tắt server.');
});
