// app/api/subscriptions/invoice-pdf/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const invoiceId = searchParams.get('invoiceId')
    const format = searchParams.get('format') || 'pdf' // 'pdf' or 'html'

    if (!userId || !invoiceId) {
      return NextResponse.json(
        { error: 'User ID and Invoice ID required' },
        { status: 400 }
      )
    }

    // Fetch invoice data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single()

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Fetch user data
    const { data: userData } = await supabase.auth.admin.getUserById(userId)

    // Generate invoice HTML
    const invoiceHtml = generateInvoiceHTML(invoice, userData?.user)

    // If format is HTML, return HTML directly (for viewing in browser)
    if (format === 'html') {
      return new NextResponse(invoiceHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.html"`,
        },
      })
    }

    // For PDF format, try to generate PDF using browser print API
    // Since we're in a server environment, we'll return HTML with print styles
    // The browser can print this to PDF, or we can use a service like Puppeteer
    // For now, return HTML optimized for printing/PDF conversion
    const pdfOptimizedHtml = generatePDFOptimizedHTML(invoiceHtml)

    return new NextResponse(pdfOptimizedHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        // Note: This will download as HTML. For true PDF, you'd need Puppeteer or similar
        // The user can print this to PDF from their browser
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}

function generatePDFOptimizedHTML(html) {
  // Add print-specific styles and script to trigger print dialog
  return html.replace(
    '</head>',
    `
    <style>
      @media print {
        body { margin: 0; padding: 0; }
        .no-print { display: none; }
      }
      @page {
        margin: 1cm;
        size: A4;
      }
    </style>
    <script>
      // Auto-trigger print dialog when loaded (optional - can be removed)
      // window.onload = function() { window.print(); }
    </script>
    </head>`
  )
}

function generateInvoiceHTML(invoice, user) {
  const formattedDate = new Date(invoice.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1e293b;
      background: #ffffff;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-number {
      font-size: 18px;
      font-weight: 600;
      color: #64748b;
    }
    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .section h3 {
      font-size: 14px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 10px;
    }
    .section p {
      margin: 5px 0;
      color: #1e293b;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      margin-top: 20px;
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.grand-total {
      font-size: 18px;
      font-weight: bold;
      border-top: 2px solid #1e293b;
      padding-top: 12px;
      margin-top: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 0;
      }
      .invoice-container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        <div class="logo">TradeClarity</div>
        <p style="color: #64748b; margin-top: 5px;">Trading Analytics Platform</p>
      </div>
      <div class="invoice-title">
        <div class="invoice-number">Invoice #${invoice.invoice_number}</div>
        <p style="color: #64748b; margin-top: 5px;">${formattedDate}</p>
      </div>
    </div>

    <div class="details">
      <div class="section">
        <h3>Bill To</h3>
        <p><strong>${user?.email || 'N/A'}</strong></p>
        <p>${user?.user_metadata?.name || ''}</p>
      </div>
      <div class="section">
        <h3>Payment Details</h3>
        <p><strong>Status:</strong> ${invoice.status === 'paid' ? 'Paid' : 'Pending'}</p>
        <p><strong>Payment Method:</strong> ${invoice.payment_method || 'Razorpay'}</p>
        ${invoice.paid_at ? `<p><strong>Paid On:</strong> ${new Date(invoice.paid_at).toLocaleDateString()}</p>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${invoice.description || `Subscription - ${invoice.plan_name || 'Plan'}`}</strong>
            ${invoice.billing_period ? `<br><span style="color: #64748b; font-size: 12px;">${invoice.billing_period}</span>` : ''}
          </td>
          <td class="text-right">
            <strong>${invoice.currency || 'INR'} ${(invoice.amount / 100).toFixed(2)}</strong>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${invoice.currency || 'INR'} ${(invoice.amount / 100).toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Tax:</span>
        <span>${invoice.currency || 'INR'} ${((invoice.tax_amount || 0) / 100).toFixed(2)}</span>
      </div>
      <div class="total-row grand-total">
        <span>Total:</span>
        <span>${invoice.currency || 'INR'} ${((invoice.amount + (invoice.tax_amount || 0)) / 100).toFixed(2)}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for using TradeClarity!</p>
      <p>For questions about this invoice, contact us at tradeclarity.help@gmail.com</p>
    </div>
  </div>
</body>
</html>
  `
}
