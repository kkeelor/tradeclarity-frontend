'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function FeedbackModal({ open, onOpenChange }) {
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error('Please enter feedback')
      return
    }

    if (feedback.length > 150) {
      toast.error('Feedback must be 150 characters or less')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: feedback.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      toast.success('Thank you for your feedback!')
      setFeedback('')
      onOpenChange(false)
    } catch (error) {
      console.error('Feedback submission error:', error)
      toast.error(error.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 max-w-md [&>button]:text-white [&>button]:hover:text-white/80">
        <DialogHeader>
          <DialogTitle className="text-white/90">Feedback</DialogTitle>
          <DialogDescription className="text-white/60">
            Share your thoughts (max 150 characters)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Your feedback..."
            maxLength={150}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
            rows={3}
            disabled={submitting}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {feedback.length}/150
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFeedback('')
                  onOpenChange(false)
                }}
                disabled={submitting}
                className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !feedback.trim()}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
