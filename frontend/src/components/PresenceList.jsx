export default function PresenceList({ users = [], docId }) {
  return (
    <div style={styles.container}>
      <div style={styles.docIdRow}>
        <span style={styles.docLabel}>Doc:</span>
        <span style={styles.docId} title={docId}>{docId}</span>
        <button
          style={styles.copyBtn}
          title="Copy share link"
          onClick={() => navigator.clipboard.writeText(window.location.href)}
        >
          🔗
        </button>
      </div>

      <div style={styles.userRow}>
        <span style={styles.onlineLabel}>Online ({users.length})</span>
        <div style={styles.avatars}>
          {users.map((u, i) => (
            <div
              key={i}
              style={{ ...styles.avatar, background: u.color, border: `2px solid ${u.color}` }}
              title={u.name}
            >
              {u.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '6px 12px',
    background: '#0d1b2a',
    borderBottom: '1px solid #0f3460',
    flexWrap: 'wrap',
  },
  docIdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: '0 0 auto',
  },
  docLabel: {
    color: '#64748b',
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  docId: {
    color: '#94a3b8',
    fontSize: '0.82rem',
    fontFamily: 'monospace',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
    lineHeight: 1,
    padding: '2px 4px',
    borderRadius: '4px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    justifyContent: 'flex-end',
  },
  onlineLabel: {
    color: '#64748b',
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  avatars: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fff',
    cursor: 'default',
    userSelect: 'none',
  },
}
