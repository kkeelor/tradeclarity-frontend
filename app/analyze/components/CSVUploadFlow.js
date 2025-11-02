// app/analyze/components/CSVUploadFlow.js
'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Upload, FileText, X, AlertCircle, CheckCircle, Trash2, Home, LogOut, Sparkles, Loader2, Check, ChevronDown, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { ExchangeIcon } from '@/components/ui'
import { toast } from 'sonner'
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
import Sidebar from './Sidebar'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file

export default function CSVUploadFlow({ onBack }) {
  const { user } = useAuth()
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
          exchange: conn.exchange
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
        progress: 'Analyzing CSV format...',
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
          toast.success(
            `Format detected: ${detection.detectedExchange || 'Unknown'} (${Math.round(detection.confidence * 100)}% confidence)`,
            { duration: 3000 }
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
        toast.error('Parse Error', { description: errorMsg })
        return
      }

      // Show success toast for successful parsing
      toast.success('File parsed successfully', { duration: 2000 })

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
        toast.error('Upload Error', { description: errorMsg })
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

      console.log('📊 Store Response:', {
        success: storeData.success,
        tradesCount: storeData.tradesCount || 0,
        alreadyExisted: storeData.alreadyExisted || 0,
        error: storeData.error
      })

      if (!storeResponse.ok || !storeData.success) {
        const errorMsg = storeData.error || 'Failed to store trades'
        updateConfig(configId, {
          status: 'error',
          message: errorMsg
        })
        toast.error('Storage Error', { description: errorMsg })
        return
      }

      // Success!
      const newTrades = storeData.tradesCount || 0
      const duplicates = storeData.alreadyExisted || 0

      // Step 4: Update CSV metadata with actual trade count
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
        console.log('✅ Updated CSV trade count:', newTrades)
      } catch (error) {
        console.error('⚠️ Failed to update CSV trade count:', error)
        // Non-critical error - don't fail the upload
      }

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
      toast.success(
        'Import Complete',
        {
          description: `${newTrades} trade${newTrades !== 1 ? 's' : ''} imported successfully`,
          duration: 5000
        }
      )

      // Show warning toast for duplicates
      if (duplicates > 0) {
        toast.warning(
          `${duplicates} duplicate trade${duplicates !== 1 ? 's' : ''} skipped`,
          { duration: 4000 }
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
      toast.error('Upload Failed', {
        description: errorMsg,
        duration: 6000
      })
    }
  }

  const handleSignOut = async () => {
    const timeoutId = setTimeout(() => {
      window.location.href = '/'
    }, 3000)

    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      clearTimeout(timeoutId)
      window.location.href = '/'
    } catch (error) {
      clearTimeout(timeoutId)
      window.location.href = '/'
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
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/30 rounded-2xl p-5 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full opacity-50" />
              <div className="relative flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Upload CSV files from your exchanges to analyze your trading data. You can optionally link files to connected exchanges.
                  </p>
                </div>
              </div>
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
                  {allProcessed && (
                    <button
                      onClick={onBack}
                      className="group px-5 py-2.5 bg-gradient-to-r from-slate-700/60 to-slate-700/40 hover:from-slate-700/80 hover:to-slate-700/60 border border-slate-600/50 hover:border-slate-600/70 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 hover:scale-105"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
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
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-300">
                    Previously Uploaded Files
                  </h3>
                </div>
                <UploadedFilesSkeleton count={3} />
              </div>
            ) : uploadedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-300">
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
    <div className={`relative overflow-hidden border rounded-2xl p-5 transition-all backdrop-blur-sm ${getStatusColor(config.status)}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/10" />
      <div className="relative">
      {/* File name and remove button */}
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
          {/* Warning for duplicate filename */}
          {config.warning && (
            <div className="relative overflow-hidden flex items-start gap-2 text-xs text-yellow-300 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/30 rounded-xl p-3 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{config.warning}</span>
            </div>
          )}

          {/* Label input */}
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

          {/* Exchange selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Link to Exchange (optional)</label>
            <div className="relative">
              <button
                onClick={() => setShowExchangeDropdown(!showExchangeDropdown)}
                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-left flex items-center justify-between hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all"
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
                        <ExchangeIcon exchange={exchange.exchange} size={14} className="w-6 h-6 p-1" />
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
                  {config.duplicatesCount > 0 && ` • ${config.duplicatesCount} duplicates skipped`}
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
                Try Again <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// Component for previously uploaded files
function UploadedFileCard({ file, connectedExchanges, onRefresh }) {
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
          toast.warning(
            'Partial Deletion',
            {
              description: `File deleted, but data integrity issue detected. Expected ${data.expectedTradesCount} trades, only deleted ${data.tradesDeleted}. This may indicate trades from this CSV weren't properly linked.`,
              duration: 12000
            }
          )
        } else {
          // Normal deletion
          toast.success(
            'File Deleted',
            { description: `File deleted successfully. ${data.tradesDeleted || 0} associated trades removed.` }
          )
        }
        await onRefresh()
      } else {
        toast.error(data.error || 'Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file')
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
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-800/30 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm hover:border-slate-600/50 transition-all">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 via-transparent to-transparent" />
      <div className="relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {selectedExchange ? (
              <ExchangeIcon exchange={selectedExchange.exchange} size={16} className="w-4 h-4 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
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
                          <ExchangeIcon exchange={exchange.exchange} size={14} className="w-6 h-6 p-1" />
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
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/30"
            title="Delete file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent
          className="max-w-md"
          onEscapeKeyDown={() => setShowDeleteConfirm(false)}
          onPointerDownOutside={() => setShowDeleteConfirm(false)}
        >
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
                  "{file.label || file.filename}" and all {file.trades_count || 0} associated trades will be permanently removed. This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="border-t border-slate-700/50 pt-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
              <span className="text-sm text-slate-300">Trades to delete</span>
              <span className="font-semibold text-red-400">{file.trades_count || 0}</span>
            </div>
          </div>

          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500"
            >
              {isDeleting ? (
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
    </div>
  )
}
