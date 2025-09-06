import { NextRequest, NextResponse } from 'next/server';
import { getLicores } from '../../actions-licores';

export async function GET(req: NextRequest) {
  const licores = await getLicores();
  return NextResponse.json(licores);
}
