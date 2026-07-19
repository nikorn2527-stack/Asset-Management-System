/**
 * Client-side PDF generation using browser print dialog.
 * Opens a new window with the HTML and triggers print.
 * This approach has better Thai font rendering and doesn't need server-side Puppeteer.
 */

export async function generatePdfFromHtml(html: string, filename: string): Promise<void> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Cannot open print window. Please allow popups.');
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: 'Noto Sans Thai', 'Sarabun', sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);
  printWindow.document.close();

  // Wait for fonts to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}

export async function downloadPDF(html: string, filename: string): Promise<void> {
  return generatePdfFromHtml(html, filename);
}