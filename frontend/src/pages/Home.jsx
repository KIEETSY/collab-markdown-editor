import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function Home() {
  const navigate = useNavigate()
  const [docId, setDocId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/docs`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create document')
      const { id } = await res.json()
      navigate(`/doc/${id}`)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  function handleOpen(e) {
    e.preventDefault()
    const trimmed = docId.trim()
    if (!trimmed) return
    // Basic client-side validation matching server rules
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed) || trimmed.length > 64) {
      setError('Document ID must be alphanumeric (hyphens/underscores allowed), max 64 chars.')
      return
    }
    navigate(`/doc/${trimmed}`)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>📝 Collab Markdown Editor</h1>
        <p style={styles.subtitle}>Real-time collaborative editing with live preview</p>

        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : '+ Create New Document'}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or open existing</span>
        </div>

        <form onSubmit={handleOpen} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter document ID…"
            value={docId}
            onChange={(e) => { setDocId(e.target.value); setError('') }}
            maxLength={64}
          />
          <button style={{ ...styles.btn, ...styles.btnSecondary }} type="submit">
            Open
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.hint}>
          Share the document URL with others to collaborate in real-time.
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
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
    padding: '40px',
    maxWidth: '420px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#e2e8f0',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    marginBottom: '28px',
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.2s',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    marginBottom: '20px',
  },
  btnSecondary: {
    background: '#0f3460',
    color: '#e2e8f0',
    marginTop: '8px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '0 0 20px',
    gap: '12px',
  },
  dividerText: {
    color: '#4a5568',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    background: '#16213e',
    padding: '0 8px',
    flex: 'none',
    margin: '0 auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
  error: {
    color: '#fc8181',
    fontSize: '0.85rem',
    marginTop: '12px',
  },
  hint: {
    color: '#4a5568',
    fontSize: '0.8rem',
    marginTop: '24px',
  },
}
