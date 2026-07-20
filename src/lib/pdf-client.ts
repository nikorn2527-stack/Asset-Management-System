/**
 * Client-side PDF generation using browser print dialog.
 * Opens a new window with the HTML and triggers print.
 * Handles both full HTML documents and HTML fragments from templates.
 * Properly loads Thai fonts before printing to prevent garbled text.
 */

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;600;700&display=swap';

function isFullDocument(html: string): boolean {
  return /<!DOCTYPE\s+html/i.test(html) || /<html[\s>]/i.test(html);
}

function enhanceFullDocument(html: string): string {
  // Add preconnect for faster font loading
  const preconnect = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;

  // Font loading script to ensure Thai fonts are ready before print
  const fontWaitScript = `<script>
(function() {
  var testString = 'สวัสดีครับ ระบบบริหารจัดการครุภัณฑ์';
  var fontFace = 'Noto Sans Thai';
  var maxWait = 8000;
  var startTime = Date.now();

  function tryPrint() {
    document.fonts.load('400 16px "' + fontFace + '"', testString).then(function(loaded) {
      return document.fonts.ready;
    }).then(function() {
      // Verify font is actually loaded
      if (document.fonts.check('400 16px "' + fontFace + '"', testString)) {
        setTimeout(function() { window.print(); }, 500);
      } else {
        // Font not ready yet, retry or use fallback
        var elapsed = Date.now() - startTime;
        if (elapsed < maxWait) {
          setTimeout(tryPrint, 500);
        } else {
          // Fallback: print anyway after max wait
          window.print();
        }
      }
    }).catch(function() {
      // Font loading failed, print with fallback fonts
      setTimeout(function() { window.print(); }, 1000);
    });
  }

  if (document.fonts && document.fonts.load) {
    // Small delay to let the document render first
    setTimeout(tryPrint, 300);
  } else {
    // No Font Loading API, just wait and print
    setTimeout(function() { window.print(); }, 2000);
  }
})();
</script>`;

  // Inject preconnect and font link into <head>
  if (/<head[^>]*>/i.test(html)) {
    // Add preconnect right after <head>
    html = html.replace(/(<head[^>]*>)/i, '$1\n' + preconnect);
  }

  // Inject Google Fonts link - replace existing font link or add new one
  if (/<link[^>]*fonts\.googleapis\.com[^>]*>/i.test(html)) {
    html = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/i, '<link href="' + GOOGLE_FONTS_URL + '" rel="stylesheet">');
  } else if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/(<head[^>]*>)/i, '$1\n<link href="' + GOOGLE_FONTS_URL + '" rel="stylesheet">');
  }

  // Inject font wait script before </body>
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, fontWaitScript + '\n</body>');
  } else {
    html += fontWaitScript;
  }

  return html;
}

function wrapFragment(html: string, filename: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_FONTS_URL}" rel="stylesheet">
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
  <script>
  (function() {
    var testString = 'สวัสดีครับ ระบบบริหารจัดการครุภัณฑ์';
    var fontFace = 'Noto Sans Thai';
    var maxWait = 8000;
    var startTime = Date.now();
    function tryPrint() {
      document.fonts.load('400 16px "' + fontFace + '"', testString).then(function(loaded) {
        return document.fonts.ready;
      }).then(function() {
        if (document.fonts.check('400 16px "' + fontFace + '"', testString)) {
          setTimeout(function() { window.print(); }, 500);
        } else {
          var elapsed = Date.now() - startTime;
          if (elapsed < maxWait) { setTimeout(tryPrint, 500); }
          else { window.print(); }
        }
      }).catch(function() {
        setTimeout(function() { window.print(); }, 1000);
      });
    }
    if (document.fonts && document.fonts.load) {
      setTimeout(tryPrint, 300);
    } else {
      setTimeout(function() { window.print(); }, 2000);
    }
  })();
  </script>
</head>
<body>${html}</body>
</html>`;
}

export async function generatePdfFromHtml(html: string, filename: string): Promise<void> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Cannot open print window. Please allow popups.');
  }

  let finalHtml: string;

  if (isFullDocument(html)) {
    // Template returns a full HTML document - enhance it, don't wrap it
    finalHtml = enhanceFullDocument(html);
  } else {
    // Template returns an HTML fragment - wrap it
    finalHtml = wrapFragment(html, filename);
  }

  printWindow.document.open();
  printWindow.document.write(finalHtml);
  printWindow.document.close();
}

export async function downloadPDF(html: string, filename: string): Promise<void> {
  return generatePdfFromHtml(html, filename);
}