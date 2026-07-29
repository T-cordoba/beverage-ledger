import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type { Movimiento } from '@/app/actions';

interface LiquorRow {
  name: string;
  type: string;
  brand?: string;
  origin?: string;
  abv?: number;
  age?: string;
  subcategory?: string;
  quantity: number;
  unit: string;
}

export async function createPDF(
  movimiento: Movimiento,
  formattedDate?: string | null,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const background = rgb(0x12 / 255, 0x00 / 255, 0x06 / 255);
  const primary = rgb(0xf0 / 255, 0xe6 / 255, 0xce / 255);
  const secondary = rgb(0xff / 255, 0xff / 255, 0xff / 255);
  const accent = rgb(0xd4 / 255, 0xaf / 255, 0x37 / 255);
  const border = rgb(0x2a / 255, 0x2a / 255, 0x2a / 255);
  const inputBg = rgb(0x1a / 255, 0x1a / 255, 0x1a / 255);
  const lightBg = rgb(0.95, 0.93, 0.88);

  const pageWidth = 595; // A4 width
  const pageHeight = 842; // A4 height
  const margin = 40;

  const tableColumns = [
    { header: 'Item', width: 100, key: 'name' },
    { header: 'Brand', width: 70, key: 'brand' },
    { header: 'Type', width: 85, key: 'type' },
    { header: 'Origin', width: 55, key: 'origin' },
    { header: 'ABV%', width: 35, key: 'abv' },
    { header: 'Age', width: 35, key: 'age' },
    { header: 'Category', width: 65, key: 'subcategory' },
    { header: 'Qty', width: 25, key: 'quantity' },
    { header: 'Unit', width: 40, key: 'unit' },
  ];

  const tableWidth = tableColumns.reduce((sum, col) => sum + col.width, 0);
  const tableStartX = margin;
  const baseRowHeight = 16;
  const maxLinesPerRow = 3;
  const headerHeight = 25;

  function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    if (!text || text === '-') return [text || ''];

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    const avgCharWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor((maxWidth - 8) / avgCharWidth);

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);

          if (word.length > maxCharsPerLine) {
            let remainingWord = word;
            while (remainingWord.length > maxCharsPerLine) {
              lines.push(remainingWord.substring(0, maxCharsPerLine - 1) + '-');
              remainingWord = remainingWord.substring(maxCharsPerLine - 1);
            }
            currentLine = remainingWord;
          } else {
            currentLine = word;
          }
        } else {
          let remainingWord = word;
          while (remainingWord.length > maxCharsPerLine) {
            lines.push(remainingWord.substring(0, maxCharsPerLine - 1) + '-');
            remainingWord = remainingWord.substring(maxCharsPerLine - 1);
          }
          currentLine = remainingWord;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.slice(0, maxLinesPerRow);
  }

  function calculateRowHeight(row: LiquorRow): number {
    let maxLines = 1;

    tableColumns.forEach((col) => {
      let cellValue = '';
      switch (col.key) {
        case 'name':
          cellValue = row.name;
          break;
        case 'brand':
          cellValue = row.brand || '';
          break;
        case 'type':
          cellValue = row.type;
          break;
        case 'origin':
          cellValue = row.origin || '';
          break;
        case 'abv':
          cellValue = row.abv ? `${row.abv}%` : '';
          break;
        case 'age':
          cellValue = row.age || '';
          break;
        case 'subcategory':
          cellValue = row.subcategory || '';
          break;
        case 'quantity':
          cellValue = row.quantity.toString();
          break;
        case 'unit':
          cellValue = row.unit;
          break;
      }

      const lines = wrapText(cellValue, col.width, 8);
      maxLines = Math.max(maxLines, lines.length);
    });

    return baseRowHeight * maxLines;
  }

  function createHeader(page: PDFPage, pageNumber: number, totalPages: number) {
    page.drawRectangle({
      x: 0,
      y: pageHeight - 100,
      width: pageWidth,
      height: 100,
      color: background,
    });

    page.drawText('BEVERAGE LEDGER', {
      x: margin,
      y: pageHeight - 35,
      size: 22,
      font: boldFont,
      color: primary,
    });

    page.drawText('Liquor Inventory Movement Invoice', {
      x: margin,
      y: pageHeight - 55,
      size: 12,
      font: font,
      color: primary,
    });

    page.drawText(`Page ${pageNumber} of ${totalPages}`, {
      x: pageWidth - margin - 80,
      y: pageHeight - 35,
      size: 10,
      font: font,
      color: primary,
    });

    if (pageNumber === 1) {
      const detailsY = pageHeight - 130;

      page.drawText('INVOICE DETAILS', {
        x: margin,
        y: detailsY,
        size: 14,
        font: boldFont,
        color: accent,
      });

      const formatDate = (dateString: string) => {
        if (formattedDate) return formattedDate;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      page.drawText(`Invoice ID: ${movimiento.id}`, {
        x: margin,
        y: detailsY - 20,
        size: 10,
        font: font,
        color: inputBg,
      });

      page.drawText(`Date: ${formatDate(movimiento.date)}`, {
        x: margin,
        y: detailsY - 35,
        size: 10,
        font: font,
        color: inputBg,
      });

      page.drawText('Premium Casino Operations', {
        x: margin,
        y: detailsY - 50,
        size: 10,
        font: font,
        color: border,
      });
    }
  }

  function createTableHeader(page: PDFPage, startY: number) {
    page.drawRectangle({
      x: tableStartX,
      y: startY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: background,
    });

    let currentX = tableStartX;
    tableColumns.forEach((col) => {
      page.drawText(col.header, {
        x: currentX + 5,
        y: startY - 16,
        size: 9,
        font: boldFont,
        color: primary,
      });
      currentX += col.width;
    });

    return startY - headerHeight;
  }

  const liquorRows: LiquorRow[] = movimiento.liquors.map((liquor) => ({
    name: liquor.name || '',
    type: liquor.type || '',
    brand: liquor.brand || '',
    origin: liquor.origin || '',
    abv: liquor.abv,
    age: liquor.age || '',
    subcategory: liquor.subcategory || '',
    quantity: liquor.quantity,
    unit:
      liquor.unit === 'bottle'
        ? liquor.quantity === 1
          ? 'bottle'
          : 'bottles'
        : liquor.unit === 'case'
          ? liquor.quantity === 1
            ? 'case'
            : 'cases'
          : liquor.unit,
  }));

  let currentPageIndex = 0;
  let itemsOnCurrentPage = 0;
  let currentY = 0;
  const totalItems = liquorRows.reduce((sum, row) => sum + row.quantity, 0);

  const pages: PDFPage[] = [];
  pages.push(doc.addPage([pageWidth, pageHeight]));

  createHeader(pages[0], 1, 1); // Total page count is only known after layout; fixed up at the end.
  const tableStartY = pageHeight - 220;
  currentY = createTableHeader(pages[0], tableStartY);

  currentPageIndex = 0;
  itemsOnCurrentPage = 0;
  currentY = pages[0] ? pageHeight - 220 - headerHeight : 0;

  liquorRows.forEach((row) => {
    const currentRowHeight = calculateRowHeight(row);

    const minYPosition = 120;
    const spaceNeeded = currentRowHeight + 5;

    if (currentY - spaceNeeded < minYPosition) {
      if (currentPageIndex < pages.length - 1) {
        currentPageIndex++;
        itemsOnCurrentPage = 0;
        currentY = pageHeight - 140 - headerHeight;
      } else {
        const newPage = doc.addPage([pageWidth, pageHeight]);
        pages.push(newPage);

        createHeader(newPage, pages.length, pages.length); // Placeholder page count, corrected once the total is known.
        const tableStartY = pageHeight - 140;
        createTableHeader(newPage, tableStartY);

        currentPageIndex++;
        itemsOnCurrentPage = 0;
        currentY = pageHeight - 140 - headerHeight;
      }
    }

    const page = pages[currentPageIndex];
    const isEvenRow = itemsOnCurrentPage % 2 === 0;

    if (isEvenRow) {
      page.drawRectangle({
        x: tableStartX,
        y: currentY - currentRowHeight,
        width: tableWidth,
        height: currentRowHeight,
        color: lightBg,
      });
    }

    let currentX = tableStartX;
    tableColumns.forEach((col) => {
      page.drawRectangle({
        x: currentX,
        y: currentY - currentRowHeight,
        width: col.width,
        height: currentRowHeight,
        color: secondary,
        borderColor: border,
        borderWidth: 0.5,
      });
      currentX += col.width;
    });

    currentX = tableStartX;
    tableColumns.forEach((col) => {
      let cellValue = '';

      switch (col.key) {
        case 'name':
          cellValue = row.name;
          break;
        case 'brand':
          cellValue = row.brand || '-';
          break;
        case 'type':
          cellValue = row.type;
          break;
        case 'origin':
          cellValue = row.origin || '-';
          break;
        case 'abv':
          cellValue = row.abv ? `${row.abv}%` : '-';
          break;
        case 'age':
          cellValue = row.age || '-';
          break;
        case 'subcategory':
          cellValue = row.subcategory || '-';
          break;
        case 'quantity':
          cellValue = row.quantity.toString();
          break;
        case 'unit':
          cellValue = row.unit;
          break;
      }

      const wrappedLines = wrapText(cellValue, col.width, 8);

      wrappedLines.forEach((line, lineIndex) => {
        const lineY = currentY - 10 - lineIndex * 10;

        page.drawText(line, {
          x: currentX + 3,
          y: lineY,
          size: 8,
          font: font,
          color: inputBg,
        });
      });

      currentX += col.width;
    });

    currentY -= currentRowHeight;
    itemsOnCurrentPage++;
  });

  const totalPages = pages.length;
  pages.forEach((page, index) => {
    page.drawRectangle({
      x: pageWidth - margin - 80,
      y: pageHeight - 45,
      width: 80,
      height: 20,
      color: background,
    });

    page.drawText(`Page ${index + 1} of ${totalPages}`, {
      x: pageWidth - margin - 75,
      y: pageHeight - 35,
      size: 10,
      font: font,
      color: primary,
    });
  });

  const lastPage = pages[pages.length - 1];

  const summaryY = currentY - 40;
  lastPage.drawRectangle({
    x: pageWidth - margin - 150,
    y: summaryY - 35,
    width: 150,
    height: 35,
    color: accent,
  });

  lastPage.drawText(`TOTAL ITEMS: ${totalItems}`, {
    x: pageWidth - margin - 145,
    y: summaryY - 15,
    size: 11,
    font: boldFont,
    color: background,
  });

  lastPage.drawText(`TOTAL LIQUORS: ${liquorRows.length}`, {
    x: pageWidth - margin - 145,
    y: summaryY - 28,
    size: 9,
    font: font,
    color: background,
  });

  pages.forEach((page) => {
    page.drawText(
      'This document serves as an official record of liquor inventory movement for premium casino operations.',
      {
        x: margin,
        y: 50,
        size: 8,
        font: font,
        color: border,
      },
    );

    page.drawText(`Generated: ${new Date().toLocaleString('en-US')}`, {
      x: margin,
      y: 35,
      size: 7,
      font: font,
      color: border,
    });
  });

  return doc.save();
}
