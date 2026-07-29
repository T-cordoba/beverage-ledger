import { NextRequest, NextResponse } from 'next/server';
import { getMovimientoById } from '@/app/actions';
import { createPDF } from './pdf';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const formattedDate = searchParams.get('date');

  const movimiento = await getMovimientoById(id);
  if (!movimiento) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const pdfBuffer = await createPDF(movimiento, formattedDate);
  return new NextResponse(Buffer.from(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${id}.pdf"`,
    },
  });
}
