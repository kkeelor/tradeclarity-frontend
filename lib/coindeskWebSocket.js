// lib/coindeskWebSocket.js
// WebSocket client for CoinDesk real-time price updates

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
const WS_URL = BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://')

export class CoinDeskWebSocketClient {
  constructor() {
    this.ws = null
    this.clientId = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.listeners = new Map()
    this.subscribedInstruments = new Set()
    this.normalizedData = null
    this.isConnecting = false
  }

  /**
   * Connect to WebSocket server
   * @param {Object} normalizedData - Optional normalized trade data for asset detection
   * @param {Function} onMessage - Callback for messages
   * @param {Function} onError - Callback for errors
   * @param {Function} onConnect - Callback when connected
   * @param {Function} onDisconnect - Callback when disconnected
   */
  connect(normalizedData = null, onMessage = null, onError = null, onConnect = null, onDisconnect = null) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.isConnecting = true
    this.normalizedData = normalizedData

    try {
      const wsUrl = `${WS_URL}/api/ws/coindesk`
      
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        
        if (onConnect) onConnect()
        
        // Subscribe to user's assets if normalizedData provided
        if (normalizedData) {
          this.subscribeToUserAssets(normalizedData)
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle connection message
          if (data.type === 'connection' && data.clientId) {
            this.clientId = data.clientId
          }
          
          // Handle price updates
          if (data.type === 'price_update') {
            this.handlePriceUpdate(data)
          }
          
          // Handle subscription confirmations
          if (data.type === 'subscription') {
            if (data.instruments) {
              data.instruments.forEach(inst => this.subscribedInstruments.add(inst))
            }
          }
          
          // Handle errors
          if (data.type === 'error') {
            console.error('WebSocket error:', data.message)
            if (onError) onError(data)
          }
          
          // Call custom message handler
          if (onMessage) onMessage(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        if (onError) onError(error)
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        this.clientId = null
        
        if (onDisconnect) onDisconnect()
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          setTimeout(() => {
            this.connect(this.normalizedData, onMessage, onError, onConnect, onDisconnect)
          }, this.reconnectDelay)
        } else {
          console.error('❌ Max reconnection attempts reached')
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      this.isConnecting = false
      if (onError) onError(error)
    }
  }

  /**
   * Subscribe to user's traded assets
   * @param {Object} normalizedData - Normalized trade data
   */
  async subscribeToUserAssets(normalizedData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot subscribe')
      return
    }

    try {
      // Create minimal payload for asset detection
      const minimalData = {
        spotTrades: (normalizedData?.spotTrades || []).map(t => ({ symbol: t.symbol })),
        futuresIncome: (normalizedData?.futuresIncome || []).map(t => ({ symbol: t.symbol })),
        futuresUserTrades: (normalizedData?.futuresUserTrades || []).map(t => ({ symbol: t.symbol })),
        metadata: normalizedData?.metadata || {}
      }
      
      // Import asset detection utility
      const { detectAssets } = await import('./marketContext')
      const assetData = await detectAssets(minimalData)
      
      if (assetData.success && assetData.instruments && assetData.instruments.length > 0) {
        // Send subscription message - only instruments, no full normalizedData
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          instruments: assetData.instruments
        }))
      } else {
        console.warn('No instruments detected for subscription')
      }
    } catch (error) {
      console.error('Error subscribing to user assets:', error)
    }
  }

  /**
   * Manually subscribe to specific instruments
   * @param {string[]} instruments - Array of instrument symbols (e.g., ['BTC-USD', 'ETH-USD'])
   */
  subscribe(instruments) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot subscribe')
      return
    }

    if (!Array.isArray(instruments) || instruments.length === 0) {
      console.warn('Invalid instruments array')
      return
    }

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      instruments: instruments
    }))
  }

  /**
   * Unsubscribe from instruments
   * @param {string[]} instruments - Array of instrument symbols to unsubscribe from
   */
  unsubscribe(instruments) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot unsubscribe')
      return
    }

    this.ws.send(JSON.stringify({
      type: 'unsubscribe',
      instruments: instruments
    }))
    
    instruments.forEach(inst => this.subscribedInstruments.delete(inst))
  }

  /**
   * Handle price update message
   * @param {Object} data - Price update data
   */
  handlePriceUpdate(data) {
    // Emit to listeners
    this.listeners.forEach((callback, key) => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in listener ${key}:`, error)
      }
    })
  }

  /**
   * Add listener for price updates
   * @param {string} key - Unique key for listener
   * @param {Function} callback - Callback function
   */
  addListener(key, callback) {
    this.listeners.set(key, callback)
  }

  /**
   * Remove listener
   * @param {string} key - Listener key
   */
  removeListener(key) {
    this.listeners.delete(key)
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.clientId = null
    this.subscribedInstruments.clear()
    this.listeners.clear()
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Get connection status
   * @returns {string}
   */
  getStatus() {
    if (!this.ws) return 'disconnected'
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
        return 'closing'
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'unknown'
    }
  }
}

// Singleton instance
let wsClientInstance = null

/**
 * Get or create WebSocket client instance
 * @returns {CoinDeskWebSocketClient}
 */
export function getWebSocketClient() {
  if (!wsClientInstance) {
    wsClientInstance = new CoinDeskWebSocketClient()
  }
  return wsClientInstance
}
