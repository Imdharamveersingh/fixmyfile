import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak
} from 'docx';

/**
 * PDF to Word (DOCX) Converter Engine V2
 * 
 * Targeted quality improvements:
 * 1. Conservative table detection converting structured PDF data into native Word tables.
 * 2. Natural paragraph grouping combining visual line wraps into coherent paragraphs.
 * 3. Explicit page-boundary tracking with clean page breaks and zero trailing blank pages.
 * 4. Inline formatting extraction (bold, italics, heading levels, font size).
 * 5. Full Unicode string preservation without lossy character stripping.
 */

/**
 * Extracts and structures text content from a single PDF.js page.
 */
export async function extractPageStructure(page, pageNum) {
  const textContent = await page.getTextContent();
  const rawItems = textContent.items || [];

  // Filter and normalize text items (ignore pure whitespace items from PDF stream)
  const items = rawItems
    .filter((it) => it.str !== undefined && it.str.trim().length > 0)
    .map((it) => {
      const tx = it.transform ? it.transform[4] : 0;
      const ty = it.transform ? it.transform[5] : 0;
      const scaleX = it.transform ? it.transform[0] : 1;
      const fontSize = Math.hypot(scaleX, it.transform ? it.transform[1] : 0) || it.height || 11;
      const fontName = it.fontName || '';
      const isBold = /bold|black|heavy|med/i.test(fontName);
      const isItalic = /italic|oblique/i.test(fontName);

      return {
        str: it.str,
        x: tx,
        y: ty,
        width: it.width,
        right: tx + it.width,
        height: it.height || fontSize,
        fontSize,
        fontName,
        isBold,
        isItalic,
        hasEOL: !!it.hasEOL
      };
    });

  if (items.length === 0) {
    return {
      elements: [
        new Paragraph({
          children: [
            new TextRun({
              text: `[Page ${pageNum}: No selectable text detected]`,
              italics: true,
              color: '888888',
              size: 22
            })
          ],
          spacing: { after: 200 }
        })
      ],
      totalChars: 0,
      detectedTables: []
    };
  }

  let totalChars = 0;
  items.forEach((it) => {
    totalChars += it.str.trim().length;
  });

  // Step 1: Sort items top-to-bottom (Y descending), then left-to-right (X ascending)
  items.sort((a, b) => {
    if (Math.abs(a.y - b.y) > 3.5) return b.y - a.y;
    return a.x - b.x;
  });

  // Step 2: Group items into visual lines
  const lines = [];
  let curLine = null;
  for (const it of items) {
    if (!curLine || Math.abs(it.y - curLine.y) > 3.5) {
      if (curLine) lines.push(curLine);
      curLine = { y: it.y, items: [it] };
    } else {
      curLine.items.push(it);
    }
  }
  if (curLine) lines.push(curLine);

  // Step 3: Segment items within each line (merging adjacent words separated by normal spaces)
  for (const line of lines) {
    const segments = [];
    let curSeg = null;

    for (const item of line.items) {
      if (!curSeg) {
        curSeg = {
          text: item.str,
          x: item.x,
          right: item.right,
          y: line.y,
          fontSize: item.fontSize,
          isBold: item.isBold,
          isItalic: item.isItalic,
          items: [item]
        };
      } else {
        const gap = item.x - curSeg.right;
        const wordSpaceLimit = Math.max(12, item.fontSize * 0.7);

        if (gap < wordSpaceLimit) {
          if (gap > 0.5 && !curSeg.text.endsWith(' ') && !item.str.startsWith(' ')) {
            curSeg.text += ' ';
          }
          curSeg.text += item.str;
          curSeg.right = Math.max(curSeg.right, item.right);
          curSeg.items.push(item);
        } else {
          segments.push(curSeg);
          curSeg = {
            text: item.str,
            x: item.x,
            right: item.right,
            y: line.y,
            fontSize: item.fontSize,
            isBold: item.isBold,
            isItalic: item.isItalic,
            items: [item]
          };
        }
      }
    }
    if (curSeg) segments.push(curSeg);
    line.segments = segments;
  }

  // Step 4: Conservative Table Detection
  const pageElements = [];
  const detectedTables = [];
  const processedLineIndices = new Set();

  // Step 5: Process Non-Table Lines (Paragraphs & Headings)
  let isFirstElementOfPage = (pageNum > 1);
  let i = 0;

  while (i < lines.length) {
    // Check if current line starts a potential table region
    if (lines[i].segments.length >= 2) {
      let j = i;
      let singleSegGapCount = 0;

      while (j < lines.length) {
        const line = lines[j];
        if (j > i) {
          const vGap = lines[j - 1].y - line.y;
          if (vGap <= 0 || vGap > 45) {
            break; // Gap too large or irregular
          }
        }
        if (line.segments.length >= 2) {
          singleSegGapCount = 0;
        } else {
          singleSegGapCount++;
          if (singleSegGapCount > 1) {
            break; // Non-table line encountered
          }
        }
        j++;
      }

      // Trim trailing single-segment lines
      while (j > i && lines[j - 1].segments.length < 2) {
        j--;
      }

      const candidateLines = lines.slice(i, j);
      const multiColLines = candidateLines.filter((l) => l.segments.length >= 2);

      if (
        multiColLines.length >= 2 &&
        candidateLines.length >= (candidateLines[0].segments.length === 2 ? 3 : 2)
      ) {
        // Collect and cluster X start positions across candidate lines
        const allXs = [];
        candidateLines.forEach((l) => l.segments.forEach((s) => allXs.push(s.x)));
        allXs.sort((a, b) => a - b);

        const clusters = [];
        for (const x of allXs) {
          let matched = false;
          for (const c of clusters) {
            if (Math.abs(x - c.mean) < 28) {
              c.points.push(x);
              c.mean = c.points.reduce((sum, p) => sum + p, 0) / c.points.length;
              matched = true;
              break;
            }
          }
          if (!matched) {
            clusters.push({ mean: x, points: [x] });
          }
        }

        clusters.sort((a, b) => a.mean - b.mean);

        // Keep clusters that recur across at least 2 distinct lines
        const validClusters = clusters.filter((c) => {
          const occurrences = candidateLines.filter((l) =>
            l.segments.some((s) => Math.abs(s.x - c.mean) < 32)
          ).length;
          return occurrences >= 2;
        });

        // Guard against bullet lists misidentified as 2-column tables
        let isBulletList = false;
        if (validClusters.length === 2) {
          const col0Texts = candidateLines
            .map((l) => {
              const s = l.segments.find((seg) => Math.abs(seg.x - validClusters[0].mean) < 32);
              return s ? s.text.trim() : '';
            })
            .filter((t) => t.length > 0);

          const bulletRegex = /^[\u2022\u25CF\u2013\u2014\-*]|\d+[.)]$/;
          const bulletCount = col0Texts.filter((t) => bulletRegex.test(t)).length;
          if (col0Texts.length > 0 && bulletCount / col0Texts.length >= 0.7) {
            isBulletList = true;
          }
        }

        // Structural acceptance gate
        if (
          validClusters.length >= 2 &&
          !isBulletList &&
          candidateLines.length >= (validClusters.length === 2 ? 3 : 2)
        ) {
          const tableGrid = [];
          const isFirstRowHeader = candidateLines[0].segments.every(
            (s) => s.isBold || s.fontSize > 11
          );

          candidateLines.forEach((l) => {
            const rowCells = new Array(validClusters.length).fill('');
            l.segments.forEach((seg) => {
              let bestCol = 0;
              let bestDist = Infinity;
              validClusters.forEach((c, cIdx) => {
                const dist = Math.abs(seg.x - c.mean);
                if (dist < bestDist) {
                  bestDist = dist;
                  bestCol = cIdx;
                }
              });
              if (bestDist < 45) {
                rowCells[bestCol] = (
                  rowCells[bestCol] ? rowCells[bestCol] + ' ' : ''
                ) + seg.text.trim();
              }
            });
            tableGrid.push(rowCells);
          });

          // Build native DOCX Table
          const tableRows = tableGrid.map((row, rIdx) => {
            const isHeader =
              rIdx === 0 &&
              (isFirstRowHeader || candidateLines[0].segments.some((s) => s.isBold));

            return new TableRow({
              tableHeader: isHeader,
              children: row.map(
                (cellText) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cellText,
                            bold: isHeader,
                            size: 20, // 10pt
                            font: 'Calibri'
                          })
                        ],
                        spacing: { before: 80, after: 80 }
                      })
                    ]
                  })
              )
            });
          });

          const docxTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'D0D5DD' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E4E7EC' }
            },
            rows: tableRows
          });

          if (isFirstElementOfPage) {
            pageElements.push(
              new Paragraph({
                children: [new PageBreak()],
                spacing: { before: 0, after: 0 }
              })
            );
            isFirstElementOfPage = false;
          }

          pageElements.push(docxTable);
          detectedTables.push({
            page: pageNum,
            rows: tableGrid.length,
            cols: validClusters.length,
            firstCell: tableGrid[0][0]
          });

          for (let k = i; k < j; k++) {
            processedLineIndices.add(k);
          }
          i = j;
          continue;
        }
      }
    }

    // Process non-table line
    if (!processedLineIndices.has(i)) {
      const line = lines[i];
      const lineText = line.segments.map((s) => s.text).join(' ').trim();

      if (lineText.length > 0) {
        const isHeading =
          line.segments[0].fontSize >= 14 ||
          (line.segments[0].fontSize >= 12 && line.segments[0].isBold && lineText.length < 90);

        const pageBreakBefore = isFirstElementOfPage;
        if (pageBreakBefore) {
          isFirstElementOfPage = false;
        }

        if (isHeading) {
          pageElements.push(
            new Paragraph({
              pageBreakBefore,
              children: [
                new TextRun({
                  text: lineText,
                  bold: true,
                  size: Math.min(36, Math.max(26, Math.round(line.segments[0].fontSize * 2))),
                  font: 'Calibri'
                })
              ],
              spacing: { before: 240, after: 120 }
            })
          );
        } else {
          // Group consecutive non-table body lines into continuous paragraphs
          const paraRuns = [];
          let curLineIdx = i;

          while (curLineIdx < lines.length && !processedLineIndices.has(curLineIdx)) {
            const curL = lines[curLineIdx];
            const curLText = curL.segments.map((s) => s.text).join(' ').trim();
            if (!curLText) {
              curLineIdx++;
              continue;
            }

            const curIsHeading =
              curL.segments[0].fontSize >= 14 ||
              (curL.segments[0].fontSize >= 12 && curL.segments[0].isBold && curLText.length < 90);

            if (curIsHeading && curLineIdx > i) {
              break; // Heading starts a separate paragraph block
            }

            if (curLineIdx > i) {
              const vGap = lines[curLineIdx - 1].y - curL.y;
              if (vGap > curL.segments[0].fontSize * 1.85 || vGap < 0) {
                break; // Vertical gap indicates paragraph boundary
              }
            }

            curL.segments.forEach((seg) => {
              seg.items.forEach((it) => {
                paraRuns.push({
                  text: it.str,
                  bold: it.isBold,
                  italics: it.isItalic,
                  size: Math.round(it.fontSize * 2)
                });
              });
            });

            processedLineIndices.add(curLineIdx);
            curLineIdx++;
          }

          // Build merged TextRuns with correct word spacing
          const docxRuns = [];
          let lastRunText = '';

          paraRuns.forEach((r, idx) => {
            const addSpace =
              idx > 0 &&
              lastRunText &&
              !lastRunText.endsWith(' ') &&
              !r.text.startsWith(' ');
            const runText = (addSpace ? ' ' : '') + r.text;
            lastRunText = runText;

            docxRuns.push(
              new TextRun({
                text: runText,
                bold: r.bold,
                italics: r.italics,
                size: r.size || 24,
                font: 'Calibri'
              })
            );
          });

          pageElements.push(
            new Paragraph({
              pageBreakBefore,
              children: docxRuns,
              spacing: { after: 140, line: 276 }
            })
          );

          i = curLineIdx;
          continue;
        }
      }
      processedLineIndices.add(i);
    }
    i++;
  }

  return {
    elements: pageElements,
    totalChars,
    detectedTables
  };
}

/**
 * Converts an entire PDF.js document into a Microsoft Word (.docx) document.
 */
export async function convertPdfToDocx(pdfDoc, options = {}) {
  const { onProgress } = options;
  const numPages = pdfDoc.numPages;

  let totalExtractedChars = 0;
  const allDocElements = [];
  const allDetectedTables = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(
        Math.round(((pageNum - 0.2) / numPages) * 85),
        `Extracting structure and tables from page ${pageNum} of ${numPages}...`
      );
    }

    const page = await pdfDoc.getPage(pageNum);
    const { elements, totalChars, detectedTables } = await extractPageStructure(page, pageNum);

    totalExtractedChars += totalChars;
    detectedTables.forEach((t) => allDetectedTables.push(t));

    elements.forEach((el) => allDocElements.push(el));
  }

  if (onProgress) {
    onProgress(90, 'Compiling Word (.docx) document...');
  }

  const doc = new Document({
    title: options.title || 'Converted Document',
    creator: 'FixMyFile PDF to Word Converter V2',
    description: 'Converted from PDF by FixMyFile',
    sections: [
      {
        properties: {},
        children: allDocElements
      }
    ]
  });

  const docxBlob = await Packer.toBlob(doc);

  if (onProgress) {
    onProgress(100, 'Conversion complete!');
  }

  return {
    doc,
    docxBlob,
    totalExtractedChars,
    detectedTables: allDetectedTables,
    numPages
  };
}
