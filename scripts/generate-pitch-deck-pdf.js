#!/usr/bin/env node

/**
 * Script to generate pitch-deck.pdf from pitch-deck.html using Puppeteer
 * Usage: node scripts/generate-pitch-deck-pdf.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  const htmlPath = path.join(__dirname, '..', 'docs', 'pitch-deck.html');
  const pdfPath = path.join(__dirname, '..', 'docs', 'pitch-deck.pdf');
  
  // Check if HTML file exists
  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ HTML file not found: ${htmlPath}`);
    process.exit(1);
  }

  console.log('🚀 Starting PDF generation...');
  console.log(`📄 HTML: ${htmlPath}`);
  console.log(`📄 PDF: ${pdfPath}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set a longer timeout for large HTML files
    page.setDefaultTimeout(60000);
    
    // Read HTML file
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Set content with HTML - use 'load' instead of 'networkidle0' for setContent
    await page.setContent(htmlContent, {
      waitUntil: 'load',
      timeout: 60000
    });

    // Wait a bit for any images/styles to fully render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });

    console.log('✅ PDF generated successfully!');
    console.log(`📄 Output: ${pdfPath}`);
    
    // Check file size
    const stats = fs.statSync(pdfPath);
    console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
generatePDF()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
