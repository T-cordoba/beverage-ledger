import { NextRequest, NextResponse } from 'next/server';
import { getMovimientoById } from '../../../../actions';
import { createPDF } from './pdf';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const movimiento = await getMovimientoById(id);
  if (!movimiento) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const pdfBuffer = await createPDF(movimiento);
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${id}.pdf"`
    }
  });
}
