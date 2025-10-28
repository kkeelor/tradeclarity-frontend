// app/components/AlertDemo.js
'use client'

import { useState } from 'react'
import { useAlert, InlineAlert, CompactAlert, ConfirmAlert, Button } from '@/app/components'
import { Trash2 } from 'lucide-react'

/**
 * Demo component showing all alert variants
 *
 * To use this demo, create a page:
 *
 * // app/demo/alerts/page.js
 * import { AlertDemo } from '@/app/components/AlertDemo'
 * export default function AlertDemoPage() {
 *   return <AlertDemo />
 * }
 */
export function AlertDemo() {
  const alert = useAlert()
  const [showInlineAlert, setShowInlineAlert] = useState(true)
  const [showCompactAlert, setShowCompactAlert] = useState(true)
  const [showConfirmAlert, setShowConfirmAlert] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsDeleting(false)
    setShowConfirmAlert(false)
    alert.success('File deleted successfully!')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Alert System Demo</h1>
          <p className="text-slate-400">
            Test all alert variants and use cases
          </p>
        </div>

        {/* Toast Notifications */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Toast Notifications</h2>
          <p className="text-slate-400">
            Click buttons to trigger toast notifications in the top-right corner
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => alert.success('Operation completed successfully!')}
              variant="primary"
            >
              Success Toast
            </Button>

            <Button
              onClick={() => alert.error('Something went wrong. Please try again.')}
              variant="danger"
            >
              Error Toast
            </Button>

            <Button
              onClick={() => alert.warning('This action cannot be undone!')}
              variant="secondary"
            >
              Warning Toast
            </Button>

            <Button
              onClick={() => alert.info('New feature available in settings')}
              variant="secondary"
            >
              Info Toast
            </Button>
          </div>

          <div className="space-y-3 pt-4">
            <h3 className="font-semibold text-lg">With Title & Options</h3>

            <Button
              onClick={() => alert.success('73 trades imported successfully', {
                title: 'Import Complete',
                dismissAfter: 10000
              })}
              variant="primary"
              className="w-full"
            >
              Success with Title (10s)
            </Button>

            <Button
              onClick={() => alert.error('Failed to connect to Binance API', {
                title: 'Connection Error',
                autoDismiss: false
              })}
              variant="danger"
              className="w-full"
            >
              Error (Manual Dismiss)
            </Button>

            <Button
              onClick={() => alert.warning('You have unsaved changes', {
                title: 'Unsaved Changes',
                actions: (
                  <div className="flex gap-2">
                    <button
                      onClick={() => alert.success('Changes saved!')}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 rounded text-sm transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => alert.info('Changes discarded')}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
                    >
                      Discard
                    </button>
                  </div>
                )
              })}
              variant="secondary"
              className="w-full"
            >
              Warning with Actions
            </Button>
          </div>
        </section>

        {/* Inline Alerts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Inline Alerts</h2>
          <p className="text-slate-400">
            Embedded alerts that are part of the page layout
          </p>

          {showInlineAlert && (
            <InlineAlert
              variant="warning"
              title="API Key Required"
              message="Please connect your exchange API to enable automatic trade imports. Go to Settings > Integrations."
              onClose={() => setShowInlineAlert(false)}
            />
          )}

          {!showInlineAlert && (
            <Button onClick={() => setShowInlineAlert(true)} variant="secondary">
              Show Inline Alert
            </Button>
          )}

          <InlineAlert
            variant="success"
            title="AI Detection Enabled"
            message="Your CSV uploads will now automatically detect the exchange format using AI."
          />

          <InlineAlert
            variant="info"
            message="Your analytics are updated in real-time as new trades are imported."
          />

          <InlineAlert
            variant="error"
            title="Connection Failed"
            message="Unable to reach the server. Please check your internet connection."
          />
        </section>

        {/* Compact Alerts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Compact Alerts</h2>
          <p className="text-slate-400">
            Smaller alerts for less critical messages
          </p>

          {showCompactAlert && (
            <CompactAlert
              variant="info"
              message="Your analytics have been updated with the latest trades"
              onClose={() => setShowCompactAlert(false)}
            />
          )}

          {!showCompactAlert && (
            <Button onClick={() => setShowCompactAlert(true)} variant="secondary">
              Show Compact Alert
            </Button>
          )}

          <CompactAlert
            variant="success"
            message="Settings saved"
          />

          <CompactAlert
            variant="warning"
            message="Low trading volume detected this week"
          />
        </section>

        {/* Confirm Alerts */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Confirm Alerts</h2>
          <p className="text-slate-400">
            Confirmation dialogs for destructive actions
          </p>

          <Button
            onClick={() => setShowConfirmAlert(true)}
            variant="danger"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete CSV File
          </Button>

          {showConfirmAlert && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="max-w-lg w-full">
                <ConfirmAlert
                  variant="warning"
                  title="Delete CSV File?"
                  message="Are you sure you want to delete 'FuturesTradeHistory.csv'? All 73 associated trades will be permanently removed from the database. This action cannot be undone."
                  confirmText="Yes, Delete"
                  cancelText="Keep File"
                  confirmVariant="danger"
                  onConfirm={handleDelete}
                  onCancel={() => setShowConfirmAlert(false)}
                  isLoading={isDeleting}
                />
              </div>
            </div>
          )}
        </section>

        {/* Usage Code Examples */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Code Examples</h2>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-slate-300">
{`// Toast notification
const alert = useAlert()
alert.success('File uploaded!')
alert.error('Failed to connect')

// With options
alert.warning('Unsaved changes', {
  title: 'Warning',
  dismissAfter: 10000,
  autoDismiss: false
})

// Inline alert
<InlineAlert
  variant="success"
  title="Success"
  message="Operation completed"
  onClose={() => setShow(false)}
/>

// Confirm alert
<ConfirmAlert
  variant="warning"
  title="Delete File?"
  message="This cannot be undone"
  onConfirm={handleDelete}
  onCancel={handleCancel}
  isLoading={isDeleting}
/>`}
            </pre>
          </div>
        </section>

        {/* Testing Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Stress Test</h2>
          <p className="text-slate-400">
            Test multiple toasts at once (max 5 shown)
          </p>

          <Button
            onClick={() => {
              alert.success('Success notification 1')
              setTimeout(() => alert.info('Info notification 2'), 200)
              setTimeout(() => alert.warning('Warning notification 3'), 400)
              setTimeout(() => alert.error('Error notification 4'), 600)
              setTimeout(() => alert.success('Success notification 5'), 800)
              setTimeout(() => alert.info('This one will push the first out'), 1000)
            }}
            variant="secondary"
            className="w-full"
          >
            Trigger Multiple Toasts
          </Button>
        </section>
      </div>
    </div>
  )
}
