// app/analyze/components/DataManagement.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Upload, FileText, X, AlertCircle, CheckCircle, Trash2, Loader2, Check, ChevronDown, Link2, Plus, KeyRound, Clock, TrendingUp, HelpCircle } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { ExchangeIcon, Separator } from '@/components/ui'
import { toast } from 'sonner'
import { getUpgradeToastConfig, getUpgradePromptFromApiError } from '@/app/components/UpgradePrompt'
import Header from './Header'
import Footer from '../../components/Footer'
import ConnectExchangeModal from './ConnectExchangeModal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Form } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { UploadedFilesSkeleton } from '@/app/components/LoadingSkeletons'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file

export default function DataManagement() {
  const router = useRouter()
  const { user } = useAuth()
  const [fileConfigs, setFileConfigs] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [connectedExchanges, setConnectedExchanges] = useState([])
  const [otherExchanges, setOtherExchanges] = useState([]) // Custom exchanges from CSV uploads
  const [loadingExchanges, setLoadingExchanges] = useState(true)
  const [loadingUploaded, setLoadingUploaded] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [deletingExchange, setDeletingExchange] = useState(null)
  const [showDeleteExchangeConfirm, setShowDeleteExchangeConfirm] = useState(false)
  const [deleteStats, setDeleteStats] = useState(null)
  const [deleteLinkedCSVs, setDeleteLinkedCSVs] = useState(false)
  const [isDeletingExchange, setIsDeletingExchange] = useState(false)
  const [deletingCSVId, setDeletingCSVId] = useState(null)
  const [showDeleteCSVConfirm, setShowDeleteCSVConfirm] = useState(null)
  const [showUpdateKeysModal, setShowUpdateKeysModal] = useState(false)
  const [updatingExchange, setUpdatingExchange] = useState(null)
  const [isUpdatingKeys, setIsUpdatingKeys] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [preSelectedExchangeId, setPreSelectedExchangeId] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchConnectedExchanges()
    fetchUploadedFiles()
  }, [])

  const fetchConnectedExchanges = async () => {
    const startTime = Date.now()
    try {
      const response = await fetch('/api/exchange/list')
      const data = await response.json()

      if (data.success) {
        const formatted = data.connections.map(conn => ({
          id: conn.id,
          name: conn.exchange.charAt(0).toUpperCase() + conn.exchange.slice(1),
          exchange: conn.exchange,
          createdAt: conn.created_at,
          updatedAt: conn.updated_at,
          lastSynced: conn.last_synced
        }))
        setConnectedExchanges(formatted)
      }
    } catch (error) {
      console.error('Error fetching exchanges:', error)
    } finally {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 350 - elapsed)
      setTimeout(() => setLoadingExchanges(false), remaining)
    }
  }

  const fetchUploadedFiles = async () => {
    const startTime = Date.now()
    try {
      const response = await fetch('/api/csv/list')
      const data = await response.json()

      if (data.success) {
        setUploadedFiles(data.files || [])
        
        // Extract unique "Other" exchanges (CSV files without exchange_connection_id but with exchange field)
        const otherExchangesMap = new Map()
        data.files?.forEach(file => {
          if (!file.exchange_connection_id && file.exchange) {
            const normalizedExchange = file.exchange.toLowerCase()
            if (!otherExchangesMap.has(normalizedExchange)) {
              otherExchangesMap.set(normalizedExchange, {
                exchange: normalizedExchange,
                name: file.exchange.charAt(0).toUpperCase() + file.exchange.slice(1),
                fileCount: 0,
                totalTrades: 0
              })
            }
            const exchangeData = otherExchangesMap.get(normalizedExchange)
            exchangeData.fileCount += 1
            exchangeData.totalTrades += (file.trades_count || 0)
          }
        })
        setOtherExchanges(Array.from(otherExchangesMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error('Error fetching uploaded files:', error)
    } finally {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 350 - elapsed)
      setTimeout(() => setLoadingUploaded(false), remaining)
    }
  }

  const handleDeleteExchange = async (exchange) => {
    try {
      const response = await fetch('/api/exchange/delete-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: exchange.id })
      })

      if (!response.ok) {
        toast.error('Failed to preview deletion impact')
        return
      }

      const stats = await response.json()
      setDeletingExchange(exchange)
      setDeleteStats(stats)
      setDeleteLinkedCSVs(false)
      setShowDeleteExchangeConfirm(true)
    } catch (error) {
      console.error('Error previewing deletion:', error)
      toast.error('Failed to preview deletion impact')
    }
  }

  const handleDeleteExchangeConfirm = async () => {
    if (!deletingExchange) return

    setIsDeletingExchange(true)
    try {
      const response = await fetch('/api/exchange/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: deletingExchange.id,
          deleteLinkedCSVs: deleteLinkedCSVs
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(`Exchange deleted. ${data.totalTradesDeleted || 0} trades removed.`)
        await fetchConnectedExchanges()
        await fetchUploadedFiles()
      } else {
        toast.error(data.error || 'Failed to delete exchange')
      }
    } catch (error) {
      console.error('Error deleting exchange:', error)
      toast.error('Failed to delete exchange')
    } finally {
      setIsDeletingExchange(false)
      setShowDeleteExchangeConfirm(false)
      setDeletingExchange(null)
      setDeleteStats(null)
    }
  }

  const handleDeleteCSV = async (fileId) => {
    setShowDeleteCSVConfirm(fileId)
  }

  const handleDeleteCSVConfirm = async () => {
    if (!showDeleteCSVConfirm) return

    setDeletingCSVId(showDeleteCSVConfirm)
    try {
      const response = await fetch('/api/csv/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: showDeleteCSVConfirm })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.hasDataIntegrityIssue) {
          toast.warning(
            'Partial Deletion',
            {
              description: `File deleted, but data integrity issue detected. Expected ${data.expectedTradesCount} trades, only deleted ${data.tradesDeleted}.`,
              duration: 12000
            }
          )
        } else {
          toast.success(
            'File Deleted',
            { description: `File deleted successfully. ${data.tradesDeleted || 0} associated trades removed.` }
          )
        }
        await fetchUploadedFiles()
      } else {
        toast.error(data.error || 'Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting CSV:', error)
      toast.error('Failed to delete file')
    } finally {
      setDeletingCSVId(null)
      setShowDeleteCSVConfirm(null)
    }
  }

  const handleConnectExchange = () => {
    setShowConnectModal(true)
  }

  const handleConnectionMethod = async (method) => {
    // Close modal first
    setShowConnectModal(false)
    
    if (method === 'api') {
      // Small delay to ensure modal closes before navigation
      setTimeout(() => {
        // Signal dashboard to directly show API connection form (not modal)
        sessionStorage.setItem('showAPIConnection', 'true')
        // Navigate to dashboard to start exchange connection flow
        router.push('/dashboard')
      }, 150) // Small delay for modal close animation
    } else if (method === 'csv') {
      // Stay on /data page - CSV upload is already available here
      // Modal already closed above
    } else if (method === 'snaptrade') {
      // Handle Snaptrade connection directly
      // CRITICAL: Open popup IMMEDIATELY to preserve user gesture chain
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      // Open popup with loading page first (preserves user gesture)
      const popup = window.open(
        '/snaptrade/loading',
        'Snaptrade Connection',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site and try again.')
        return
      }

      try {
        // Call initiate-connection API (handles registration check and login URL generation)
        const response = await fetch('/api/snaptrade/initiate-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customRedirect: `${window.location.origin}/snaptrade/callback?status=success`,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          popup.close()
          // Handle duplicate user error
          if (data.code === 'DUPLICATE_USER' || response.status === 409) {
            toast.error('Your account is already connected to Snaptrade. Please contact support if you need assistance.')
            return
          }
          toast.error(data.error || 'Failed to initiate Snaptrade connection')
          return
        }

        // Update popup location to Snaptrade URL (maintains user gesture chain)
        popup.location.href = data.redirectURI

        // Listen for callback via message from callback page
        const handleMessage = (event) => {
          if (event.origin !== window.location.origin) return

          if (event.data.type === 'snaptrade_connected') {
            window.removeEventListener('message', handleMessage)
            toast.success('Brokerage connected successfully!')
            
            // Refresh the page to show new connection
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          } else if (event.data.type === 'snaptrade_error') {
            window.removeEventListener('message', handleMessage)
            toast.error(event.data.error || 'Failed to connect brokerage')
          }
        }

        window.addEventListener('message', handleMessage)

        // Fallback: Check if popup closed
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
          }
        }, 500)
      } catch (err) {
        console.error('Snaptrade connection error:', err)
        toast.error(err.message || 'Failed to connect with Snaptrade')
      }
    }
  }

  const handleUpdateKeys = (exchange) => {
    setUpdatingExchange(exchange)
    setShowUpdateKeysModal(true)
  }

  const handleUploadTradeData = (exchange) => {
    // Set the pre-selected exchange ID
    setPreSelectedExchangeId(exchange.id)
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      // Fallback: find the file input by ID
      const fileInput = document.getElementById('file-upload')
      if (fileInput) {
        fileInput.click()
      }
    }
  }

  const handleUpdateKeysConfirm = async (apiKey, apiSecret) => {
    if (!updatingExchange) return

    setIsUpdatingKeys(true)
    try {
      const response = await fetch('/api/exchange/update-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: updatingExchange.id,
          apiKey,
          apiSecret
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('API keys updated successfully', {
          description: 'Your new API keys have been encrypted and saved.',
          duration: 5000
        })
        await fetchConnectedExchanges()
        setShowUpdateKeysModal(false)
        setUpdatingExchange(null)
      } else {
        toast.error(data.error || 'Failed to update API keys')
      }
    } catch (error) {
      console.error('Error updating keys:', error)
      toast.error('Failed to update API keys')
    } finally {
      setIsUpdatingKeys(false)
    }
  }

  // CSV Upload handlers (copied from CSVUploadFlow)
  const handleFileSelect = async (selectedFiles) => {
    const fileArray = Array.from(selectedFiles).filter(file => {
      return file.name.toLowerCase().endsWith('.csv') && file.size <= MAX_FILE_SIZE
    })

    for (const file of fileArray) {
      const existingFile = fileConfigs.find(c => c.file.name === file.name)
      let warning = ''

      if (existingFile) {
        warning = 'A file with this name was already added'
      }

      const newConfig = {
        id: Date.now() + Math.random(),
        file: file,
        label: '',
        exchangeConnectionId: preSelectedExchangeId || null, // Pre-select if provided
        useOtherExchange: false, // Explicitly set to false
        accountType: 'BOTH',
        status: 'ready', // Set to ready immediately - no detection
        message: '',
        progress: '',
        warning: warning,
        tradesCount: null,
        duplicatesCount: null,
        columnMapping: null,
        detectedExchange: null,
        detectedType: null,
        confidence: null
      }

      setFileConfigs(prev => [...prev, newConfig])

      // Get column mapping from AI (for parsing) - user will manually select exchange
      try {
        const preview = await readCSVPreview(file)
        const response = await fetch('/api/csv/detect-columns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headers: preview.headers,
            sampleData: preview.rows
          })
        })

        const detection = await response.json()

        if (response.ok && detection.mapping) {
          // Use AI mapping for parsing (ignore detectedExchange - user selects manually)
          updateConfig(newConfig.id, {
            status: 'ready',
            progress: '',
            columnMapping: detection.mapping, // This is what we need for AI parsing
            // Note: detectedExchange is ignored - user selects exchange manually
            confidence: detection.confidence || 0.8
          })
        } else {
          // If detection fails, still mark as ready - user can still upload
          // Parser will try traditional methods if no mapping
          updateConfig(newConfig.id, {
            status: 'ready',
            progress: '',
            warning: 'Column mapping detection failed. Will attempt standard parsing.',
            confidence: detection.confidence || 0
          })
        }
      } catch (error) {
        console.error('AI column mapping error:', error)
        // Still mark as ready - user can upload, parser will try traditional methods
        updateConfig(newConfig.id, {
          status: 'ready',
          progress: '',
          warning: 'Column mapping detection unavailable. Will attempt standard parsing.'
        })
      }
    }
    
    // Reset pre-selected exchange after all files are processed
    if (preSelectedExchangeId) {
      setPreSelectedExchangeId(null)
    }
  }

  async function readCSVPreview(file) {
    const text = await file.text()
    const lines = text.split('\n').slice(0, 6)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).filter(l => l.trim()).map(line => {
      return line.split(',').map(v => v.trim().replace(/"/g, ''))
    })
    return { headers, rows }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const updateConfig = (id, updates) => {
    setFileConfigs(prev => prev.map(config =>
      config.id === id ? { ...config, ...updates } : config
    ))
  }

  const removeFile = (id) => {
    setFileConfigs(prev => prev.filter(config => config.id !== id))
  }

  const handleUploadAll = async () => {
    // Validate all files have exchange selected before uploading
    const invalidFiles = fileConfigs.filter(config => {
      if (config.status !== 'ready') return false
      const hasExchange = config.exchangeConnectionId || (config.useOtherExchange && config.customExchangeName?.trim())
      return !hasExchange
    })

    if (invalidFiles.length > 0) {
      toast.error('Exchange Required', {
        description: `Please select an exchange for ${invalidFiles.length} file(s) before uploading.`,
        duration: 5000
      })
      return
    }

    for (const config of fileConfigs) {
      if (config.status !== 'ready') continue
      await processFile(config)
    }
  }

  const processFile = async (config) => {
    const configId = config.id
    try {
      updateConfig(configId, {
        status: 'processing',
        progress: config.columnMapping ? 'Parsing with AI mapping...' : 'Parsing CSV...'
      })

      // Determine exchange - prioritize connection, then other exchange name
      let exchange = null
      if (config.exchangeConnectionId) {
        const foundExchange = connectedExchanges.find(e => e.id === config.exchangeConnectionId)
        if (foundExchange) {
          exchange = foundExchange.exchange
        } else {
          console.warn('⚠️ Exchange connection not found:', config.exchangeConnectionId)
        }
      }
      
      if (!exchange && config.useOtherExchange && config.customExchangeName) {
        exchange = config.customExchangeName.toLowerCase().trim()
      }
      
      // Validate exchange is selected
      if (!exchange || exchange.trim() === '') {
        const errorMsg = 'Please select an exchange before uploading'
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Exchange Required', { description: errorMsg })
        return
      }

      // Validate accountType
      const validAccountTypes = ['BOTH', 'SPOT', 'FUTURES']
      if (!validAccountTypes.includes(config.accountType)) {
        const errorMsg = `Invalid account type: ${config.accountType}. Must be one of: ${validAccountTypes.join(', ')}`
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Invalid Account Type', { description: errorMsg })
        return
      }

      // Validate file exists
      if (!config.file) {
        const errorMsg = 'File is missing'
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('File Error', { description: errorMsg })
        return
      }

      // Check if exchange is supported by parser
      const supportedExchanges = ['binance', 'coindcx']
      const isSupportedExchange = supportedExchanges.includes(exchange.toLowerCase())
      
      if (!isSupportedExchange) {
        const errorMsg = `Exchange "${exchange}" is not directly supported. Please use Binance or CoinDCX format, or contact support.`
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Unsupported Exchange', { 
          description: errorMsg,
          duration: 6000
        })
        return
      }

      const formData = new FormData()
      formData.append('file', config.file)
      formData.append('exchange', exchange)
      formData.append('accountType', config.accountType)
      if (config.columnMapping) {
        formData.append('columnMapping', JSON.stringify(config.columnMapping))
      }

      const parseResponse = await fetch('/api/csv/parse', {
        method: 'POST',
        body: formData
      })

      const parseData = await parseResponse.json()

      if (!parseResponse.ok || !parseData.success) {
        const errorMsg = parseData.error || `Failed to parse CSV (${parseResponse.status})`
        console.error('❌ Parse error:', {
          status: parseResponse.status,
          error: parseData.error,
          data: parseData
        })
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Parse Error', { description: errorMsg })
        return
      }

      toast.success('File parsed successfully', { duration: 2000 })

      updateConfig(configId, {
        progress: 'Creating CSV record...'
      })

      const metadataPayload = {
        filename: config.file.name,
        label: config.label || null,
        accountType: config.accountType,
        exchangeConnectionId: config.exchangeConnectionId || null,
        exchange: exchange, // Include exchange name (normalized)
        size: config.file.size,
        tradesCount: 0
      }

      const metadataResponse = await fetch('/api/csv/save-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadataPayload)
      })

      const metadataData = await metadataResponse.json()

      if (!metadataResponse.ok || !metadataData.success) {
        const errorMsg = metadataData.details || metadataData.error || `Failed to save CSV metadata (${metadataResponse.status})`
        console.error('❌ Metadata save error - FULL RESPONSE:', JSON.stringify(metadataData, null, 2))
        console.error('❌ Metadata save error:', {
          status: metadataResponse.status,
          error: metadataData.error,
          details: metadataData.details,
          code: metadataData.code,
          hint: metadataData.hint,
          fullData: metadataData
        })
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Upload Error', { 
          description: errorMsg,
          duration: 8000
        })
        return
      }

      const csvUploadId = metadataData.file.id

      updateConfig(configId, {
        progress: 'Saving trades to database...'
      })

      console.log('Sending trades to store API:', {
        userId: user.id,
        userEmail: user.email,
        exchange: exchange,
        spotTradesCount: parseData.spotTrades?.length || 0,
        futuresIncomeCount: parseData.futuresIncome?.length || 0
      })

      const storeResponse = await fetch('/api/trades/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotTrades: parseData.spotTrades || [],
          futuresIncome: parseData.futuresIncome || [],
          userId: user.id,
          exchange: exchange,
          connectionId: config.exchangeConnectionId || null,
          csvUploadId: csvUploadId
        })
      })

      const storeData = await storeResponse.json()

      if (!storeResponse.ok || !storeData.success) {
        const errorMsg = storeData.error || 'Failed to store trades'
        
        // Log full error response for debugging
        console.error('=== STORE TRADES ERROR ===')
        console.error('Status:', storeResponse.status)
        console.error('Error:', storeData.error)
        console.error('Message:', storeData.message)
        console.error('Detected Tier:', storeData.detectedTier || storeData.tier)
        console.error('Subscription Tier:', storeData.subscriptionTier)
        console.error('Subscription Status:', storeData.subscriptionStatus)
        console.error('Limit:', storeData.limit)
        console.error('Current:', storeData.current)
        console.error('Attempted:', storeData.attempted)
        console.error('Remaining:', storeData.remaining)
        console.error('Full Error Data:', JSON.stringify(storeData, null, 2))
        console.error('==========================')
        
        // Handle trade limit error with upgrade prompt
        if (storeResponse.status === 403 && storeData.error === 'TRADE_LIMIT_EXCEEDED') {
          const promptProps = getUpgradePromptFromApiError(storeData)
          const toastConfig = promptProps ? getUpgradeToastConfig(promptProps) : null
          
          // Enhanced error message with debug info if available
          let errorDescription = storeData.message || errorMsg
          if (storeData.debug && process.env.NODE_ENV === 'development') {
            errorDescription += `\n\nDebug: Detected tier: ${storeData.detectedTier}, Subscription tier: ${storeData.subscriptionTier}, Limit: ${storeData.limit}`
          }
          
          updateConfig(configId, {
            status: 'error',
            message: storeData.message || errorMsg
          })
          
          if (toastConfig) {
            toast.error('Trade Limit Exceeded', toastConfig)
          } else {
            toast.error('Trade Limit Exceeded', { 
              description: errorDescription,
              duration: 10000 // Show longer for debugging
            })
          }
        } else {
          updateConfig(configId, {
            status: 'error',
            message: errorMsg
          })
          toast.error('Storage Error', { description: errorMsg })
        }
        return
      }

      const newTrades = storeData.tradesCount || 0
      const duplicates = storeData.alreadyExisted || 0

      updateConfig(configId, {
        progress: 'Updating file metadata...'
      })

      try {
        await fetch('/api/csv/save-metadata', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            csvUploadId: csvUploadId,
            tradesCount: newTrades
          })
        })
      } catch (error) {
        console.error('?? Failed to update CSV trade count:', error)
      }

      updateConfig(configId, {
        status: 'success',
        message: duplicates > 0
          ? `? Imported ${newTrades} new trades (${duplicates} duplicates skipped)`
          : `? Imported ${newTrades} trades`,
        tradesCount: newTrades,
        duplicatesCount: duplicates,
        progress: ''
      })

      // Set flag to show analytics ready toast when user returns to dashboard
      if (newTrades > 0) {
        sessionStorage.setItem('justAddedTrades', 'true')
        sessionStorage.setItem('tradesAddedAt', Date.now().toString())
      }

      toast.success(
        'Import Complete',
        {
          description: `${newTrades} trade${newTrades !== 1 ? 's' : ''} imported successfully`,
          duration: 5000
        }
      )

      if (duplicates > 0) {
        toast.warning(
          `${duplicates} duplicate trade${duplicates !== 1 ? 's' : ''} skipped`,
          { duration: 4000 }
        )
      }

      await fetchUploadedFiles()

      // Navigate back to dashboard after successful CSV upload
      // Check if all files are now processed (success or error)
      const processedCount = fileConfigs.filter(c => c.status === 'success' || c.status === 'error').length + 1 // +1 for current file
      if (processedCount >= fileConfigs.length) {
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500) // Small delay to show success message
      }

    } catch (error) {
      console.error('❌ Error processing file:', error)
      console.error('Error stack:', error.stack)
      console.error('Config:', {
        id: configId,
        filename: config.file?.name,
        exchange: config.exchangeConnectionId || (config.useOtherExchange ? config.customExchangeName : null),
        accountType: config.accountType
      })
      const errorMsg = error.message || 'Failed to process file. Please try again.'
      updateConfig(configId, {
        status: 'error',
        message: errorMsg
      })
      toast.error('Upload Failed', {
        description: errorMsg,
        duration: 6000
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      router.push('/')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-black border-white/10'
      case 'processing': return 'bg-black border-white/20'
      case 'success': return 'bg-black border-white/20'
      case 'error': return 'bg-black border-red-500/30'
      default: return 'bg-black border-white/10'
    }
  }

  const hasReadyFiles = fileConfigs.some(c => c.status === 'ready')
  const allProcessed = fileConfigs.length > 0 && fileConfigs.every(c => c.status === 'success' || c.status === 'error')

  const fileToDelete = showDeleteCSVConfirm ? uploadedFiles.find(f => f.id === showDeleteCSVConfirm) : null

  return (
    <div className="min-h-screen bg-black text-white">
      <Header
        exchangeConfig={null}
        currencyMetadata={null}
        currency="USD"
        setCurrency={() => {}}
        onDisconnect={() => router.push('/dashboard')}
        onNavigateDashboard={() => router.push('/dashboard')}
        onNavigateUpload={() => {}}
        onNavigateAll={() => router.push('/vega')}
        onSignOut={handleSignOut}
        isDemoMode={false}
        hasDataSources={connectedExchanges.length > 0 || uploadedFiles.length > 0}
      />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-semibold text-white/90">Your Data</h1>
            <p className="text-sm text-white/60 max-w-3xl">
              Manage your exchange connections and CSV uploads. View, organize, and delete your data sources.
            </p>
          </div>

          {/* Exchange Connections Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-white/70" />
                </div>
                <h2 className="text-lg font-medium text-white/90">
                  Exchange Connections ({connectedExchanges.length})
                </h2>
              </div>
              <button
                onClick={handleConnectExchange}
                className="group px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Connect Exchange
              </button>
            </div>

            {loadingExchanges ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : connectedExchanges.length === 0 ? (
              <div className="relative overflow-hidden border border-white/10 rounded-xl p-8 text-center bg-black">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-white/50" />
                </div>
                <p className="text-sm text-white/60 mb-4">No exchange connections yet</p>
                <button
                  onClick={handleConnectExchange}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Connect Your First Exchange
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* API Connected Exchanges */}
                {connectedExchanges.map(exchange => (
                  <div
                    key={exchange.id}
                    className="relative overflow-hidden border border-white/10 rounded-xl p-4 bg-black hover:border-white/20 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ExchangeIcon exchange={exchange.exchange} size={32} className="w-8 h-8" />
                          <div>
                            <p className="text-sm font-medium text-white/90">{exchange.name}</p>
                            <p className="text-xs text-white/50">API Connection</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteExchange(exchange)}
                          disabled={isDeletingExchange}
                          className="p-2 text-white/50 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete exchange"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Last Key Saved Info */}
                      {exchange.updatedAt && (
                        <div className="flex items-center gap-2 text-xs text-white/50 pt-2 border-t border-white/5">
                          <Clock className="w-3.5 h-3.5 text-white/40" />
                          <span>
                            Keys saved: {new Date(exchange.updatedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors  ml-auto" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="font-medium mb-1">API Keys Last Updated</p>
                                <p className="text-xs leading-relaxed">
                                  This shows when you last saved or updated your API keys for this exchange. Your keys are encrypted and stored securely.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateKeys(exchange)}
                          className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-white/80 hover:text-white transition-all inline-flex items-center justify-center gap-2"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Update Keys
                        </button>
                        <button
                          onClick={() => handleUploadTradeData(exchange)}
                          className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs font-medium text-white/70 hover:text-white/90 transition-all inline-flex items-center justify-center gap-2"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Data
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* "Other" Exchanges (from CSV uploads) */}
                {otherExchanges.map(exchange => (
                  <div
                    key={`other-${exchange.exchange}`}
                    className="relative overflow-hidden border border-white/10 rounded-xl p-4 bg-black hover:border-white/20 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ExchangeIcon exchange={exchange.exchange} size={32} className="w-8 h-8" />
                          <div>
                            <p className="text-sm font-medium text-white/90">{exchange.name}</p>
                            <p className="text-xs text-white/50">CSV Upload</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-white/50 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-white/40" />
                          <span>{exchange.fileCount} {exchange.fileCount === 1 ? 'file' : 'files'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-white/40" />
                          <span>{exchange.totalTrades.toLocaleString()} trades</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CSV Uploads Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white/70" />
              </div>
              <h2 className="text-lg font-medium text-white/90">
                CSV Uploads ({uploadedFiles.length})
              </h2>
            </div>

            {/* Upload Area */}
            <div
              className={`relative overflow-hidden border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-white/30 bg-white/5'
                  : 'border-white/10 hover:border-white/20 bg-black'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="relative">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center transition-all border ${
                  dragActive 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-white/5 border-white/10'
                }`}>
                  <Upload className={`w-8 h-8 transition-colors ${
                    dragActive ? 'text-white/80' : 'text-white/50'
                  }`} />
                </div>
                <p className="text-sm text-white/90 font-medium mb-1">
                  Drop CSV files here or click to browse
                </p>
                <p className="text-xs text-white/50 mb-4">
                  Max 10MB per file ? CSV format only
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={(e) => {
                    handleFileSelect(e.target.files)
                    // Reset input so same file can be selected again
                    e.target.value = ''
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-5 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition-all bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20"
                >
                  Select Files
                </label>
              </div>
            </div>

            {/* File Config Cards */}
            {fileConfigs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-white/70" />
                    </div>
                    <h3 className="text-sm font-medium text-white/90">
                      Files to Upload ({fileConfigs.length})
                    </h3>
                  </div>
                  {hasReadyFiles && (
                    <button
                      onClick={handleUploadAll}
                      className="group px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload All
                    </button>
                  )}
                </div>

                {fileConfigs.map(config => (
                  <FileConfigCard
                    key={config.id}
                    config={config}
                    connectedExchanges={connectedExchanges}
                    otherExchanges={otherExchanges}
                    onUpdate={(updates) => updateConfig(config.id, updates)}
                    onRemove={() => removeFile(config.id)}
                    getStatusColor={getStatusColor}
                  />
                ))}

                {/* Add Another File Button */}
                <div className="flex items-center justify-center pt-2">
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click()
                      } else {
                        const fileInput = document.getElementById('file-upload')
                        if (fileInput) {
                          fileInput.click()
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 border border-white/10 hover:border-white/20 rounded-lg transition-all inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another File
                  </button>
                </div>

                {/* Upload All Button at Bottom */}
                {hasReadyFiles && (
                  <div className="flex justify-center pt-4 border-t border-white/5">
                    <button
                      onClick={handleUploadAll}
                      className="group px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      Upload All Files ({fileConfigs.filter(c => c.status === 'ready').length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Previously Uploaded Files */}
            {loadingUploaded ? (
              <UploadedFilesSkeleton count={3} />
            ) : uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map(file => (
                  <UploadedFileCard
                    key={file.id}
                    file={file}
                    connectedExchanges={connectedExchanges}
                    onRefresh={fetchUploadedFiles}
                    onDelete={() => handleDeleteCSV(file.id)}
                    isDeleting={deletingCSVId === file.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Delete Exchange Confirmation Dialog */}
      <AlertDialog open={showDeleteExchangeConfirm} onOpenChange={setShowDeleteExchangeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exchange Connection?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {deleteStats ? (
                  <div className="space-y-2 mt-2">
                    <div>This will delete:</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>{deleteStats.apiTradesCount || 0} API-imported trades</li>
                      {deleteStats.linkedCSVsCount > 0 && (
                        <li>
                          {deleteLinkedCSVs
                            ? `${deleteStats.linkedCSVsCount} linked CSV files and ${deleteStats.csvTradesCount || 0} CSV trades`
                            : `${deleteStats.linkedCSVsCount} CSV files will be unlinked (trades kept)`}
                        </li>
                      )}
                    </ul>
                    {deleteStats.linkedCSVsCount > 0 && (
                      <label className="flex items-center gap-2 mt-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deleteLinkedCSVs}
                          onChange={(e) => setDeleteLinkedCSVs(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">Also delete linked CSV files</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <span>Are you sure you want to delete this exchange connection?</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingExchange}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExchangeConfirm}
              disabled={isDeletingExchange}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeletingExchange ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete CSV Confirmation Dialog */}
      {fileToDelete && (
        <AlertDialog open={!!showDeleteCSVConfirm} onOpenChange={(open) => !open && setShowDeleteCSVConfirm(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 ring-4 ring-red-500/20">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <AlertDialogTitle className="text-xl">
                    Delete CSV File?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-2">
                    "{fileToDelete.label || fileToDelete.filename}" and all {fileToDelete.trades_count || 0} associated trades will be permanently removed. This action cannot be undone.
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <div className="border-t border-slate-700/50 pt-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-300">Trades to delete</span>
                <span className="font-semibold text-red-400">{fileToDelete.trades_count || 0}</span>
              </div>
            </div>

            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel disabled={deletingCSVId === fileToDelete.id}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCSVConfirm}
                disabled={deletingCSVId === fileToDelete.id}
                className="bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500"
              >
                {deletingCSVId === fileToDelete.id ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete File'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Update API Keys Modal */}
      {showUpdateKeysModal && updatingExchange && (
        <UpdateKeysModal
          exchange={updatingExchange}
          isOpen={showUpdateKeysModal}
          onClose={() => {
            setShowUpdateKeysModal(false)
            setUpdatingExchange(null)
          }}
          onConfirm={handleUpdateKeysConfirm}
          isUpdating={isUpdatingKeys}
        />
      )}

      {/* Connect Exchange Modal */}
      <ConnectExchangeModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onSelectMethod={handleConnectionMethod}
      />

      <Footer />
    </div>
  )
}

// FileConfigCard component (simplified - full version copied from CSVUploadFlow)
function FileConfigCard({ config, connectedExchanges, otherExchanges, onUpdate, onRemove, getStatusColor }) {
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false)
  const [showOtherInput, setShowOtherInput] = useState(config.useOtherExchange || false)
  const otherInputRef = useRef(null)
  
  const selectedExchange = connectedExchanges.find(e => e.id === config.exchangeConnectionId)
  
  // Filter other exchanges for autocomplete suggestions
  const filteredOtherExchanges = config.customExchangeName
    ? otherExchanges.filter(ex => ex.toLowerCase().includes(config.customExchangeName.toLowerCase()))
    : otherExchanges
  
  // Check if exchange is valid (either connection selected OR other with name)
  const isExchangeValid = config.exchangeConnectionId || (config.useOtherExchange && config.customExchangeName?.trim())

  // Auto-scroll to input when "Other" is selected
  useEffect(() => {
    if (config.useOtherExchange && otherInputRef.current) {
      setTimeout(() => {
        otherInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        otherInputRef.current?.focus()
      }, 100)
    }
  }, [config.useOtherExchange])

  return (
      <div className={`relative overflow-hidden border rounded-xl p-4 md:p-5 transition-all ${getStatusColor(config.status)}`}>
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {selectedExchange ? (
                <ExchangeIcon exchange={selectedExchange.exchange} size={20} className="w-5 h-5 flex-shrink-0" />
              ) : config.useOtherExchange && config.customExchangeName ? (
                <ExchangeIcon exchange={config.customExchangeName.toLowerCase()} size={20} className="w-5 h-5 flex-shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-white/50 flex-shrink-0" />
              )}
              <span className="text-sm font-medium text-white/90 truncate">{config.file.name}</span>
              <span className="text-xs text-white/50 whitespace-nowrap">
                ({(config.file.size / 1024).toFixed(1)} KB)
              </span>
              {config.status && (
                <Badge 
                  variant={
                    config.status === 'success' ? 'profit' :
                    config.status === 'error' ? 'loss' :
                    config.status === 'processing' ? 'warning' :
                    'secondary'
                  }
                  className="text-xs flex-shrink-0"
                >
                  {config.status === 'ready' ? 'Ready' :
                   config.status === 'processing' ? 'Processing' :
                   config.status === 'success' ? 'Success' :
                   config.status === 'error' ? 'Error' : config.status}
                </Badge>
              )}
            </div>
            {config.status === 'ready' && (
              <button
                onClick={onRemove}
                className="p-1 text-white/50 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        {config.status === 'ready' && (
          <div className="space-y-4">
            {config.warning && (
              <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-xs">{config.warning}</AlertDescription>
              </Alert>
            )}

            {/* Compact Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Label Field */}
              <div>
                <Label htmlFor="file-label" className="block text-xs font-medium text-white/70 mb-2">
                  Label <span className="text-white/50 font-normal">(optional)</span>
                </Label>
                <Input
                  id="file-label"
                  type="text"
                  value={config.label || ''}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                  placeholder="e.g., Trading data from January 2024"
                  className="bg-white/5 border-white/10 text-white/90 placeholder-white/40 focus:border-white/20 focus:ring-white/10"
                />
              </div>

              {/* Account Type */}
              <div>
                <Label htmlFor="account-type" className="block text-xs font-medium text-white/70 mb-2">
                  Account Type
                </Label>
                <Select value={config.accountType} onValueChange={(value) => onUpdate({ accountType: value })}>
                  <SelectTrigger id="account-type" className="bg-white/5 border-white/10 text-white/90 focus:border-white/20 focus:ring-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 text-white/90">
                    <SelectItem value="BOTH">Both (SPOT & FUTURES)</SelectItem>
                    <SelectItem value="SPOT">SPOT Only</SelectItem>
                    <SelectItem value="FUTURES">FUTURES Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exchange Selection - Full Width, More Prominent */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <Label className="block text-xs font-medium text-white/80 mb-3">
                Exchange Selection <span className="text-red-400">*</span>
                <span className="text-[10px] text-white/50 ml-2 font-normal">Required for accurate analytics</span>
              </Label>
              
              {/* Radio Buttons Row */}
              <div className="flex flex-wrap gap-4">
                {/* Option 1: link to existing exchange */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      id={`link-exchange-${config.id}`}
                      checked={!config.useOtherExchange && !!config.exchangeConnectionId}
                      onChange={() => {
                        onUpdate({ useOtherExchange: false, customExchangeName: '' })
                        setShowOtherInput(false)
                      }}
                      className="w-4 h-4 text-white/60 bg-black border-white/20 focus:ring-white/20"
                    />
                    <label htmlFor={`link-exchange-${config.id}`} className="text-xs font-medium text-white/70 cursor-pointer">
                      Link to Existing Exchange
                    </label>
                  </div>
                  
                  {!config.useOtherExchange && (
                    <DropdownMenu open={showExchangeDropdown} onOpenChange={setShowExchangeDropdown}>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-left flex items-center justify-between hover:border-white/20 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white/80">
                          {selectedExchange ? (
                            <span className="flex items-center gap-2">
                              <ExchangeIcon exchange={selectedExchange.exchange} size={14} className="w-5 h-5" />
                              <span className="text-white/90">{selectedExchange.name}</span>
                            </span>
                          ) : (
                            <span className="text-white/50">
                              {connectedExchanges.length > 0 ? 'Select exchange...' : 'No exchanges connected'}
                            </span>
                          )}
                          <ChevronDown className="w-4 h-4 text-white/50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-full bg-black border-white/10 max-h-48 overflow-y-auto">
                        {connectedExchanges.length > 0 ? (
                          connectedExchanges.map(exchange => (
                            <DropdownMenuItem
                              key={exchange.id}
                              onClick={() => {
                                onUpdate({ exchangeConnectionId: exchange.id, useOtherExchange: false, customExchangeName: '' })
                                setShowExchangeDropdown(false)
                                setShowOtherInput(false)
                              }}
                              className="text-sm hover:bg-white/10 flex items-center gap-2 cursor-pointer text-white/80"
                            >
                              <ExchangeIcon exchange={exchange.exchange} size={14} className="w-5 h-5" />
                              <span className="text-white/90">{exchange.name}</span>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-white/50">
                            No exchanges connected. Use "Other Exchange" option below.
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Option 2: Other Exchange - Inline */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      id={`other-exchange-${config.id}`}
                      checked={config.useOtherExchange}
                      onChange={() => {
                        onUpdate({ useOtherExchange: true, exchangeConnectionId: null })
                        setShowOtherInput(true)
                        setShowExchangeDropdown(false)
                      }}
                      className="w-4 h-4 text-white/60 bg-black border-white/20 focus:ring-white/20"
                    />
                    <label htmlFor={`other-exchange-${config.id}`} className="text-xs font-medium text-white/70 cursor-pointer flex-1">
                      Other Exchange
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors " />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium mb-1">Other Exchange</p>
                          <p className="text-xs leading-relaxed">
                            Use this option if your exchange isn't supported for API connections, or if you're uploading CSV files from an exchange that doesn't match your connected exchanges. This helps organize your CSV data.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {config.useOtherExchange && (
                    <div className="space-y-1.5">
                      <Input
                        ref={otherInputRef}
                        type="text"
                        value={config.customExchangeName || ''}
                        onChange={(e) => onUpdate({ customExchangeName: e.target.value.trim() })}
                        placeholder="e.g., Kraken, Coinbase, Bybit..."
                        className={`bg-white/5 border rounded-lg text-sm text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 transition-all ${
                          config.customExchangeName?.trim()
                            ? 'border-white/20 focus:border-white/30 focus:ring-white/10'
                            : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                        }`}
                        list={`other-exchanges-${config.id}`}
                      />
                      {otherExchanges.length > 0 && (
                        <datalist id={`other-exchanges-${config.id}`}>
                          {filteredOtherExchanges.map(ex => (
                            <option key={ex} value={ex} />
                          ))}
                        </datalist>
                      )}
                      {!config.customExchangeName?.trim() && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Exchange name is required
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Validation message */}
              {!isExchangeValid && (
                <div className="mt-2 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Please select an exchange connection or enter an "Other" exchange name</span>
                </div>
              )}
            </div>
          </div>
        )}

        {config.status === 'processing' && (
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <AlertDescription className="text-blue-400 text-sm">{config.progress}</AlertDescription>
          </Alert>
        )}

        {config.status === 'success' && (
          <Alert className="bg-emerald-500/10 border-emerald-500/30">
            <Check className="w-5 h-5 text-emerald-400" />
            <AlertDescription>
              <p className="text-sm font-semibold text-emerald-300">{config.message}</p>
              {config.tradesCount !== null && (
                <p className="text-xs text-slate-300 mt-1.5">
                  {config.tradesCount} trades imported
                  {config.duplicatesCount > 0 && ` ? ${config.duplicatesCount} duplicates skipped`}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {config.status === 'error' && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <AlertDescription>
              <p className="text-sm font-semibold text-red-300">{config.message}</p>
              <button
                onClick={() => onUpdate({ status: 'ready', message: '' })}
                className="text-xs text-red-400 hover:text-red-300 font-semibold mt-2 inline-flex items-center gap-1 transition-colors"
              >
                Try Again <ChevronDown className="w-3 h-3 rotate-90" />
              </button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

// UploadedFileCard component
function UploadedFileCard({ file, connectedExchanges, onRefresh, onDelete, isDeleting }) {
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false)
  const [linking, setLinking] = useState(false)
  const selectedExchange = connectedExchanges.find(e => e.id === file.exchange_connection_id)

  const handleLinkExchange = async (exchangeId) => {
    setLinking(true)
    try {
      const response = await fetch('/api/csv/link-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          exchangeConnectionId: exchangeId
        })
      })

      if (response.ok) {
        await onRefresh()
        toast.success('Exchange linked successfully')
      } else {
        toast.error('Failed to link exchange')
      }
    } catch (error) {
      console.error('Error linking exchange:', error)
      toast.error('Failed to link exchange')
    } finally {
      setLinking(false)
      setShowExchangeDropdown(false)
    }
  }

  const getAccountTypeLabel = (type) => {
    if (type === 'BOTH') return 'SPOT & FUTURES'
    return type
  }

  return (
    <div className="flex items-center justify-between p-4 border border-white/10 rounded-xl bg-black hover:border-white/20 transition-all">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {selectedExchange ? (
          <ExchangeIcon exchange={selectedExchange.exchange} size={20} className="w-5 h-5 flex-shrink-0" />
        ) : (
          <FileText className="w-5 h-5 text-white/50 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">
            {file.label || file.filename}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-white/50">
              {file.trades_count || 0} trades
            </span>
            {file.uploaded_at && (
              <>
                <Separator className="text-xs text-white/10" />
                <span className="text-xs text-white/50">
                  {new Date(file.uploaded_at).toLocaleDateString()}
                </span>
              </>
            )}
            <Badge variant="outline" className="text-xs border-white/10 bg-white/5 text-white/70">
              {getAccountTypeLabel(file.account_type)}
            </Badge>
          </div>
          {selectedExchange && (
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-white/50">Linked to:</span>
              <span className="text-white/70">{selectedExchange.name}</span>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="p-2 text-white/50 hover:text-red-400 transition-colors disabled:opacity-50 ml-4"
        title="Delete file"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}

// UpdateKeysModal component
function UpdateKeysModal({ exchange, isOpen, onClose, onConfirm, isUpdating }) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState(null)
  const [apiSecretValid, setApiSecretValid] = useState(null)

  // Validate API key format (exchange-specific validation)
  const validateApiKey = (key) => {
    if (key.length === 0) {
      setApiKeyValid(null)
      return
    }

    let isValid = false

    if (exchange.exchange === 'binance') {
      // Binance: 64 chars, alphanumeric
      isValid = key.length >= 60 && /^[A-Za-z0-9]+$/.test(key)
    } else if (exchange.exchange === 'coindcx') {
      // CoinDCX: Variable length, alphanumeric with hyphens
      isValid = key.length >= 20 && /^[A-Za-z0-9\-]+$/.test(key)
    } else {
      // Default: just check if not empty and reasonable length
      isValid = key.length >= 20
    }

    setApiKeyValid(isValid)
  }

  const validateApiSecret = (secret) => {
    if (secret.length === 0) {
      setApiSecretValid(null)
      return
    }

    let isValid = false

    if (exchange.exchange === 'binance') {
      // Binance: 64 chars, alphanumeric
      isValid = secret.length >= 60 && /^[A-Za-z0-9]+$/.test(secret)
    } else if (exchange.exchange === 'coindcx') {
      // CoinDCX: Variable length, alphanumeric with hyphens
      isValid = secret.length >= 20 && /^[A-Za-z0-9\-]+$/.test(secret)
    } else {
      // Default: just check if not empty and reasonable length
      isValid = secret.length >= 20
    }

    setApiSecretValid(isValid)
  }

  const handleSubmit = () => {
    if (apiKeyValid && apiSecretValid && apiKey && apiSecret) {
      onConfirm(apiKey, apiSecret)
      // Reset form after submit
      setApiKey('')
      setApiSecret('')
      setApiKeyValid(null)
      setApiSecretValid(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-white/90">Update API Keys</DialogTitle>
          <DialogDescription className="text-white/60">{exchange.name}</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-white/70 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/70">
                <p className="font-medium mb-1">Your keys will be encrypted</p>
                <p className="text-white/60">
                  Enter your new API key and secret. They will be encrypted and securely stored. We never store your keys in plain text.
                </p>
              </div>
            </div>
          </div>

          {/* API Key Field */}
          <div>
            <Label htmlFor="update-api-key" className="block text-sm text-white/70 mb-2">
              API Key
            </Label>
            <div className="relative">
              <Input
                id="update-api-key"
                type="text"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  validateApiKey(e.target.value)
                }}
                placeholder={`Enter your ${exchange.name} API key`}
                disabled={isUpdating}
                className={`bg-white/5 border-white/10 text-white/90 placeholder-white/40 disabled:opacity-50 disabled:cursor-not-allowed ${
                  apiKeyValid === true ? 'border-white/20 focus:ring-white/10' :
                  apiKeyValid === false ? 'border-red-500/50 focus:ring-red-500/20' :
                  'border-white/10 focus:ring-white/10'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                {apiKeyValid === true && <CheckCircle className="w-5 h-5 text-white/70" />}
                {apiKeyValid === false && <AlertCircle className="w-5 h-5 text-red-400" />}
              </div>
            </div>
            {apiKeyValid === true && (
              <p className="text-xs text-white/60 mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Valid format
              </p>
            )}
            {apiKeyValid === false && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Invalid format. Check your API key.
              </p>
            )}
          </div>

          {/* API Secret Field */}
          <div>
            <Label htmlFor="update-api-secret" className="block text-sm text-white/70 mb-2">
              API Secret
            </Label>
            <div className="relative">
              <Input
                id="update-api-secret"
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => {
                  setApiSecret(e.target.value)
                  validateApiSecret(e.target.value)
                }}
                placeholder={`Enter your ${exchange.name} API secret`}
                disabled={isUpdating}
                className={`bg-white/5 border-white/10 text-white/90 placeholder-white/40 disabled:opacity-50 disabled:cursor-not-allowed pr-12 ${
                  apiSecretValid === true ? 'border-white/20 focus:ring-white/10' :
                  apiSecretValid === false ? 'border-red-500/50 focus:ring-red-500/20' :
                  'border-white/10 focus:ring-white/10'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                {apiSecretValid === true && <CheckCircle className="w-5 h-5 text-white/70" />}
                {apiSecretValid === false && <AlertCircle className="w-5 h-5 text-red-400" />}
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-white/50 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showSecret ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {apiSecretValid === true && (
              <p className="text-xs text-white/60 mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Valid format
              </p>
            )}
            {apiSecretValid === false && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Invalid format. Check your API secret.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-white/5 pt-6">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUpdating || !apiKey || !apiSecret || apiKeyValid !== true || apiSecretValid !== true}
            className="px-6 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Update Keys
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

