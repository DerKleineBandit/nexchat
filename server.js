// ─────────────────────────────────────────────
//  NexChat WebSocket Server
//  npm install ws
//  node server.js
// ─────────────────────────────────────────────
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;

// ── State ──────────────────────────────────────
const clients = new Map();   // ws -> { id, name, role, color }
const channels = [
  { id: 'allgemein', name: 'allgemein', topic: 'Allgemeiner Chat', color: '#00e5ff' },
  { id: 'off-topic',  name: 'off-topic',  topic: 'Spaß & Quatsch',   color: '#ff6b35' },
  { id: 'dateien',    name: 'dateien',    topic: 'Datei-Austausch',   color: '#00ff88' },
];
const messageHistory = {};   // channelId -> last 100 msgs
const uploadRequests = {};   // requestId -> { ...req, ws }
const storedFiles    = {};   // fileId -> { name, size, type, data }

channels.forEach(c => messageHistory[c.id] = []);

// ── HTTP server (serves index.html) ───────────
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404); res.end('index.html not found');
    }
  } else {
    res.writeHead(404); res.end();
  }
});

// ── WebSocket server ───────────────────────────
const wss = new WebSocketServer({ server });

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function broadcast(data, excludeWs = null) {
  const str = JSON.stringify(data);
  wss.clients.forEach(ws => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
    }
  });
}

function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function sendToUser(name, data) {
  for (const [ws, info] of clients) {
    if (info.name === name) { sendTo(ws, data); break; }
  }
}

function getOnlineUsers() {
  return [...clients.values()].map(c => ({ name: c.name, role: c.role, color: c.color }));
}

function isHostOnline() {
  return [...clients.values()].some(c => c.role === 'host');
}

wss.on('connection', (ws) => {
  const clientId = uid();
  console.log(`[+] Client connected: ${clientId}`);

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    const info = clients.get(ws);

    switch (data.type) {

      // ── JOIN ──────────────────────────────────
      case 'join': {
        const color = data.color || '#00e5ff';
        // If no host online yet and role is host, allow; else if host exists, force client
        const role = (!isHostOnline() && data.role === 'host') ? 'host' : data.role;
        clients.set(ws, { id: clientId, name: data.name, role, color });
        console.log(`[JOIN] ${data.name} as ${role}`);

        // Send welcome package
        sendTo(ws, {
          type: 'welcome',
          yourRole: role,
          channels,
          onlineUsers: getOnlineUsers(),
          history: messageHistory
        });

        // Notify others
        broadcast({ type: 'user-joined', name: data.name, role, color, onlineUsers: getOnlineUsers() }, ws);
        break;
      }

      // ── MESSAGE ───────────────────────────────
      case 'message': {
        if (!info) break;
        const msg = {
          type: 'message',
          id: uid(),
          author: info.name,
          color: info.color,
          channel: data.channel,
          text: data.text,
          time: Date.now(),
          isAtAll: !!data.isAtAll,
          mentionedUsers: data.mentionedUsers || []
        };
        // store history
        if (!messageHistory[data.channel]) messageHistory[data.channel] = [];
        messageHistory[data.channel].push(msg);
        if (messageHistory[data.channel].length > 100) messageHistory[data.channel].shift();

        broadcast(msg); // send to ALL including sender (for confirmation)
        break;
      }

      // ── TYPING ───────────────────────────────
      case 'typing': {
        if (!info) break;
        broadcast({ type: 'typing', user: info.name, color: info.color, channel: data.channel, text: data.text }, ws);
        break;
      }

      case 'stopTyping': {
        if (!info) break;
        broadcast({ type: 'stopTyping', user: info.name, channel: data.channel }, ws);
        break;
      }

      // ── CHANNEL ADD ───────────────────────────
      case 'channel-add': {
        if (!info) break;
        const ch = data.channel;
        if (!channels.find(c => c.id === ch.id)) {
          channels.push(ch);
          messageHistory[ch.id] = [];
          broadcast({ type: 'channel-add', channel: ch });
        }
        break;
      }

      // ── FILE REQUEST ─────────────────────────
      case 'file-request': {
        if (!info) break;
        uploadRequests[data.requestId] = { ...data, requester: info.name, ws };
        // forward to host(s)
        for (const [hostWs, hostInfo] of clients) {
          if (hostInfo.role === 'host') {
            sendTo(hostWs, {
              type: 'file-request',
              requestId: data.requestId,
              fileId: data.fileId,
              filename: data.filename,
              fileSize: data.fileSize,
              filetype: data.filetype,
              channel: data.channel,
              requester: info.name
            });
          }
        }
        break;
      }

      // ── FILE APPROVE ─────────────────────────
      case 'file-approve': {
        if (!info || info.role !== 'host') break;
        const req = uploadRequests[data.requestId];
        if (!req) break;
        sendTo(req.ws, { type: 'file-approved', requestId: data.requestId, filename: req.filename });
        break;
      }

      // ── FILE DENY ────────────────────────────
      case 'file-deny': {
        if (!info || info.role !== 'host') break;
        const req2 = uploadRequests[data.requestId];
        if (!req2) break;
        sendTo(req2.ws, { type: 'file-denied', requestId: data.requestId, filename: req2.filename });
        delete uploadRequests[data.requestId];
        break;
      }

      // ── FILE DATA ────────────────────────────
      case 'file-data': {
        if (!info) break;
        // Store on server
        storedFiles[data.fileId] = {
          name: data.filename,
          size: data.size,
          type: data.filetype,
          data: data.data   // base64 dataURL
        };
        delete uploadRequests[data.requestId];

        // Broadcast file metadata + data to all
        const fileMsg = {
          type: 'file-message',
          id: uid(),
          author: info.name,
          color: info.color,
          channel: data.channel,
          fileId: data.fileId,
          filename: data.filename,
          fileSize: data.size,
          time: Date.now()
        };
        if (!messageHistory[data.channel]) messageHistory[data.channel] = [];
        messageHistory[data.channel].push(fileMsg);

        // send metadata to all
        broadcast(fileMsg);
        // send actual data to all others so they can download
        broadcast({ type: 'file-data', fileId: data.fileId, filename: data.filename, size: data.size, filetype: data.filetype, data: data.data });
        break;
      }
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info) {
      console.log(`[-] ${info.name} disconnected`);
      clients.delete(ws);
      broadcast({ type: 'user-left', name: info.name, onlineUsers: getOnlineUsers() });
    }
  });

  ws.on('error', (err) => console.error('WS error:', err.message));
});

server.listen(PORT, '0.0.0.0', () => {
  const ifaces = require('os').networkInterfaces();
  let lan = 'unbekannt';
  Object.values(ifaces).flat().forEach(i => {
    if (i.family === 'IPv4' && !i.internal) lan = i.address;
  });
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║       NexChat Server läuft! 🚀            ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Lokal:    http://localhost:${PORT}           ║`);
  console.log(`║  LAN:      http://${lan}:${PORT}     ║`);
  console.log('╚══════════════════════════════════════════╝\n');
});
