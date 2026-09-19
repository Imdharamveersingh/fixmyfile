import { spawn } from 'child_process';
import http from 'http';
import { PDFDocument } from 'pdf-lib';

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('STARTING WORD -> PDF REGRESSION TEST SUITE');
  console.log('====================================================\n');

  // Launch Chrome headless
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:5173/word-to-pdf'
  ]);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget) throw new Error('No page target found');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let reqId = 1;
  const pendingRequests = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(new Error(JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise((r) => setTimeout(r, 1500));

  // Helper function to test converting a docx file in the app
  async function testConvertFile(fileName, expectedPages) {
    console.log(`\n--- Testing: ${fileName} (expected: ${expectedPages} pages) ---`);

    // Reset app state if needed
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (() => {
          const changeBtn = document.querySelector('button.btn-secondary');
          const clearBtn = document.querySelector('button.btn-text-danger');
          const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Convert Another File'));
          if (resetBtn) resetBtn.click();
          else if (clearBtn) clearBtn.click();
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 500));

    // Load file and dispatch change event
    const triggerRes = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          try {
            const resp = await fetch('/${fileName}');
            if (!resp.ok) throw new Error('Failed to fetch ' + '/${fileName}' + ': ' + resp.statusText);
            const blob = await resp.blob();
            const file = new File([blob], '${fileName}', {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            const input = document.querySelector('input[type="file"]');
            if (!input) return { error: 'File input not found' };

            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));

            return { success: true };
          } catch(e) {
            return { error: e.message };
          }
        })()
      `
    });

    if (!triggerRes.result?.value || triggerRes.result.value.error) {
      throw new Error(`File load error: ${triggerRes.result?.value?.error}`);
    }

    await new Promise((r) => setTimeout(r, 600));

    // Click Convert to PDF
    const clickRes = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (() => {
          const btn = document.querySelector('.convert-btn');
          if (!btn) return { error: 'Convert button not found' };
          btn.click();
          return { clicked: true };
        })()
      `
    });

    if (clickRes.result?.value?.error) {
      throw new Error(`Click error: ${clickRes.result.value.error}`);
    }

    // Wait for conversion
    let pdfBase64 = null;
    let summaryText = '';
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const res = await send('Runtime.evaluate', {
        awaitPromise: true,
        returnByValue: true,
        expression: `
          (async () => {
            const successCard = document.querySelector('.conversion-success-card');
            const errorAlert = document.querySelector('.tool-alert-error');
            if (errorAlert) return { error: errorAlert.innerText };
            if (successCard) {
              const downloadBtn = successCard.querySelector('a.download-btn');
              if (downloadBtn && downloadBtn.href) {
                const r = await fetch(downloadBtn.href);
                const b = await r.blob();
                const reader = new FileReader();
                const b64 = await new Promise(res => {
                  reader.onloadend = () => res(reader.result.split(',')[1]);
                  reader.readAsDataURL(b);
                });
                return { done: true, base64: b64, text: successCard.innerText };
              }
            }
            return { done: false };
          })()
        `
      });

      const s = res.result?.value || {};
      if (s.error) throw new Error(`Conversion failed: ${s.error}`);
      if (s.done) {
        pdfBase64 = s.base64;
        summaryText = s.text;
        break;
      }
    }

    if (!pdfBase64) {
      throw new Error(`Conversion timed out for ${fileName}`);
    }

    const pdfBytes = Buffer.from(pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const count = pdfDoc.getPageCount();

    console.log(`UI Summary: ${summaryText.replace(/\s+/g, ' ')}`);
    console.log(`Actual Page Count: ${count}`);

    for (let i = 0; i < count; i++) {
      const p = pdfDoc.getPage(i);
      console.log(`  Page ${i + 1}: ${p.getWidth().toFixed(2)} x ${p.getHeight().toFixed(2)} pt`);
    }

    if (count !== expectedPages) {
      throw new Error(`Expected ${expectedPages} pages for ${fileName}, got ${count}!`);
    }

    console.log(`✓ Test passed: ${fileName} produced exactly ${count} pages.`);
    return { pdfBytes, pdfDoc };
  }

  // Run Test 1: Simple 1-page DOCX
  await testConvertFile('test-simple-1page.docx', 1);

  // Run Test 2: Difficult benchmark DOCX
  await testConvertFile('fixmyfile-difficult-word-test.docx', 3);

  // Clean up Chrome
  chrome.kill();

  console.log('\n====================================================');
  console.log('ALL WORD -> PDF REGRESSION TESTS PASSED (100%)!');
  console.log('====================================================');
  process.exit(0);
}

runRegressionSuite().catch((err) => {
  console.error('\n❌ Regression Test Failed:', err);
  process.exit(1);
});
