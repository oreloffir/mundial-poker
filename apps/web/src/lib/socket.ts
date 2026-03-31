import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@wpc/shared'
import { useAuthStore } from '@/stores/authStore'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TypedSocket | null = null

export function getSocket(): TypedSocket {
  if (socket?.connected) {
    return socket
  }

  const token = useAuthStore.getState().token

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
  }) as TypedSocket

  socket.connect()

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
