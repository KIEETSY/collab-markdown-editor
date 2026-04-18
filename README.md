# Collab Markdown Editor

A real-time collaborative Markdown editor with live preview, presence, and remote cursor indicators — like a mini Google Docs for Markdown.

## Features

- **Real-time collaboration** — Multiple users edit the same document simultaneously. Updates broadcast within ~100–300 ms via Socket.IO.
- **Live Markdown preview** — Split-pane view: editor on the left, sanitised preview on the right.
- **Presence list** — See who's currently online in the document, with coloured avatars.
- **Remote cursor indicators** — Coloured cursor markers and labels show where collaborators are editing.
- **Auth-lite identity** — Enter a display name on join; no full auth required.
- **Document persistence** — SQLite stores all documents; content survives server restarts.
- **Reconnect / resync** — On socket reconnect, the latest document state and presence are restored automatically.
- **XSS-safe preview** — Markdown is rendered through `marked` and sanitised with `DOMPurify`.
- **Rate limiting** — Socket events are rate-limited per connection to reduce abuse.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Editor | CodeMirror 6 |
| Markdown rendering | marked + DOMPurify |
| Realtime | Socket.IO |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |

## Project structure

```
collab-markdown-editor/
├── backend/          # Express + Socket.IO server
│   ├── server.js     # Main server (routes + sockets)
│   ├── db.js         # SQLite helpers
│   └── package.json
├── frontend/         # React + Vite app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Landing / doc-open page
│   │   │   └── DocEditor.jsx  # Editor page (/doc/:id)
│   │   ├── components/
│   │   │   ├── Editor.jsx     # CodeMirror 6 wrapper with remote cursors
│   │   │   ├── Preview.jsx    # Sanitised Markdown preview
│   │   │   └── PresenceList.jsx
│   │   └── hooks/
│   │       └── useSocket.js   # Socket.IO integration hook
│   └── package.json
└── package.json      # Convenience scripts
```

## Setup & running

### Prerequisites

- Node.js ≥ 18
- npm ≥ 8

### 1. Install dependencies

```bash
# From the repo root
npm run install:all
# Or individually:
npm install --prefix backend
npm install --prefix frontend
```

### 2. Start the backend

```bash
npm run dev:backend
# Server starts on http://localhost:3001
```

### 3. Start the frontend (separate terminal)

```bash
npm run dev:frontend
# App opens on http://localhost:5173
```

### 4. Open two browser windows

1. Go to `http://localhost:5173` in both windows.
2. Click **+ Create New Document** in one window — copy the URL.
3. Open the same URL in the second window.
4. Enter different display names in each window.
5. Start typing — you'll see the other user's cursor and text updates in real time!

## Environment variables (optional)

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `` (empty — uses Vite proxy) | Backend API base URL |
| `VITE_SOCKET_URL` | `` (empty — uses Vite proxy) | Socket.IO server URL |

## Verifying collaboration

Open the same `/doc/:id` URL in two browser tabs or windows, enter different names, and:

- ✅ Text edits in one window appear in the other within ~100–300 ms.
- ✅ The presence list shows both users.
- ✅ Coloured cursor labels indicate where the other user is typing.
- ✅ Closing one tab removes that user from the presence list.
- ✅ Restarting the backend and refreshing preserves the document content.

## Security notes

- Document IDs are validated as alphanumeric + hyphens/underscores, max 64 chars.
- Display names are stripped of control characters and clamped to 40 chars.
- Markdown preview is sanitised via DOMPurify before rendering.
- Socket events are rate-limited to 60 events / 5 seconds per socket.
- Document content is capped at 500 KB.