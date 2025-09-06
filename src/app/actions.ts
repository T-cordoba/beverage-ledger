"use server";

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type Licor = {
  name: string;
  type: string;
  quantity: number;
  unit: 'bottle' | 'case';
};

export type Movimiento = {
  id: string;
  date: string;
  liquors: Licor[];
};

export async function getMovimientos(): Promise<Movimiento[]> {
  const result = await sql`SELECT * FROM movimientos ORDER BY fecha DESC`;
  return result.map((row: any) => ({
    id: row.id,
    date: row.fecha,
    liquors: typeof row.licores === 'string' ? JSON.parse(row.licores) : row.licores,
  }));
}

export async function createMovimiento({ date, liquors }: { date: string; liquors: Licor[] }): Promise<Movimiento> {
  const result = await sql`
    INSERT INTO movimientos (id, fecha, licores)
    VALUES (gen_random_uuid(), ${date}, ${JSON.stringify(liquors)})
    RETURNING *
  `;
  const row = result[0];
  return {
    id: row.id,
    date: row.fecha,
    liquors: typeof row.licores === 'string' ? JSON.parse(row.licores) : row.licores,
  };
}

export async function getMovimientoById(id: string): Promise<Movimiento | null> {
  const result = await sql`SELECT * FROM movimientos WHERE id = ${id}`;
  if (!result[0]) return null;
  const row = result[0];
  return {
    id: row.id,
    date: row.fecha,
    liquors: typeof row.licores === 'string' ? JSON.parse(row.licores) : row.licores,
  };
}
