import { NextRequest, NextResponse } from 'next/server';
import { getMovimientos, createMovimiento, getMovimientoById } from '../actions';

export async function GET(req: NextRequest) {
  const movimientos = await getMovimientos();
  return NextResponse.json(movimientos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fecha, licores } = body;
  const movimiento = await createMovimiento({ fecha, licores });
  return NextResponse.json(movimiento);
}
