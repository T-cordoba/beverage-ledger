import { PDFDocument, rgb } from 'pdf-lib';

export async function createPDF(movimiento) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 600]);

  // Colores
  const bg = rgb(18/255, 0, 6/255);
  const text = rgb(240/255, 230/255, 206/255);
  const accent = rgb(212/255, 175/255, 55/255);

  page.drawRectangle({ x: 0, y: 0, width: 420, height: 600, color: bg });

  page.drawText(`Factura de Retiro`, { x: 40, y: 560, size: 24, color: accent });
  page.drawText(`ID: ${movimiento.id}` , { x: 40, y: 530, size: 14, color: text });
  page.drawText(`Fecha: ${movimiento.fecha}` , { x: 40, y: 510, size: 14, color: text });

  let y = 480;
  page.drawText('Licores:', { x: 40, y, size: 16, color: accent });
  y -= 24;
  movimiento.licores.forEach((licor) => {
    page.drawText(
      `${licor.nombre} (${licor.tipo}) - ${licor.cantidad} ${licor.unidad}`,
      { x: 40, y, size: 14, color: text }
    );
    y -= 20;
  });

  return await doc.save();
}
