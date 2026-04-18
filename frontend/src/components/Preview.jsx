import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import './Preview.css'

// Configure marked
marked.setOptions({ breaks: true, gfm: true })

export default function Preview({ content = '' }) {
  const html = useMemo(() => {
    const raw = marked.parse(content || '')
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        'h1','h2','h3','h4','h5','h6',
        'p','br','hr',
        'ul','ol','li',
        'a','img',
        'strong','em','del','code','pre','blockquote',
        'table','thead','tbody','tr','th','td',
        'div','span',
      ],
      ALLOWED_ATTR: ['href','src','alt','title','class','id','target'],
      FORCE_BODY: true,
    })
  }, [content])

  return (
    <div style={styles.container}>
      <div style={styles.header}>Preview</div>
      <div
        style={styles.content}
        className="markdown-preview"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    borderLeft: '1px solid #0f3460',
  },
  header: {
    padding: '6px 12px',
    background: '#0d1b2a',
    borderBottom: '1px solid #0f3460',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
    flex: '0 0 auto',
  },
  content: {
    padding: '16px 20px',
    overflowY: 'auto',
    flex: 1,
    lineHeight: 1.7,
    color: '#d1d5db',
    fontSize: '0.95rem',
  },
}
