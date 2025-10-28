# Alert System Guide

A comprehensive, reusable alert/notification system for TradeClarity, designed to match the Binance-inspired black and gold theme.

## Components Overview

### 1. **Toast Notifications** (Global, auto-dismissing)
Use the `useAlert()` hook for global toast notifications that appear in the corner of the screen.

### 2. **Inline Alerts** (Embedded in pages)
Use `<InlineAlert>` for alerts that are part of the page layout.

### 3. **Confirm Alerts** (Action confirmations)
Use `<ConfirmAlert>` for confirmation dialogs with action buttons.

### 4. **Compact Alerts** (Small, minimal)
Use `<CompactAlert>` for less important messages.

---

## 🎯 Quick Start

### Toast Notifications (Most Common)

```jsx
'use client'

import { useAlert } from '@/app/components'

function MyComponent() {
  const alert = useAlert()

  const handleSuccess = () => {
    alert.success('File uploaded successfully!')
  }

  const handleError = () => {
    alert.error('Failed to upload file')
  }

  const handleWarning = () => {
    alert.warning('This action cannot be undone')
  }

  const handleInfo = () => {
    alert.info('New feature available')
  }

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleWarning}>Show Warning</button>
      <button onClick={handleInfo}>Show Info</button>
    </div>
  )
}
```

---

## 📋 Usage Examples

### 1. Toast Notifications (Global)

#### Basic Usage
```jsx
import { useAlert } from '@/app/components'

const alert = useAlert()

// Simple message
alert.success('Trade saved!')
alert.error('Connection failed')
alert.warning('Low balance detected')
alert.info('Market analysis complete')
```

#### With Title and Custom Options
```jsx
alert.success('Upload Complete', {
  title: 'Success',
  dismissAfter: 10000, // 10 seconds
  autoDismiss: true
})

alert.error('Failed to connect to Binance API', {
  title: 'Connection Error',
  autoDismiss: false, // Manual dismiss only
})
```

#### With Action Buttons
```jsx
alert.warning('You have unsaved changes', {
  title: 'Unsaved Changes',
  actions: (
    <div className="flex gap-2">
      <button
        onClick={() => saveChanges()}
        className="px-3 py-1 bg-emerald-500 rounded text-sm"
      >
        Save
      </button>
      <button
        onClick={() => discardChanges()}
        className="px-3 py-1 bg-slate-700 rounded text-sm"
      >
        Discard
      </button>
    </div>
  )
})
```

---

### 2. Inline Alerts (Embedded in Pages)

```jsx
import { InlineAlert } from '@/app/components'

function SettingsPage() {
  const [showAlert, setShowAlert] = useState(true)

  return (
    <div>
      {showAlert && (
        <InlineAlert
          variant="warning"
          title="API Key Required"
          message="Please connect your exchange API to enable automatic trade imports."
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* Rest of page content */}
    </div>
  )
}
```

---

### 3. Confirm Alerts (Action Confirmations)

Perfect for delete confirmations, dangerous actions, etc.

```jsx
import { ConfirmAlert } from '@/app/components'
import { Modal } from '@/app/components'

function DeleteCSVModal({ isOpen, onClose, fileName }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteFile()
      alert.success('File deleted successfully')
      onClose()
    } catch (error) {
      alert.error('Failed to delete file')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ConfirmAlert
        variant="warning"
        title="Delete CSV File?"
        message={`Are you sure you want to delete "${fileName}"? All associated trades will be permanently removed from the database. This action cannot be undone.`}
        confirmText="Delete File"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={onClose}
        isLoading={isDeleting}
      />
    </Modal>
  )
}
```

---

### 4. Compact Alerts (Small Notifications)

```jsx
import { CompactAlert } from '@/app/components'

function NotificationBanner() {
  const [show, setShow] = useState(true)

  return (
    show && (
      <CompactAlert
        variant="info"
        message="Your analytics have been updated with the latest trades"
        onClose={() => setShow(false)}
      />
    )
  )
}
```

---

## 🎨 Variants

All alert components support 4 variants:

- **`success`** - Green, for successful operations (CheckCircle icon)
- **`error`** - Red, for errors and failures (AlertCircle icon)
- **`warning`** - Yellow, for warnings and cautions (AlertTriangle icon)
- **`info`** - Blue, for informational messages (Info icon)

---

## 🔧 API Reference

### useAlert Hook

```typescript
const alert = useAlert()

// Methods
alert.success(message, options?)
alert.error(message, options?)
alert.warning(message, options?)
alert.info(message, options?)
alert.addToast(toastConfig)
alert.removeToast(id)
alert.clearAll()

// Options
{
  title?: string
  message: string
  autoDismiss?: boolean  // Default: true
  dismissAfter?: number  // Default: 5000ms
  actions?: ReactNode
}
```

### InlineAlert Props

```typescript
<InlineAlert
  variant="success" | "error" | "warning" | "info"
  title?: string
  message: string
  onClose?: () => void
  className?: string
/>
```

### ConfirmAlert Props

```typescript
<ConfirmAlert
  variant="success" | "error" | "warning" | "info"
  title: string
  message: string
  confirmText?: string      // Default: "Confirm"
  cancelText?: string       // Default: "Cancel"
  confirmVariant?: "danger" | "success"  // Default: "danger"
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
/>
```

### CompactAlert Props

```typescript
<CompactAlert
  variant="success" | "error" | "warning" | "info"
  message: string
  onClose?: () => void
  className?: string
/>
```

---

## 🌍 AlertProvider Configuration

The AlertProvider is already set up in `layout.js`. You can customize:

```jsx
<AlertProvider
  position="top-right"  // or "top-left", "bottom-right", etc.
  maxToasts={5}         // Maximum number of toasts shown at once
>
  {children}
</AlertProvider>
```

**Available positions:**
- `top-right` (default)
- `top-left`
- `top-center`
- `bottom-right`
- `bottom-left`
- `bottom-center`

---

## 💡 Real-World Examples

### CSV Upload Success
```jsx
alert.success('73 trades imported successfully', {
  title: 'Import Complete',
  dismissAfter: 7000
})
```

### API Connection Error
```jsx
alert.error('Failed to connect to Binance API. Please check your credentials.', {
  title: 'Connection Error',
  autoDismiss: false
})
```

### Delete Confirmation
```jsx
<ConfirmAlert
  variant="warning"
  title="Delete CSV Upload?"
  message="This will permanently delete this CSV file and all 73 associated trades from the database. This action cannot be undone."
  confirmText="Yes, Delete"
  cancelText="Keep File"
  confirmVariant="danger"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  isLoading={isDeleting}
/>
```

### Feature Announcement
```jsx
alert.info('AI-powered CSV detection is now available!', {
  title: 'New Feature',
  dismissAfter: 10000,
  actions: (
    <button
      onClick={() => router.push('/docs/ai-detection')}
      className="text-blue-400 underline text-sm"
    >
      Learn More
    </button>
  )
})
```

---

## 🎯 Best Practices

1. **Use toast notifications for user actions** (file uploaded, settings saved, etc.)
2. **Use inline alerts for page-level information** (missing API key, low data warning)
3. **Use confirm alerts for destructive actions** (delete, reset, clear)
4. **Keep messages concise** - Users should understand at a glance
5. **Don't overuse** - Too many notifications become noise
6. **Choose appropriate dismissal times:**
   - Success: 5 seconds (default)
   - Error: Manual dismiss or 10+ seconds
   - Info: 7-10 seconds
   - Warning: Manual dismiss for important warnings

---

## 🔄 Integration Examples

### In API Routes (Server-side)
Not directly possible, but return success/error responses:

```javascript
// API route
return NextResponse.json({
  success: true,
  message: 'Trades imported successfully'
})

// In component
const response = await fetch('/api/trades/store', { ... })
const data = await response.json()

if (data.success) {
  alert.success(data.message)
} else {
  alert.error(data.error)
}
```

### In CSV Upload Flow
```javascript
// When AI detection succeeds
alert.success(`${detection.detectedExchange} detected`, {
  title: 'Format Recognized',
  dismissAfter: 3000
})

// When parsing fails
alert.error('Failed to parse CSV. Please check the format.', {
  title: 'Parse Error',
  autoDismiss: false
})

// When duplicate trades found
alert.warning(`${duplicateCount} duplicate trades were skipped`, {
  title: 'Duplicates Found',
  dismissAfter: 7000
})
```

---

## 🎨 Customization

All alerts use your app's design tokens from `globals.css`:

- Dark background: `bg-slate-900`, `bg-slate-800`
- Borders: `border-slate-700`
- Text: `text-slate-300`, `text-slate-400`
- Variants use semantic colors (emerald for success, red for error, etc.)

To customize further, modify the variant configuration in `Alert.js`:

```javascript
const variants = {
  success: {
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    // ...
  }
}
```

---

## 📦 Files Created

- `/app/components/Alert.js` - Core alert components
- `/app/components/AlertProvider.js` - Context provider and hooks
- Updated `/app/components/index.js` - Component exports
- Updated `/app/layout.js` - AlertProvider integration

---

## ✅ Ready to Use!

The alert system is now fully integrated and ready to use throughout your app. Simply import and start using:

```jsx
import { useAlert, InlineAlert, ConfirmAlert } from '@/app/components'
```

Happy alerting! 🎉
