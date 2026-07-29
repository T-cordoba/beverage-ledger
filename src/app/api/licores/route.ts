import { NextResponse } from 'next/server';
import { getLicores } from '@/app/actions-licores';

export async function GET() {
  const licores = await getLicores();
  return NextResponse.json(licores);
}
