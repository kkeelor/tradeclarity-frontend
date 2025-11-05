// app/analyze/components/DataManagement.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Upload, FileText, X, AlertCircle, CheckCircle, Trash2, Loader2, Check, ChevronDown, Link2, Plus, KeyRound, Clock } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { ExchangeIcon } from '@/components/ui'
import { toast } from 'sonner'
import Header from './Header'
import Footer from '../../components/Footer'
import ConnectExchangeModal from './ConnectExchangeModal'
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

  const handleConnectionMethod = (method) => {
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
    }
  }

  const handleUpdateKeys = (exchange) => {
    setUpdatingExchange(exchange)
    setShowUpdateKeysModal(true)
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
        exchangeConnectionId: connectedExchanges.length === 1 ? connectedExchanges[0].id : null,
        accountType: 'BOTH',
        status: 'detecting',
        message: '',
        progress: 'Analyzing CSV format...',
        warning: warning,
        tradesCount: null,
        duplicatesCount: null,
        columnMapping: null,
        detectedExchange: null,
        detectedType: null,
        confidence: null
      }

      setFileConfigs(prev => [...prev, newConfig])

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

        if (response.ok && detection.confidence >= 0.7) {
          updateConfig(newConfig.id, {
            status: 'ready',
            progress: '',
            columnMapping: detection.mapping,
            detectedExchange: detection.detectedExchange,
            detectedType: detection.detectedType,
            confidence: detection.confidence,
            message: `? ${detection.detectedExchange || 'Format'} detected (${Math.round(detection.confidence * 100)}% confidence)`
          })
          toast.success(
            `Format detected: ${detection.detectedExchange || 'Unknown'} (${Math.round(detection.confidence * 100)}% confidence)`,
            { duration: 3000 }
          )
        } else {
          updateConfig(newConfig.id, {
            status: 'ready',
            progress: '',
            warning: 'Auto-detection uncertain. Fallback to manual selection.',
            confidence: detection.confidence || 0
          })
        }
      } catch (error) {
        console.error('AI detection error:', error)
        updateConfig(newConfig.id, {
          status: 'ready',
          progress: '',
          warning: 'Auto-detection failed. Using traditional parser.'
        })
      }
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

      let exchange = config.exchangeConnectionId
        ? connectedExchanges.find(e => e.id === config.exchangeConnectionId)?.exchange
        : (config.detectedExchange?.toLowerCase() || 'binance')

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
        const errorMsg = parseData.error || 'Failed to parse CSV'
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

      const metadataResponse = await fetch('/api/csv/save-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: config.file.name,
          label: config.label || null,
          accountType: config.accountType,
          exchangeConnectionId: config.exchangeConnectionId || null,
          size: config.file.size,
          tradesCount: 0
        })
      })

      const metadataData = await metadataResponse.json()

      if (!metadataResponse.ok || !metadataData.success) {
        const errorMsg = 'Failed to save CSV metadata'
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Upload Error', { description: errorMsg })
        return
      }

      const csvUploadId = metadataData.file.id

      updateConfig(configId, {
        progress: 'Saving trades to database...'
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
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Storage Error', { description: errorMsg })
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
      console.error('Error processing file:', error)
      const errorMsg = 'Failed to process file. Please try again.'
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
      case 'ready': return 'bg-gradient-to-br from-slate-800/50 to-slate-800/30 border-slate-700/50'
      case 'processing': return 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30'
      case 'success': return 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30'
      case 'error': return 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/30'
      default: return 'bg-gradient-to-br from-slate-800/50 to-slate-800/30 border-slate-700/50'
    }
  }

  const hasReadyFiles = fileConfigs.some(c => c.status === 'ready')
  const allProcessed = fileConfigs.length > 0 && fileConfigs.every(c => c.status === 'success' || c.status === 'error')

  const fileToDelete = showDeleteCSVConfirm ? uploadedFiles.find(f => f.id === showDeleteCSVConfirm) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Header
        exchangeConfig={null}
        currencyMetadata={null}
        currency="USD"
        setCurrency={() => {}}
        onDisconnect={() => router.push('/dashboard')}
        onNavigateDashboard={() => router.push('/dashboard')}
        onNavigateUpload={() => {}}
        onNavigateAll={() => router.push('/analyze')}
        onSignOut={handleSignOut}
        isDemoMode={false}
        hasDataSources={connectedExchanges.length > 0 || uploadedFiles.length > 0}
      />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Your Data</h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Manage your exchange connections and CSV uploads. View, organize, and delete your data sources.
            </p>
          </div>

          {/* Exchange Connections Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-slate-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-300">
                  Exchange Connections ({connectedExchanges.length})
                </h2>
              </div>
              <button
                onClick={handleConnectExchange}
                className="group px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Connect Exchange
              </button>
            </div>

            {loadingExchanges ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-slate-800/30 border border-slate-700/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : connectedExchanges.length === 0 ? (
              <div className="relative overflow-hidden border border-slate-700/50 rounded-2xl p-8 text-center bg-gradient-to-br from-slate-800/40 to-slate-800/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-700/30 border border-slate-600/50 flex items-center justify-center">
                  <Link2 className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400 mb-4">No exchange connections yet</p>
                <button
                  onClick={handleConnectExchange}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Connect Your First Exchange
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedExchanges.map(exchange => (
                  <div
                    key={exchange.id}
                    className="relative overflow-hidden border border-slate-700/50 rounded-xl p-4 bg-gradient-to-br from-slate-800/40 to-slate-800/20 hover:border-slate-600/70 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ExchangeIcon exchange={exchange.exchange} size={32} className="w-8 h-8" />
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{exchange.name}</p>
                            <p className="text-xs text-slate-500">API Connection</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteExchange(exchange)}
                          disabled={isDeletingExchange}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete exchange"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Last Key Saved Info */}
                      {exchange.updatedAt && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            Keys saved: {new Date(exchange.updatedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      
                      {/* Update Keys Button */}
                      <button
                        onClick={() => handleUpdateKeys(exchange)}
                        className="w-full px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-all inline-flex items-center justify-center gap-2"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Update API Keys
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CSV Uploads Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-300">
                CSV Uploads ({uploadedFiles.length})
              </h2>
            </div>

            {/* Upload Area */}
            <div
              className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-8 text-center transition-all backdrop-blur-sm ${
                dragActive
                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent'
                  : 'border-slate-600 hover:border-emerald-500/50 bg-gradient-to-br from-slate-800/40 to-slate-800/20'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {dragActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/5" />
              )}
              <div className="relative">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all ${
                  dragActive 
                    ? 'bg-emerald-500/30 border border-emerald-500/50' 
                    : 'bg-slate-700/30 border border-slate-600/50'
                }`}>
                  <Upload className={`w-8 h-8 transition-colors ${
                    dragActive ? 'text-emerald-400' : 'text-slate-400'
                  }`} />
                </div>
                <p className="text-sm text-slate-200 font-semibold mb-1">
                  Drop CSV files here or click to browse
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Max 10MB per file ? CSV format only
                </p>
                <input
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105"
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
                    <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-300">
                      Files to Upload ({fileConfigs.length})
                    </h3>
                  </div>
                  {hasReadyFiles && (
                    <button
                      onClick={handleUploadAll}
                      className="group px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105 inline-flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Upload All
                    </button>
                  )}
                </div>

                {fileConfigs.map(config => (
                  <FileConfigCard
                    key={config.id}
                    config={config}
                    connectedExchanges={connectedExchanges}
                    onUpdate={(updates) => updateConfig(config.id, updates)}
                    onRemove={() => removeFile(config.id)}
                    getStatusColor={getStatusColor}
                  />
                ))}
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
            <AlertDialogDescription>
              {deleteStats && (
                <div className="space-y-2 mt-2">
                  <p>This will delete:</p>
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
              )}
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
function FileConfigCard({ config, connectedExchanges, onUpdate, onRemove, getStatusColor }) {
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false)
  const selectedExchange = connectedExchanges.find(e => e.id === config.exchangeConnectionId)

  return (
    <div className={`relative overflow-hidden border rounded-2xl p-5 transition-all backdrop-blur-sm ${getStatusColor(config.status)}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {selectedExchange ? (
              <ExchangeIcon exchange={selectedExchange.exchange} size={20} className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-sm font-medium text-slate-200">{config.file.name}</span>
            <span className="text-xs text-slate-500">
              ({(config.file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          {config.status === 'ready' && (
            <button
              onClick={onRemove}
              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {config.status === 'ready' && (
          <div className="space-y-4">
            {config.warning && (
              <div className="relative overflow-hidden flex items-start gap-2 text-xs text-yellow-300 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/30 rounded-xl p-3 backdrop-blur-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{config.warning}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Label (optional)</label>
              <input
                type="text"
                value={config.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Binance January 2024"
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Link to Exchange (optional)</label>
              <div className="relative">
                <button
                  onClick={() => setShowExchangeDropdown(!showExchangeDropdown)}
                  className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-left flex items-center justify-between hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all"
                >
                  {selectedExchange ? (
                    <span className="flex items-center gap-2">
                      <ExchangeIcon exchange={selectedExchange.exchange} size={14} className="w-6 h-6 p-1" />
                      <span className="text-slate-200">{selectedExchange.name}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">Select exchange...</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showExchangeDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExchangeDropdown(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                      {connectedExchanges.map(exchange => (
                        <button
                          key={exchange.id}
                          onClick={() => {
                            onUpdate({ exchangeConnectionId: exchange.id })
                            setShowExchangeDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                        >
                          <ExchangeIcon exchange={exchange.exchange} size={14} className="w-6 h-6 p-1" />
                          <span className="text-slate-200">{exchange.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Account Type</label>
              <select
                value={config.accountType}
                onChange={(e) => onUpdate({ accountType: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              >
                <option value="BOTH">Both (SPOT & FUTURES)</option>
                <option value="SPOT">SPOT Only</option>
                <option value="FUTURES">FUTURES Only</option>
              </select>
            </div>
          </div>
        )}

        {config.status === 'processing' && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
              <span className="text-sm font-medium text-slate-200">{config.progress}</span>
            </div>
          </div>
        )}

        {config.status === 'success' && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-300">{config.message}</p>
                {config.tradesCount !== null && (
                  <p className="text-xs text-slate-300 mt-1.5">
                    {config.tradesCount} trades imported
                    {config.duplicatesCount > 0 && ` ? ${config.duplicatesCount} duplicates skipped`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {config.status === 'error' && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/30 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">{config.message}</p>
                <button
                  onClick={() => onUpdate({ status: 'ready', message: '' })}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold mt-2 inline-flex items-center gap-1 transition-colors"
                >
                  Try Again <ChevronDown className="w-3 h-3 rotate-90" />
                </button>
              </div>
            </div>
          </div>
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
    <div className="flex items-center justify-between p-4 border border-slate-700/50 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-800/20 hover:border-slate-600/70 transition-all">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {selectedExchange ? (
          <ExchangeIcon exchange={selectedExchange.exchange} size={20} className="w-5 h-5 flex-shrink-0" />
        ) : (
          <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {file.label || file.filename}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">
              {file.trades_count || 0} trades
            </span>
            {file.uploaded_at && (
              <>
                <span className="text-xs text-slate-500">?</span>
                <span className="text-xs text-slate-500">
                  {new Date(file.uploaded_at).toLocaleDateString()}
                </span>
              </>
            )}
            <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded">
              {getAccountTypeLabel(file.account_type)}
            </span>
          </div>
          {selectedExchange && (
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-slate-500">Linked to:</span>
              <span className="text-slate-300">{selectedExchange.name}</span>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="p-2 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 ml-4"
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

  if (!isOpen) return null

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
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-slate-900/95 to-slate-900/95 border border-slate-700/50 rounded-2xl max-w-lg w-full backdrop-blur-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900/95 via-slate-900/95 to-slate-900/95 border-b border-slate-700/50 p-6 flex items-center justify-between backdrop-blur-xl z-10">
          <div>
            <h2 className="text-2xl font-bold">Update API Keys</h2>
            <p className="text-slate-400 mt-1">{exchange.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold mb-1">Your keys will be encrypted</p>
                <p className="text-blue-400/80">
                  Enter your new API key and secret. They will be encrypted and securely stored. We never store your keys in plain text.
                </p>
              </div>
            </div>
          </div>

          {/* API Key Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  validateApiKey(e.target.value)
                }}
                placeholder={`Enter your ${exchange.name} API key`}
                disabled={isUpdating}
                className={`w-full px-4 py-3 bg-slate-800/60 border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  apiKeyValid === true ? 'border-emerald-500/50 focus:ring-emerald-500/30' :
                  apiKeyValid === false ? 'border-red-500/50 focus:ring-red-500/30' :
                  'border-slate-600/50 focus:ring-slate-500/30'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {apiKeyValid === true && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {apiKeyValid === false && <AlertCircle className="w-5 h-5 text-red-400" />}
              </div>
            </div>
            {apiKeyValid === true && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => {
                  setApiSecret(e.target.value)
                  validateApiSecret(e.target.value)
                }}
                placeholder={`Enter your ${exchange.name} API secret`}
                disabled={isUpdating}
                className={`w-full px-4 py-3 bg-slate-800/60 border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-12 ${
                  apiSecretValid === true ? 'border-emerald-500/50 focus:ring-emerald-500/30' :
                  apiSecretValid === false ? 'border-red-500/50 focus:ring-red-500/30' :
                  'border-slate-600/50 focus:ring-slate-500/30'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {apiSecretValid === true && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {apiSecretValid === false && <AlertCircle className="w-5 h-5 text-red-400" />}
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
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
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
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
        <div className="border-t border-slate-700/50 p-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUpdating || !apiKey || !apiSecret || apiKeyValid !== true || apiSecretValid !== true}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
        </div>
      </div>
    </div>
  )
}

