// app/analyze/components/CSVUploadFlow.js
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Upload, FileText, X, AlertCircle, CheckCircle, Trash2, Home, LogOut, Sparkles, Loader2, Check, ChevronDown, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useAlert, ConfirmAlert } from '@/app/components'
import { UploadedFilesSkeleton } from '@/app/components/LoadingSkeletons'
import Sidebar from './Sidebar'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file

export default function CSVUploadFlow({ onBack }) {
  const { user } = useAuth()
  const alert = useAlert()
  const [fileConfigs, setFileConfigs] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [connectedExchanges, setConnectedExchanges] = useState([])
  const [loadingExchanges, setLoadingExchanges] = useState(true)
  const [loadingUploaded, setLoadingUploaded] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

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
          icon: conn.exchange === 'binance' ? '🟡' : '🇮🇳'
        }))
        setConnectedExchanges(formatted)
      }
    } catch (error) {
      console.error('Error fetching exchanges:', error)
    } finally {
      // Ensure minimum 350ms loading time for skeleton visibility
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
      // Ensure minimum 350ms loading time for skeleton visibility
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 350 - elapsed)
      setTimeout(() => setLoadingUploaded(false), remaining)
    }
  }

  const handleFileSelect = async (selectedFiles) => {
    const fileArray = Array.from(selectedFiles).filter(file => {
      // Only allow CSV files
      return file.name.toLowerCase().endsWith('.csv') && file.size <= MAX_FILE_SIZE
    })

    for (const file of fileArray) {
      // Check for duplicate filename
      const existingFile = fileConfigs.find(c => c.file.name === file.name)
      let warning = ''

      if (existingFile) {
        warning = 'A file with this name was already added'
      }

      // Create initial config with detecting status
      const newConfig = {
        id: Date.now() + Math.random(),
        file: file,
        label: '',
        exchangeConnectionId: connectedExchanges.length === 1 ? connectedExchanges[0].id : null,
        accountType: 'BOTH',
        status: 'detecting', // detecting, ready, processing, success, error
        message: '',
        progress: '🤖 Analyzing CSV format...',
        warning: warning,
        tradesCount: null,
        duplicatesCount: null,
        columnMapping: null, // AI-detected mapping
        detectedExchange: null,
        detectedType: null,
        confidence: null
      }

      setFileConfigs(prev => [...prev, newConfig])

      // Try AI detection (priority)
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
          // AI detection successful - use it!
          updateConfig(newConfig.id, {
            status: 'ready',
            progress: '',
            columnMapping: detection.mapping,
            detectedExchange: detection.detectedExchange,
            detectedType: detection.detectedType,
            confidence: detection.confidence,
            message: `✓ ${detection.detectedExchange || 'Format'} detected (${Math.round(detection.confidence * 100)}% confidence)`
          })

          // Show success toast for AI detection
          alert.success(
            `Format detected: ${detection.detectedExchange || 'Unknown'} (${Math.round(detection.confidence * 100)}% confidence)`,
            { dismissAfter: 3000 }
          )
        } else {
          // Low confidence - fall back to manual selection
          updateConfig(newConfig.id, {
            status: 'ready',
            progress: '',
            warning: 'Auto-detection uncertain. Fallback to manual selection.',
            confidence: detection.confidence || 0
          })
        }
      } catch (error) {
        console.error('AI detection error:', error)
        // AI failed - fall back to traditional method
        updateConfig(newConfig.id, {
          status: 'ready',
          progress: '',
          warning: 'Auto-detection failed. Using traditional parser.'
        })
      }
    }
  }

  // Helper: Read CSV preview (headers + first 5 rows)
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
    // Process each file sequentially
    for (const config of fileConfigs) {
      if (config.status !== 'ready') continue

      await processFile(config)
    }
  }

  const processFile = async (config) => {
    const configId = config.id

    try {
      // Step 1: Parse CSV
      updateConfig(configId, {
        status: 'processing',
        progress: config.columnMapping ? 'Parsing with AI mapping...' : 'Parsing CSV...'
      })

      // Get exchange - either from selection or auto-detect
      let exchange = config.exchangeConnectionId
        ? connectedExchanges.find(e => e.id === config.exchangeConnectionId)?.exchange
        : (config.detectedExchange?.toLowerCase() || 'binance') // Use AI-detected or default

      const formData = new FormData()
      formData.append('file', config.file)
      formData.append('exchange', exchange)
      formData.append('accountType', config.accountType)

      // Add AI mapping if available (PRIORITY)
      if (config.columnMapping) {
        formData.append('columnMapping', JSON.stringify(config.columnMapping))
        console.log('🤖 Using AI-detected column mapping')
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
        alert.error(errorMsg, { title: 'Parse Error' })
        return
      }

      // Show success toast for successful parsing
      alert.success('File parsed successfully', { dismissAfter: 2000 })

      // Step 2: Save CSV metadata first (to get csvUploadId for linking trades)
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
          tradesCount: 0 // Will update after storing trades
        })
      })

      const metadataData = await metadataResponse.json()

      if (!metadataResponse.ok || !metadataData.success) {
        const errorMsg = 'Failed to save CSV metadata'
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        alert.error(errorMsg, { title: 'Upload Error' })
        return
      }

      const csvUploadId = metadataData.file.id

      // Step 3: Store trades to database with csvUploadId
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
          csvUploadId: csvUploadId // Link trades to CSV upload
        })
      })

      const storeData = await storeResponse.json()

      if (!storeResponse.ok || !storeData.success) {
        const errorMsg = storeData.error || 'Failed to store trades'
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        alert.error(errorMsg, { title: 'Storage Error' })
        return
      }

      // Success!
      const newTrades = storeData.tradesCount || 0
      const duplicates = storeData.alreadyExisted || 0

      updateConfig(configId, {
        status: 'success',
        message: duplicates > 0
          ? `✓ Imported ${newTrades} new trades (${duplicates} duplicates skipped)`
          : `✓ Imported ${newTrades} trades`,
        tradesCount: newTrades,
        duplicatesCount: duplicates,
        progress: ''
      })

      // Show success toast
      alert.success(
        `${newTrades} trade${newTrades !== 1 ? 's' : ''} imported successfully`,
        {
          title: 'Import Complete',
          dismissAfter: 5000
        }
      )

      // Show warning toast for duplicates
      if (duplicates > 0) {
        alert.warning(
          `${duplicates} duplicate trade${duplicates !== 1 ? 's' : ''} skipped`,
          { dismissAfter: 4000 }
        )
      }

      // Refresh uploaded files list
      await fetchUploadedFiles()

    } catch (error) {
      console.error('Error processing file:', error)
      const errorMsg = 'Failed to process file. Please try again.'
      updateConfig(configId, {
        status: 'error',
        message: errorMsg
      })
      alert.error(errorMsg, {
        title: 'Upload Failed',
        dismissAfter: 6000
      })
    }
  }

  const handleSignOut = async () => {
    const timeoutId = setTimeout(() => {
      window.location.href = '/analyze'
    }, 3000)

    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      clearTimeout(timeoutId)
      window.location.href = '/analyze'
    } catch (error) {
      clearTimeout(timeoutId)
      window.location.href = '/analyze'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-slate-700/50 border-slate-600'
      case 'processing': return 'bg-blue-500/10 border-blue-500/30'
      case 'success': return 'bg-emerald-500/10 border-emerald-500/30'
      case 'error': return 'bg-red-500/10 border-red-500/30'
      default: return 'bg-slate-700/50 border-slate-600'
    }
  }

  const hasReadyFiles = fileConfigs.some(c => c.status === 'ready')
  const allProcessed = fileConfigs.length > 0 && fileConfigs.every(c => c.status === 'success' || c.status === 'error')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex">
      <Sidebar
        activePage="upload"
        onDashboardClick={onBack}
        onUploadClick={() => {}}
        onMyPatternsClick={onBack}
        onSignOutClick={handleSignOut}
        isMyPatternsDisabled={false}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/30 sticky top-0 z-10">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Upload CSV Files</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Import trade history from your exchanges
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-900 font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
              >
                {user?.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl z-20 overflow-hidden">
                    <div className="p-2.5 border-b border-slate-700/50">
                      <p className="text-[10px] text-slate-500 mb-0.5">Signed in as</p>
                      <p className="text-xs text-slate-300 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        handleSignOut()
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Info banner */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
              <p className="text-xs text-slate-400">
                Upload CSV files from your exchanges to analyze your trading data. You can optionally link files to connected exchanges.
              </p>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-600 hover:border-emerald-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-300 font-medium mb-1">
                Drop CSV files here or click to browse
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Max 10MB per file • CSV format only
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
                className="inline-block px-4 py-2 rounded-lg font-medium text-sm cursor-pointer transition-all bg-emerald-500 hover:bg-emerald-400 text-white"
              >
                Select Files
              </label>
            </div>

            {/* File Config Cards */}
            {fileConfigs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">
                    Files to Upload ({fileConfigs.length})
                  </h3>
                  {hasReadyFiles && (
                    <button
                      onClick={handleUploadAll}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-medium transition-all"
                    >
                      Upload All
                    </button>
                  )}
                  {allProcessed && (
                    <button
                      onClick={onBack}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Dashboard
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

            {/* Uploaded Files Section */}
            {loadingUploaded ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">
                    Previously Uploaded Files
                  </h3>
                </div>
                <UploadedFilesSkeleton count={3} />
              </div>
            ) : uploadedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">
                    Previously Uploaded Files ({uploadedFiles.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {uploadedFiles.map(file => (
                    <UploadedFileCard
                      key={file.id}
                      file={file}
                      connectedExchanges={connectedExchanges}
                      onRefresh={fetchUploadedFiles}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// Separate component for each file config card
function FileConfigCard({ config, connectedExchanges, onUpdate, onRemove, getStatusColor }) {
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false)

  const selectedExchange = connectedExchanges.find(e => e.id === config.exchangeConnectionId)

  return (
    <div className={`border rounded-xl p-4 transition-all ${getStatusColor(config.status)}`}>
      {/* File name and remove button */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
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
        <div className="space-y-3">
          {/* Warning for duplicate filename */}
          {config.warning && (
            <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{config.warning}</span>
            </div>
          )}

          {/* Label input */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Label (optional)</label>
            <input
              type="text"
              value={config.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Binance January 2024"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Exchange selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Link to Exchange (optional)</label>
            <div className="relative">
              <button
                onClick={() => setShowExchangeDropdown(!showExchangeDropdown)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-left flex items-center justify-between hover:border-slate-500 transition-colors"
              >
                {selectedExchange ? (
                  <span className="flex items-center gap-2">
                    <span>{selectedExchange.icon}</span>
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
                        <span>{exchange.icon}</span>
                        <span className="text-slate-200">{exchange.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Account type dropdown */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Account Type</label>
            <select
              value={config.accountType}
              onChange={(e) => onUpdate({ accountType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="BOTH">Both (SPOT & FUTURES)</option>
              <option value="SPOT">SPOT Only</option>
              <option value="FUTURES">FUTURES Only</option>
            </select>
          </div>
        </div>
      )}

      {config.status === 'processing' && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <span className="text-sm text-slate-300">{config.progress}</span>
        </div>
      )}

      {config.status === 'success' && (
        <div className="flex items-start gap-3 py-2">
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-emerald-300">{config.message}</p>
            {config.tradesCount !== null && (
              <p className="text-xs text-slate-400 mt-1">
                {config.tradesCount} trades imported
                {config.duplicatesCount > 0 && ` • ${config.duplicatesCount} duplicates skipped`}
              </p>
            )}
          </div>
        </div>
      )}

      {config.status === 'error' && (
        <div className="flex items-start gap-3 py-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-300">{config.message}</p>
            <button
              onClick={() => onUpdate({ status: 'ready', message: '' })}
              className="text-xs text-red-400 hover:text-red-300 font-medium mt-1"
            >
              Try Again →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Component for previously uploaded files
function UploadedFileCard({ file, connectedExchanges, onRefresh }) {
  const alert = useAlert()
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false)
  const [linking, setLinking] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
        alert.success('Exchange linked successfully')
      } else {
        alert.error('Failed to link exchange')
      }
    } catch (error) {
      console.error('Error linking exchange:', error)
      alert.error('Failed to link exchange')
    } finally {
      setLinking(false)
      setShowExchangeDropdown(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch('/api/csv/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.hasDataIntegrityIssue) {
          // Data integrity issue - trades weren't properly linked
          alert.warning(
            `File deleted, but data integrity issue detected. Expected ${data.expectedTradesCount} trades, only deleted ${data.tradesDeleted}. This may indicate trades from this CSV weren't properly linked.`,
            {
              title: 'Partial Deletion',
              dismissAfter: 12000
            }
          )
        } else {
          // Normal deletion
          alert.success(
            `File deleted successfully. ${data.tradesDeleted || 0} associated trades removed.`,
            { title: 'File Deleted' }
          )
        }
        await onRefresh()
      } else {
        alert.error(data.error || 'Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert.error('Failed to delete file')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getAccountTypeLabel = (type) => {
    if (type === 'BOTH') return 'SPOT & FUTURES'
    return type
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-200 truncate">
              {file.label || file.filename}
            </span>
            <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded">
              {getAccountTypeLabel(file.account_type)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{(file.size / 1024).toFixed(1)} KB</span>
            <span>•</span>
            <span>{file.trades_count || 0} trades</span>
            {file.uploaded_at && (
              <>
                <span>•</span>
                <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
              </>
            )}
          </div>

          <div className="mt-2">
            {selectedExchange ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Linked to:</span>
                <span className="flex items-center gap-1">
                  <span>{selectedExchange.icon}</span>
                  <span className="text-slate-300">{selectedExchange.name}</span>
                </span>
              </div>
            ) : (
              <div className="relative inline-block">
                <button
                  onClick={() => setShowExchangeDropdown(!showExchangeDropdown)}
                  disabled={linking}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                >
                  {linking ? 'Linking...' : 'Link to Exchange →'}
                </button>

                {showExchangeDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExchangeDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 min-w-[200px]">
                      {connectedExchanges.map(exchange => (
                        <button
                          key={exchange.id}
                          onClick={() => handleLinkExchange(exchange.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                        >
                          <span>{exchange.icon}</span>
                          <span className="text-slate-200">{exchange.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Delete file"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <ConfirmAlert
              variant="warning"
              title="Delete CSV File?"
              message={`Are you sure you want to delete "${file.label || file.filename}"? All ${file.trades_count || 0} associated trades will be permanently removed from the database. This action cannot be undone.`}
              confirmText="Yes, Delete File"
              cancelText="Keep File"
              confirmVariant="danger"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setShowDeleteConfirm(false)}
              isLoading={isDeleting}
            />
          </div>
        </div>
      )}
    </div>
  )
}
