import { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, Decoration, WidgetType } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import {
  StateEffect,
  StateField,
  RangeSet,
} from '@codemirror/state'

// ── Remote cursor state ──────────────────────────────────────────────────────

class CursorWidget extends WidgetType {
  constructor(name, color) {
    super()
    this.name = name
    this.color = color
  }
  toDOM() {
    const el = document.createElement('span')
    el.className = 'remote-cursor'
    el.style.cssText = `
      border-left: 2px solid ${this.color};
      position: relative;
      display: inline-block;
      height: 1em;
      vertical-align: text-bottom;
      pointer-events: none;
    `
    const label = document.createElement('span')
    label.className = 'remote-cursor-label'
    label.textContent = this.name
    label.style.cssText = `
      position: absolute;
      top: -1.4em;
      left: 0;
      background: ${this.color};
      color: #fff;
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      font-family: sans-serif;
      line-height: 1.4;
    `
    el.appendChild(label)
    return el
  }
  eq(other) {
    return other.name === this.name && other.color === this.color
  }
  ignoreEvent() { return true }
}

const setCursorsEffect = StateEffect.define()

const remoteCursorField = StateField.define({
  create() { return Decoration.none },
  update(deco, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCursorsEffect)) {
        return effect.value
      }
    }
    return deco.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

// ── Editor component ─────────────────────────────────────────────────────────

export default function Editor({ content, onChange, remoteCursors = {} }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const isRemoteUpdate = useRef(false)

  // Update remote cursor decorations when remoteCursors prop changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const decos = []
    const docLength = view.state.doc.length

    for (const [, info] of Object.entries(remoteCursors)) {
      const { name, color, cursor } = info
      if (!cursor) continue

      const pos = Math.max(0, Math.min(cursor.from, docLength))

      // Highlight selection range if from != to
      if (cursor.from !== cursor.to) {
        const from = Math.max(0, Math.min(cursor.from, docLength))
        const to = Math.max(0, Math.min(cursor.to, docLength))
        if (from < to) {
          decos.push(
            Decoration.mark({
              class: 'remote-selection',
              attributes: { style: `background: ${color}33` },
            }).range(from, to)
          )
        }
      }

      // Cursor line
      decos.push(
        Decoration.widget({
          widget: new CursorWidget(name, color),
          side: 1,
        }).range(pos)
      )
    }

    decos.sort((a, b) => a.from - b.from || a.startSide - b.startSide)

    view.dispatch({
      effects: setCursorsEffect.of(
        decos.length > 0 ? RangeSet.of(decos) : Decoration.none
      ),
    })
  }, [remoteCursors])

  // When external content changes (e.g. remote update), update the editor
  useEffect(() => {
    const view = viewRef.current
    if (!view || isRemoteUpdate.current) return
    const current = view.state.doc.toString()
    if (current !== content) {
      isRemoteUpdate.current = true
      const sel = view.state.selection
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
        selection: sel,
      })
      isRemoteUpdate.current = false
    }
  }, [content])

  // Mount CodeMirror
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isRemoteUpdate.current) {
        onChange?.(update.state.doc.toString(), update.state.selection.main)
      }
    })

    const theme = EditorView.theme({
      '&': {
        height: '100%',
        background: '#0d1117',
        color: '#c9d1d9',
        fontSize: '14px',
      },
      '.cm-content': { padding: '12px', fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace" },
      '.cm-focused': { outline: 'none' },
      '.cm-editor': { height: '100%' },
      '.cm-scroller': { overflow: 'auto', fontFamily: 'inherit' },
      '.cm-cursor': { borderLeftColor: '#58a6ff' },
      '.cm-activeLine': { background: '#161b22' },
      '.cm-gutters': { background: '#0d1117', border: 'none', color: '#484f58' },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 4px', minWidth: '36px' },
      '.cm-selectionBackground': { background: '#1f6feb !important' },
      '&.cm-focused .cm-selectionBackground': { background: '#1f6feb !important' },
    })

    const state = EditorState.create({
      doc: content || '',
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ codeLanguages: languages }),
        theme,
        updateListener,
        remoteCursorField,
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.header}>Markdown</div>
      <div ref={containerRef} style={styles.editor} />
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
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
  editor: {
    flex: 1,
    overflow: 'hidden',
  },
}
