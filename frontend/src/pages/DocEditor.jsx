import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '../components/Editor.jsx'
import Preview from '../components/Preview.jsx'
import PresenceList from '../components/PresenceList.jsx'
import useSocket from '../hooks/useSocket.js'

const API_BASE = import.meta.env.VITE_API_URL || ''
const DEBOUNCE_MS = 150

export default function DocEditor() {
  const { id: docId } = useParams()
  const navigate = useNavigate()

  // ── Name prompt ──────────────────────────────────────────────────────────────
  const [userName, setUserName] = useState(() => {
    return sessionStorage.getItem('userName') || ''
  })
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  // ── Document state ───────────────────────────────────────────────────────────
  const [content, setContent] = useState('')
  const [presence, setPresence] = useState([])
  const [remoteCursors, setRemoteCursors] = useState({})
  const [loading, setLoading] = useState(true)
  const [socketError, setSocketError] = useState('')

  // Debounce ref
  const debounceTimer = useRef(null)

  // ── Validate doc ID ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (docId && !/^[a-zA-Z0-9_-]+$/.test(docId)) {
      navigate('/', { replace: true })
    }
  }, [docId, navigate])

  // ── Socket callbacks ─────────────────────────────────────────────────────────
  const onDocState = useCallback(({ content: c, presence: p }) => {
    setContent(c)
    setPresence(p)
    setLoading(false)
  }, [])

  const onContentUpdate = useCallback(({ content: c }) => {
    setContent(c)
  }, [])

  const onPresenceUpdate = useCallback(({ presence: p }) => {
    setPresence(p)
  }, [])

  const onCursorUpdate = useCallback(({ socketId, name, color, cursor }) => {
    setRemoteCursors((prev) => ({
      ...prev,
      [socketId]: { name, color, cursor },
    }))
  }, [])

  const onError = useCallback(({ message }) => {
    setSocketError(message)
    setTimeout(() => setSocketError(''), 3000)
  }, [])

  const { sendContentUpdate, sendCursorUpdate } = useSocket({
    docId: userName ? docId : null,
    userName,
    onDocState,
    onContentUpdate,
    onPresenceUpdate,
    onCursorUpdate,
    onError,
  })

  // ── Editor change handler ────────────────────────────────────────────────────
  const handleEditorChange = useCallback((newContent, selection) => {
    setContent(newContent)

    // Debounced content broadcast
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      sendContentUpdate(newContent)
    }, DEBOUNCE_MS)

    // Cursor broadcast (immediate)
    if (selection) {
      sendCursorUpdate({ from: selection.from, to: selection.to })
    }
  }, [sendContentUpdate, sendCursorUpdate])

  // ── Name submit ──────────────────────────────────────────────────────────────
  function handleNameSubmit(e) {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed) {
      setNameError('Please enter a display name.')
      return
    }
    if (trimmed.length > 40) {
      setNameError('Name must be 40 characters or fewer.')
      return
    }
    sessionStorage.setItem('userName', trimmed)
    setUserName(trimmed)
  }

  // ── Name prompt modal ────────────────────────────────────────────────────────
  if (!userName) {
    return (
      <div style={modalStyles.overlay}>
        <div style={modalStyles.card}>
          <h2 style={modalStyles.title}>Enter your name</h2>
          <p style={modalStyles.subtitle}>This will be shown to other collaborators.</p>
          <form onSubmit={handleNameSubmit} style={modalStyles.form}>
            <input
              style={modalStyles.input}
              autoFocus
              type="text"
              placeholder="Your display name…"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setNameError('') }}
              maxLength={40}
            />
            {nameError && <p style={modalStyles.error}>{nameError}</p>}
            <button style={modalStyles.btn} type="submit">
              Join Document
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8' }}>
        Loading document…
      </div>
    )
  }

  // ── Editor layout ─────────────────────────────────────────────────────────────
  return (
    <div style={editorStyles.root}>
      {socketError && (
        <div style={editorStyles.errorBanner}>{socketError}</div>
      )}
      <PresenceList users={presence} docId={docId} />
      <div style={editorStyles.panes}>
        <Editor
          content={content}
          onChange={handleEditorChange}
          remoteCursors={remoteCursors}
        />
        <Preview content={content} />
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const modalStyles = {
  overlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#1a1a2e',
  },
  card: {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: '12px',
    padding: '36px',
    maxWidth: '380px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#e2e8f0',
    marginBottom: '6px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #0f3460',
    background: '#1a1a2e',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
  },
  btn: {
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '4px',
  },
  error: {
    color: '#fc8181',
    fontSize: '0.82rem',
  },
}

const editorStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  panes: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  errorBanner: {
    background: '#7f1d1d',
    color: '#fca5a5',
    padding: '6px 16px',
    fontSize: '0.85rem',
    textAlign: 'center',
    flex: '0 0 auto',
  },
}
