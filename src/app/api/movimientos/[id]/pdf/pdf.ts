import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Movimiento } from '../../../../actions';

export async function createPDF(movimiento: Movimiento): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 size
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Casino colors
  const darkBg = rgb(18/255, 0, 6/255);
  const lightText = rgb(240/255, 230/255, 206/255);
  const accent = rgb(212/255, 175/255, 55/255);
  const white = rgb(1, 1, 1);
  const lightGray = rgb(0.95, 0.95, 0.95);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;

  // Dark background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: darkBg,
  });

  // Header section - clean and simple
  // Header shadow effect
  page.drawRectangle({
    x: margin + 2,
    y: pageHeight - 122,
    width: pageWidth - 2 * margin,
    height: 70,
    color: rgb(0.1, 0.1, 0.1),
  });
  
  // Main header background
  page.drawRectangle({
    x: margin,
    y: pageHeight - 120,
    width: pageWidth - 2 * margin,
    height: 70,
    color: accent,
  });

  // Title - perfectly centered horizontally and vertically
  const titleText = 'ENCORE BEVERAGE LEDGER';
  const titleSize = 24;
  // More accurate width calculation for centering
  const titleWidth = titleText.length * (titleSize * 0.55); 
  const centerX = (pageWidth - titleWidth) / 2;
  
  page.drawText(titleText, {
    x: centerX,
    y: pageHeight - 75, // Moved down for better vertical centering
    size: titleSize,
    font: boldFont,
    color: darkBg,
  });

  const subtitleText = 'Liquor Movement Invoice';
  const subtitleSize = 14;
  // More accurate width calculation for subtitle
  const subtitleWidth = subtitleText.length * (subtitleSize * 0.55);
  const subtitleCenterX = (pageWidth - subtitleWidth) / 2;
  
  page.drawText(subtitleText, {
    x: subtitleCenterX,
    y: pageHeight - 100, // Moved down to maintain proper spacing
    size: subtitleSize,
    font: font,
    color: darkBg,
  });

  // Invoice details
  const detailsStartY = pageHeight - 160;
  
  page.drawText('Invoice Details', {
    x: margin,
    y: detailsStartY,
    size: 16,
    font: boldFont,
    color: accent,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Force the timezone to be interpreted as local time to match frontend display
    // This ensures the PDF shows the same date/time as the frontend
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York' // Use Eastern Time for Boston Harbor Casino
    });
  };

  page.drawText(`Invoice ID: ${movimiento.id}`, {
    x: margin,
    y: detailsStartY - 30,
    size: 12,
    font: font,
    color: lightText,
  });

  page.drawText(`Date: ${formatDate(movimiento.date)}`, {
    x: margin,
    y: detailsStartY - 50,
    size: 12,
    font: font,
    color: lightText,
  });

  page.drawText('Encore Boston Harbor Casino', {
    x: margin,
    y: detailsStartY - 70,
    size: 12,
    font: font,
    color: lightText,
  });

  // Items table header - clean design
  const tableStartY = detailsStartY - 120;
  const tableHeaderHeight = 30;
  
  // Table header background
  page.drawRectangle({
    x: margin,
    y: tableStartY - tableHeaderHeight,
    width: pageWidth - 2 * margin,
    height: tableHeaderHeight,
    color: accent,
  });

  // Table headers - better positioned and visible
  page.drawText('Item', {
    x: margin + 15,
    y: tableStartY - 18,
    size: 12,
    font: boldFont,
    color: darkBg,
  });

  page.drawText('Type', {
    x: margin + 200,
    y: tableStartY - 18,
    size: 12,
    font: boldFont,
    color: darkBg,
  });

  page.drawText('Quantity', {
    x: margin + 320,
    y: tableStartY - 18,
    size: 12,
    font: boldFont,
    color: darkBg,
  });

  page.drawText('Unit', {
    x: margin + 420,
    y: tableStartY - 18,
    size: 12,
    font: boldFont,
    color: darkBg,
  });

  // Table items with pagination
  let currentY = tableStartY - tableHeaderHeight - 10;
  const rowHeight = 25;
  let totalItems = 0;
  const itemsPerPage = 14;
  let currentPage = 1;
  let itemsOnCurrentPage = 0;
  let pages = [page];

  movimiento.liquors.forEach((liquor: any, index: number) => {
    // Check if we need a new page
    if (itemsOnCurrentPage >= itemsPerPage) {
      // Add new page
      const newPage = doc.addPage([595, 842]);
      pages.push(newPage);
      currentPage++;
      itemsOnCurrentPage = 0;
      
      // Setup new page with same background and header
      newPage.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: darkBg,
      });
      
      // Header for new page
      newPage.drawRectangle({
        x: margin + 2,
        y: pageHeight - 122,
        width: pageWidth - 2 * margin,
        height: 70,
        color: rgb(0.1, 0.1, 0.1),
      });
      
      newPage.drawRectangle({
        x: margin,
        y: pageHeight - 120,
        width: pageWidth - 2 * margin,
        height: 70,
        color: accent,
      });
      
      const titleText = 'ENCORE BEVERAGE LEDGER';
      const titleTextSize = 24;
      const titleTextWidth = titleText.length * (titleTextSize * 0.6);
      const titleCenterX = (pageWidth - titleTextWidth) / 2;
      
      newPage.drawText(titleText, {
        x: titleCenterX,
        y: pageHeight - 100,
        size: titleTextSize,
        font: boldFont,
        color: darkBg,
      });
      
      const subtitleText = 'Liquor Movement Invoice';
      const subtitleTextSize = 12;
      const subtitleTextWidth = subtitleText.length * (subtitleTextSize * 0.5);
      const subtitleCenterX = (pageWidth - subtitleTextWidth) / 2;
      
      newPage.drawText(subtitleText, {
        x: subtitleCenterX,
        y: pageHeight - 75,
        size: subtitleTextSize,
        font: font,
        color: darkBg,
      });
      
      // Table header for new page
      const newTableStartY = pageHeight - 180;
      newPage.drawRectangle({
        x: margin,
        y: newTableStartY - tableHeaderHeight,
        width: pageWidth - 2 * margin,
        height: tableHeaderHeight,
        color: accent,
      });
      
      newPage.drawText('Item', {
        x: margin + 15,
        y: newTableStartY - 18,
        size: 12,
        font: boldFont,
        color: darkBg,
      });
      
      newPage.drawText('Type', {
        x: margin + 200,
        y: newTableStartY - 18,
        size: 12,
        font: boldFont,
        color: darkBg,
      });
      
      newPage.drawText('Quantity', {
        x: margin + 320,
        y: newTableStartY - 18,
        size: 12,
        font: boldFont,
        color: darkBg,
      });
      
      newPage.drawText('Unit', {
        x: margin + 420,
        y: newTableStartY - 18,
        size: 12,
        font: boldFont,
        color: darkBg,
      });
      
      currentY = newTableStartY - tableHeaderHeight - 10;
    }
    
    const currentPageObj = pages[pages.length - 1];
    const isEvenRow = itemsOnCurrentPage % 2 === 0;
    
    // Alternate row background
    if (isEvenRow) {
      currentPageObj.drawRectangle({
        x: margin,
        y: currentY - rowHeight + 5,
        width: pageWidth - 2 * margin,
        height: rowHeight,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    // Item name
    const itemText = liquor.name.length > 22 ? liquor.name.substring(0, 22) + '...' : liquor.name;
    currentPageObj.drawText(itemText, {
      x: margin + 15,
      y: currentY - 10,
      size: 10,
      font: font,
      color: lightText,
    });

    // Type
    currentPageObj.drawText(liquor.type, {
      x: margin + 200,
      y: currentY - 10,
      size: 10,
      font: font,
      color: lightText,
    });

    // Quantity
    currentPageObj.drawText(liquor.quantity.toString(), {
      x: margin + 340,
      y: currentY - 10,
      size: 10,
      font: font,
      color: lightText,
    });

    // Unit
    const displayUnit = liquor.quantity === 1 ? liquor.unit : liquor.unit + 's';
    currentPageObj.drawText(displayUnit, {
      x: margin + 430,
      y: currentY - 10,
      size: 10,
      font: font,
      color: lightText,
    });

    currentY -= rowHeight;
    totalItems += liquor.quantity;
    itemsOnCurrentPage++;
  });

  const totalPages = pages.length;

  // Add summary and footer to all pages
  pages.forEach((pageObj, pageIndex) => {
    const pageNumber = pageIndex + 1;
    
    // Summary section - clean and centered (only on last page)
    if (pageIndex === pages.length - 1) {
      const summaryY = currentY - 40;
      const summaryWidth = 200;
      const summaryX = pageWidth - margin - summaryWidth;
      
      pageObj.drawRectangle({
        x: summaryX,
        y: summaryY - 30,
        width: summaryWidth,
        height: 30,
        color: accent,
      });

      const totalText = `Total Items: ${totalItems}`;
      const totalTextSize = 12;
      const totalTextWidth = totalText.length * (totalTextSize * 0.5);
      const totalCenterX = summaryX + (summaryWidth - totalTextWidth) / 2;
      
      pageObj.drawText(totalText, {
        x: totalCenterX,
        y: summaryY - 15,
        size: totalTextSize,
        font: boldFont,
        color: darkBg,
      });
    }

    // Footer for each page
    const footerY = 100;
    
    pageObj.drawText('This document serves as a record of liquor movement', {
      x: margin,
      y: footerY,
      size: 10,
      font: font,
      color: lightText,
    });

    pageObj.drawText('at Encore Boston Harbor Casino.', {
      x: margin,
      y: footerY - 15,
      size: 10,
      font: font,
      color: lightText,
    });

    pageObj.drawText(`Generated on: ${new Date().toLocaleString('en-US')}`, {
      x: margin,
      y: footerY - 40,
      size: 8,
      font: font,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Page counter at bottom right
    const pageText = `Page ${pageNumber} of ${totalPages}`;
    const pageTextWidth = pageText.length * (10 * 0.5);
    pageObj.drawText(pageText, {
      x: pageWidth - margin - pageTextWidth,
      y: footerY - 40,
      size: 10,
      font: font,
      color: lightText,
    });
  });

  return doc.save();
}
