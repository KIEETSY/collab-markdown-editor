const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { getDocument, createDocument, updateDocument } = require('./db');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// Max lengths for validation
const MAX_DOC_ID_LENGTH = 64;
const MAX_DISPLAY_NAME_LENGTH = 40;
const MAX_CONTENT_LENGTH = 500_000; // 500 KB

// Rate-limit: max events per window per socket
const RATE_LIMIT_WINDOW_MS = 5_000;
const RATE_LIMIT_MAX_EVENTS = 60;

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

// ── HTTP routes ───────────────────────────────────────────────────────────────

// Create a new document and return its id
app.post('/api/docs', (req, res) => {
  const id = uuidv4();
  const doc = createDocument(id);
  res.status(201).json({ id: doc.id });
});

// Get document by id (creates it if it doesn't exist)
app.get('/api/docs/:id', (req, res) => {
  const { id } = req.params;
  if (!isValidDocId(id)) {
    return res.status(400).json({ error: 'Invalid document id' });
  }
  let doc = getDocument(id);
  if (!doc) {
    doc = createDocument(id);
  }
  res.json({ id: doc.id, content: doc.content });
});

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── In-memory session store ───────────────────────────────────────────────────
// docSessions: Map<docId, { content: string, users: Map<socketId, { name, color, cursor }> }>
const docSessions = new Map();

function getOrCreateSession(docId) {
  if (!docSessions.has(docId)) {
    let doc = getDocument(docId);
    if (!doc) {
      doc = createDocument(docId);
    }
    docSessions.set(docId, {
      content: doc.content,
      users: new Map(),
    });
  }
  return docSessions.get(docId);
}

function sessionPresence(session) {
  return Array.from(session.users.values()).map(({ name, color, cursor }) => ({
    name,
    color,
    cursor,
  }));
}

// ── Colour palette for users ──────────────────────────────────────────────────
const COLOURS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
];
let colourIndex = 0;
function nextColour() {
  return COLOURS[colourIndex++ % COLOURS.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidDocId(id) {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_DOC_ID_LENGTH) return false;
  // allow alphanumeric, hyphens and underscores only
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function sanitizeDisplayName(name) {
  if (typeof name !== 'string') return 'Anonymous';
  // strip control chars, trim, clamp length
  return name.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, MAX_DISPLAY_NAME_LENGTH) || 'Anonymous';
}

// ── Rate limiter per socket ───────────────────────────────────────────────────
function makeRateLimiter() {
  let count = 0;
  let windowStart = Date.now();
  return function check() {
    const now = Date.now();
    if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
      count = 0;
      windowStart = now;
    }
    count++;
    return count <= RATE_LIMIT_MAX_EVENTS;
  };
}

// ── Socket.IO server ──────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  const rateLimitOk = makeRateLimiter();
  let currentDocId = null;
  let userName = 'Anonymous';
  let userColour = nextColour();

  // ── joinDoc ─────────────────────────────────────────────────────────────────
  socket.on('joinDoc', ({ docId, name } = {}) => {
    if (!rateLimitOk()) return socket.emit('error', { message: 'Rate limit exceeded' });

    if (!isValidDocId(docId)) {
      return socket.emit('error', { message: 'Invalid document id' });
    }

    // Leave previous room if any
    if (currentDocId && currentDocId !== docId) {
      leaveDoc(socket, currentDocId);
    }

    currentDocId = docId;
    userName = sanitizeDisplayName(name);

    const session = getOrCreateSession(docId);
    session.users.set(socket.id, { name: userName, color: userColour, cursor: null });

    socket.join(docId);

    // Send current state to the joining client
    socket.emit('docState', {
      content: session.content,
      presence: sessionPresence(session),
    });

    // Notify everyone else in the room
    socket.to(docId).emit('presenceUpdate', { presence: sessionPresence(session) });
  });

  // ── contentUpdate ───────────────────────────────────────────────────────────
  socket.on('contentUpdate', ({ docId, content } = {}) => {
    if (!rateLimitOk()) return socket.emit('error', { message: 'Rate limit exceeded' });
    if (docId !== currentDocId) return;
    if (!isValidDocId(docId)) return;
    if (typeof content !== 'string') return;
    if (content.length > MAX_CONTENT_LENGTH) {
      return socket.emit('error', { message: 'Content too large' });
    }

    const session = getOrCreateSession(docId);
    session.content = content;

    // Persist asynchronously (non-blocking)
    setImmediate(() => updateDocument(docId, content));

    // Broadcast to everyone else in the room
    socket.to(docId).emit('contentUpdate', { content });
  });

  // ── cursorUpdate ────────────────────────────────────────────────────────────
  socket.on('cursorUpdate', ({ docId, cursor } = {}) => {
    if (!rateLimitOk()) return socket.emit('error', { message: 'Rate limit exceeded' });
    if (docId !== currentDocId) return;
    if (!isValidDocId(docId)) return;

    const session = docSessions.get(docId);
    if (!session) return;
    const user = session.users.get(socket.id);
    if (!user) return;

    // cursor is { from: number, to: number } — validate loosely
    if (cursor && typeof cursor.from === 'number' && typeof cursor.to === 'number') {
      user.cursor = { from: cursor.from, to: cursor.to };
    } else {
      user.cursor = null;
    }

    // Broadcast cursor to others in room
    socket.to(docId).emit('cursorUpdate', {
      socketId: socket.id,
      name: userName,
      color: userColour,
      cursor: user.cursor,
    });
  });

  // ── disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (currentDocId) {
      leaveDoc(socket, currentDocId);
    }
  });

  function leaveDoc(sock, docId) {
    const session = docSessions.get(docId);
    if (session) {
      session.users.delete(sock.id);
      // Notify remaining users
      sock.to(docId).emit('presenceUpdate', { presence: sessionPresence(session) });
      // Clean up empty sessions (keep DB content but clear memory for idle docs)
      if (session.users.size === 0) {
        docSessions.delete(docId);
      }
    }
    sock.leave(docId);
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
