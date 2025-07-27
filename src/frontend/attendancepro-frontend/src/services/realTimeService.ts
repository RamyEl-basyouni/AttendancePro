import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000'
const TUNNEL_AUTH_USER = (import.meta as any).env?.VITE_TUNNEL_AUTH_USER
const TUNNEL_AUTH_PASSWORD = (import.meta as any).env?.VITE_TUNNEL_AUTH_PASSWORD

const cleanApiBaseUrl = API_BASE_URL.replace(/https?:\/\/[^@]+@/, (match: string) => {
  return match.split('@')[0].split('//')[0] + '//'
})

export interface RealTimeEvent {
  type: 'attendance' | 'notification' | 'analytics' | 'leave' | 'system'
  data: any
  timestamp: string
  userId?: string
  tenantId?: string
}

export interface AttendanceUpdate {
  userId: string
  userName: string
  action: 'check-in' | 'check-out' | 'break-start' | 'break-end'
  timestamp: string
  location?: string
  method: 'manual' | 'gps' | 'beacon' | 'face-recognition'
}

export interface NotificationUpdate {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string
  timestamp: string
  userId?: string
}

export interface AnalyticsUpdate {
  type: 'overview' | 'attendance-rate' | 'productivity' | 'department'
  data: any
  timestamp: string
}

class RealTimeService {
  private connection: HubConnection | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000
  private isConnecting = false
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map()

  constructor() {
    this.initializeConnection()
  }

  private initializeConnection() {
    if (this.isConnecting || this.connection?.state === 'Connected') {
      return
    }

    this.isConnecting = true

    this.connection = new HubConnectionBuilder()
      .withUrl(`${cleanApiBaseUrl}/hubs/realtime`, {
        accessTokenFactory: () => {
          const token = localStorage.getItem('accessToken')
          return token || ''
        },
        headers: {
          ...(TUNNEL_AUTH_USER && TUNNEL_AUTH_PASSWORD ? {
            'Authorization': `Basic ${btoa(`${TUNNEL_AUTH_USER}:${TUNNEL_AUTH_PASSWORD}`)}`
          } : {})
        }
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return this.reconnectDelay * Math.pow(2, retryContext.previousRetryCount)
          }
          return null
        }
      })
      .configureLogging(LogLevel.Information)
      .build()

    this.setupEventHandlers()
    this.startConnection()
  }

  private setupEventHandlers() {
    if (!this.connection) return

    this.connection.on('AttendanceUpdate', (data: AttendanceUpdate) => {
      this.emitEvent('attendance-update', data)
      this.emitEvent('real-time-event', {
        type: 'attendance',
        data,
        timestamp: new Date().toISOString()
      } as RealTimeEvent)
    })

    this.connection.on('NotificationReceived', (data: NotificationUpdate) => {
      this.emitEvent('notification-received', data)
      this.emitEvent('real-time-event', {
        type: 'notification',
        data,
        timestamp: new Date().toISOString()
      } as RealTimeEvent)
    })

    this.connection.on('AnalyticsUpdate', (data: AnalyticsUpdate) => {
      this.emitEvent('analytics-update', data)
      this.emitEvent('real-time-event', {
        type: 'analytics',
        data,
        timestamp: new Date().toISOString()
      } as RealTimeEvent)
    })

    this.connection.on('LeaveStatusUpdate', (data: any) => {
      this.emitEvent('leave-status-update', data)
      this.emitEvent('real-time-event', {
        type: 'leave',
        data,
        timestamp: new Date().toISOString()
      } as RealTimeEvent)
    })

    this.connection.on('SystemAlert', (data: any) => {
      this.emitEvent('system-alert', data)
      this.emitEvent('real-time-event', {
        type: 'system',
        data,
        timestamp: new Date().toISOString()
      } as RealTimeEvent)
    })

    this.connection.onreconnecting(() => {
      console.log('SignalR connection lost. Attempting to reconnect...')
      this.emitEvent('connection-status', { status: 'reconnecting' })
    })

    this.connection.onreconnected(() => {
      console.log('SignalR connection reestablished.')
      this.reconnectAttempts = 0
      this.emitEvent('connection-status', { status: 'connected' })
      this.rejoinGroups()
    })

    this.connection.onclose((error) => {
      console.error('SignalR connection closed:', error)
      this.emitEvent('connection-status', { status: 'disconnected', error })
      this.isConnecting = false
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++
          this.initializeConnection()
        }, this.reconnectDelay)
      }
    })
  }

  private async startConnection() {
    if (!this.connection) return

    try {
      await this.connection.start()
      console.log('SignalR connection established.')
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.emitEvent('connection-status', { status: 'connected' })
      
      await this.joinUserGroup()
      await this.joinTenantGroup()
    } catch (error) {
      console.error('Error starting SignalR connection:', error)
      this.isConnecting = false
      this.emitEvent('connection-status', { status: 'error', error })
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++
          this.initializeConnection()
        }, this.reconnectDelay)
      }
    }
  }

  private async rejoinGroups() {
    try {
      await this.joinUserGroup()
      await this.joinTenantGroup()
    } catch (error) {
      console.error('Error rejoining groups:', error)
    }
  }

  private async joinUserGroup() {
    if (!this.connection || this.connection.state !== 'Connected') return

    try {
      const token = localStorage.getItem('accessToken')
      if (token) {
        await this.connection.invoke('JoinUserGroup')
      }
    } catch (error) {
      console.error('Error joining user group:', error)
    }
  }

  private async joinTenantGroup() {
    if (!this.connection || this.connection.state !== 'Connected') return

    try {
      const tenantId = localStorage.getItem('tenantId')
      if (tenantId) {
        await this.connection.invoke('JoinTenantGroup', tenantId)
      }
    } catch (error) {
      console.error('Error joining tenant group:', error)
    }
  }

  public async joinDepartmentGroup(departmentId: string) {
    if (!this.connection || this.connection.state !== 'Connected') return

    try {
      await this.connection.invoke('JoinDepartmentGroup', departmentId)
    } catch (error) {
      console.error('Error joining department group:', error)
    }
  }

  public async leaveDepartmentGroup(departmentId: string) {
    if (!this.connection || this.connection.state !== 'Connected') return

    try {
      await this.connection.invoke('LeaveDepartmentGroup', departmentId)
    } catch (error) {
      console.error('Error leaving department group:', error)
    }
  }

  public on(eventName: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, [])
    }
    this.eventHandlers.get(eventName)!.push(handler)
  }

  public off(eventName: string, handler: (data: any) => void) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emitEvent(eventName: string, data: any) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error)
        }
      })
    }
  }

  public async sendMessage(message: string, targetUserId?: string) {
    if (!this.connection || this.connection.state !== 'Connected') {
      throw new Error('SignalR connection not established')
    }

    try {
      if (targetUserId) {
        await this.connection.invoke('SendMessageToUser', targetUserId, message)
      } else {
        await this.connection.invoke('SendMessageToAll', message)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  public async requestAnalyticsRefresh() {
    if (!this.connection || this.connection.state !== 'Connected') {
      throw new Error('SignalR connection not established')
    }

    try {
      await this.connection.invoke('RequestAnalyticsRefresh')
    } catch (error) {
      console.error('Error requesting analytics refresh:', error)
      throw error
    }
  }

  public async markNotificationAsRead(notificationId: string) {
    if (!this.connection || this.connection.state !== 'Connected') {
      throw new Error('SignalR connection not established')
    }

    try {
      await this.connection.invoke('MarkNotificationAsRead', notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  public getConnectionState(): string {
    return this.connection?.state || 'Disconnected'
  }

  public isConnected(): boolean {
    return this.connection?.state === 'Connected'
  }

  public async disconnect() {
    if (this.connection) {
      try {
        await this.connection.stop()
        this.emitEvent('connection-status', { status: 'disconnected' })
      } catch (error) {
        console.error('Error disconnecting SignalR:', error)
      }
    }
  }

  public async reconnect() {
    if (this.connection) {
      await this.disconnect()
    }
    this.reconnectAttempts = 0
    this.initializeConnection()
  }
}

export default new RealTimeService()
