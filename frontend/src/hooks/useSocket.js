import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

export default function useSocket({
  docId,
  userName,
  onDocState,
  onContentUpdate,
  onPresenceUpdate,
  onCursorUpdate,
  onError,
}) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!docId || !userName) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('joinDoc', { docId, name: userName })
    })

    socket.on('docState', (data) => {
      onDocState?.(data)
    })

    socket.on('contentUpdate', (data) => {
      onContentUpdate?.(data)
    })

    socket.on('presenceUpdate', (data) => {
      onPresenceUpdate?.(data)
    })

    socket.on('cursorUpdate', (data) => {
      onCursorUpdate?.(data)
    })

    socket.on('error', (data) => {
      onError?.(data)
    })

    // On reconnect, rejoin the doc to resync
    socket.on('reconnect', () => {
      socket.emit('joinDoc', { docId, name: userName })
    })

    return () => {
      socket.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, userName])

  const sendContentUpdate = useCallback((content) => {
    socketRef.current?.emit('contentUpdate', { docId, content })
  }, [docId])

  const sendCursorUpdate = useCallback((cursor) => {
    socketRef.current?.emit('cursorUpdate', { docId, cursor })
  }, [docId])

  return { sendContentUpdate, sendCursorUpdate }
}
