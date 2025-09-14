import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Movimiento } from '../../../../actions';

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

export async function createPDF(movimiento: Movimiento, formattedDate?: string | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  
  // Fonts
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Colors - Using exact system colors from Tailwind config
  const background = rgb(0x12/255, 0x00/255, 0x06/255);    // #120006
  const primary = rgb(0xF0/255, 0xE6/255, 0xCE/255);       // #F0E6CE
  const secondary = rgb(0xFF/255, 0xFF/255, 0xFF/255);     // #FFFFFF (white)
  const accent = rgb(0xD4/255, 0xAF/255, 0x37/255);        // #D4AF37
  const accentHover = rgb(0xE6/255, 0xC8/255, 0x5B/255);   // #E6C85B
  const border = rgb(0x2A/255, 0x2A/255, 0x2A/255);        // #2A2A2A
  const inputBg = rgb(0x1A/255, 0x1A/255, 0x1A/255);       // #1A1A1A
  const lightBg = rgb(0.95, 0.93, 0.88);                   // Light version of primary for alternating rows

  // Page dimensions
  const pageWidth = 595;  // A4 width
  const pageHeight = 842; // A4 height
  const margin = 40;

  // Table configuration - Adjusted widths to fit within page margins (total ~495px for A4)
  const tableColumns = [
    { header: 'Item', width: 100, key: 'name' },
    { header: 'Brand', width: 70, key: 'brand' },
    { header: 'Type', width: 85, key: 'type' },
    { header: 'Origin', width: 55, key: 'origin' },
    { header: 'ABV%', width: 35, key: 'abv' },
    { header: 'Age', width: 35, key: 'age' },
    { header: 'Category', width: 65, key: 'subcategory' },
    { header: 'Qty', width: 25, key: 'quantity' },
    { header: 'Unit', width: 40, key: 'unit' }
  ];

  const tableWidth = tableColumns.reduce((sum, col) => sum + col.width, 0); // Should be ~510px
  const tableStartX = margin; // Start from margin instead of centering
  const baseRowHeight = 16;
  const maxLinesPerRow = 3; // Maximum lines before considering new page
  const headerHeight = 25;
  const itemsPerPage = 28; // Adjusted for multi-line rows

  // Enhanced text wrapping function
  function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    if (!text || text === '-') return [text || ''];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    // More conservative character width calculation for better fitting
    const avgCharWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor((maxWidth - 8) / avgCharWidth); // 8px total padding
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          
          // Check if the word itself is too long
          if (word.length > maxCharsPerLine) {
            // Split long word
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
          // Single word too long, force split
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
    
    // Limit to maxLinesPerRow to prevent excessive row height
    return lines.slice(0, maxLinesPerRow);
  }

  // Function to calculate row height based on content
  function calculateRowHeight(row: LiquorRow): number {
    let maxLines = 1;
    
    tableColumns.forEach(col => {
      let cellValue = '';
      switch (col.key) {
        case 'name': cellValue = row.name; break;
        case 'brand': cellValue = row.brand || ''; break;
        case 'type': cellValue = row.type; break;
        case 'origin': cellValue = row.origin || ''; break;
        case 'abv': cellValue = row.abv ? `${row.abv}%` : ''; break;
        case 'age': cellValue = row.age || ''; break;
        case 'subcategory': cellValue = row.subcategory || ''; break;
        case 'quantity': cellValue = row.quantity.toString(); break;
        case 'unit': cellValue = row.unit; break;
      }
      
      const lines = wrapText(cellValue, col.width, 8);
      maxLines = Math.max(maxLines, lines.length);
    });
    
    return baseRowHeight * maxLines;
  }

  // Helper function to create header
  function createHeader(page: any, pageNumber: number, totalPages: number) {
    // Company header
    page.drawRectangle({
      x: 0,
      y: pageHeight - 100,
      width: pageWidth,
      height: 100,
      color: background,
    });

    // Company name
    page.drawText('BEVERAGE LEDGER', {
      x: margin,
      y: pageHeight - 35,
      size: 22,
      font: boldFont,
      color: primary,
    });

    // Subtitle
    page.drawText('Liquor Inventory Movement Invoice', {
      x: margin,
      y: pageHeight - 55,
      size: 12,
      font: font,
      color: primary,
    });

    // Page info
    page.drawText(`Page ${pageNumber} of ${totalPages}`, {
      x: pageWidth - margin - 80,
      y: pageHeight - 35,
      size: 10,
      font: font,
      color: primary,
    });

    // Invoice details (only on first page)
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
          minute: '2-digit'
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

  // Helper function to create table header
  function createTableHeader(page: any, startY: number) {
    // Header background
    page.drawRectangle({
      x: tableStartX,
      y: startY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: background,
    });

    // Header text
    let currentX = tableStartX;
    tableColumns.forEach(col => {
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

  // Prepare liquor data
  const liquorRows: LiquorRow[] = movimiento.liquors.map(liquor => ({
    name: liquor.name || '',
    type: liquor.type || '',
    brand: liquor.brand || '',
    origin: liquor.origin || '',
    abv: liquor.abv,
    age: liquor.age || '',
    subcategory: liquor.subcategory || '',
    quantity: liquor.quantity,
    unit: liquor.unit === 'bottle' ? (liquor.quantity === 1 ? 'bottle' : 'bottles') : 
          liquor.unit === 'case' ? (liquor.quantity === 1 ? 'case' : 'cases') : liquor.unit
  }));

  // Create pages and render content
  let currentPageIndex = 0;
  let itemsOnCurrentPage = 0;
  let currentY = 0;
  let totalItems = liquorRows.reduce((sum, row) => sum + row.quantity, 0);
  
  // Start with just the first page
  const pages: any[] = [];
  pages.push(doc.addPage([pageWidth, pageHeight]));

  // Setup first page
  createHeader(pages[0], 1, 1); // We'll update total pages later
  const tableStartY = pageHeight - 220;
  currentY = createTableHeader(pages[0], tableStartY);

  // Render liquor items
  currentPageIndex = 0;
  itemsOnCurrentPage = 0;
  currentY = pages[0] ? (pageHeight - 220 - headerHeight) : 0;

  liquorRows.forEach((row, index) => {
    // Calculate dynamic row height based on content
    const currentRowHeight = calculateRowHeight(row);
    
    // Check if we have enough vertical space for this row
    const minYPosition = 120; // Minimum Y position before footer
    const spaceNeeded = currentRowHeight + 5; // Add some padding
    
    // Check if we need to move to next page based on vertical space
    if (currentY - spaceNeeded < minYPosition) {
      // Need a new page
      if (currentPageIndex < pages.length - 1) {
        currentPageIndex++;
        itemsOnCurrentPage = 0;
        currentY = pageHeight - 140 - headerHeight;
      } else {
        // Need to create a new page
        const newPage = doc.addPage([pageWidth, pageHeight]);
        pages.push(newPage);
        
        // Setup new page
        createHeader(newPage, pages.length, pages.length); // Temporary, will be updated later
        const tableStartY = pageHeight - 140;
        createTableHeader(newPage, tableStartY);
        
        currentPageIndex++;
        itemsOnCurrentPage = 0;
        currentY = pageHeight - 140 - headerHeight;
      }
    }

    const page = pages[currentPageIndex];
    const isEvenRow = itemsOnCurrentPage % 2 === 0;

    // Alternating row background
    if (isEvenRow) {
      page.drawRectangle({
        x: tableStartX,
        y: currentY - currentRowHeight,
        width: tableWidth,
        height: currentRowHeight,
        color: lightBg,
      });
    }

    // Draw cell borders
    let currentX = tableStartX;
    tableColumns.forEach(col => {
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

    // Render cell content with multi-line support
    currentX = tableStartX;
    tableColumns.forEach(col => {
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

      // Wrap text and render all lines
      const wrappedLines = wrapText(cellValue, col.width, 8);
      
      wrappedLines.forEach((line, lineIndex) => {
        const lineY = currentY - 10 - (lineIndex * 10); // 10px line spacing
        
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

  // Update page numbers now that we know the total
  const totalPages = pages.length;
  pages.forEach((page, index) => {
    // Clear the old page number area and redraw with correct total
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

  // Add summary and footer to last page
  const lastPage = pages[pages.length - 1];
  
  // Summary box - positioned within margins
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

  // Footer on all pages
  pages.forEach(page => {
    page.drawText('This document serves as an official record of liquor inventory movement for premium casino operations.', {
      x: margin,
      y: 50,
      size: 8,
      font: font,
      color: border,
    });

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
