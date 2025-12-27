// app/contact/page.js
'use client'

import { useState } from 'react'
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import Footer from '../components/Footer'

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Create mailto link to send email
      const subject = encodeURIComponent(formData.subject)
      const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`)
      const mailtoLink = `mailto:tradeclarity.help@gmail.com?subject=${subject}&body=${body}`
      
      // Open email client
      window.location.href = mailtoLink
      
      toast.success('Opening your email client...')
      setSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      toast.error('Failed to open email client. Please email us directly at tradeclarity.help@gmail.com')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-white/60 hover:text-white/90 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white/80" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white/90">Contact Us</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-white/90">Get in Touch</h2>
              <p className="text-white/60 mb-6">
                Have questions? We're here to help. Reach out to us and we'll respond as soon as possible.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-black">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 mb-1">Email</h3>
                  <a href="mailto:tradeclarity.help@gmail.com" className="text-white/80 hover:text-white/90 text-sm">
                    tradeclarity.help@gmail.com
                  </a>
                  <p className="text-xs text-white/50 mt-1">We typically respond within 24 hours</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-black">
                <h3 className="font-semibold text-white/90 mb-2">Support Hours</h3>
                <p className="text-sm text-white/60">
                  Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                  Saturday - Sunday: Closed
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-xl border border-white/10 bg-black p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white/80" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white/90">Message Sent!</h3>
                <p className="text-white/60 mb-6">
                  We've received your message and will get back to you soon.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-white/90 transition-all"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white/70">
                    Name
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-white/20 focus:ring-white/10"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-white/70">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-white/20 focus:ring-white/10"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <Label htmlFor="subject" className="text-white/70">
                    Subject
                  </Label>
                  <Input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-white/20 focus:ring-white/10"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-white/70">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-white/20 focus:ring-white/10 resize-none"
                    placeholder="Tell us how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <h2 className="text-2xl font-semibold mb-6 text-white/90">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: 'How quickly do you respond?',
                a: 'We typically respond to all inquiries within 24 hours during business days.'
              },
              {
                q: 'Do you offer phone support?',
                a: 'Currently, we provide support via email. For urgent matters, please indicate "URGENT" in your subject line.'
              },
              {
                q: 'Can I get help with technical issues?',
                a: 'Yes! Our support team can help with account setup, API connections, data import, and platform usage questions.'
              },
              {
                q: 'What if I need a refund?',
                a: 'Please contact us with your account email and reason for refund. We offer a 7-day money-back guarantee for new subscriptions.'
              }
            ].map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border border-white/10 rounded-xl bg-black px-6 mb-3">
                <AccordionTrigger className="text-left font-medium text-white/80 hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-white/60 pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      <Footer />
    </div>
  )
}
