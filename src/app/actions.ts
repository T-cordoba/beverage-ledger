"use server";

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type Licor = {
  nombre: string;
  tipo: string;
  cantidad: number;
  unidad: 'botella' | 'caja';
};

export type Movimiento = {
  id: string;
  fecha: string;
  licores: Licor[];
};

export async function getMovimientos(): Promise<Movimiento[]> {
  const result = await sql`SELECT * FROM movimientos ORDER BY fecha DESC`;
  return result.map((row: any) => ({
    id: row.id,
    fecha: row.fecha,
    licores: typeof row.licores === 'string' ? JSON.parse(row.licores) : row.licores,
  }));
}

export async function createMovimiento({ fecha, licores }: { fecha: string; licores: Licor[] }): Promise<Movimiento> {
  const result = await sql`
    INSERT INTO movimientos (id, fecha, licores)
    VALUES (gen_random_uuid(), ${fecha}, ${JSON.stringify(licores)})
    RETURNING *
  `;
  const row = result[0];
  return {
    id: row.id,
    fecha: row.fecha,
    licores: typeof row.licores === 'string' ? JSON.parse(row.licores) : row.licores,
  };
}

export async function getMovimientoById(id: string): Promise<Movimiento | null> {
  const result = await sql`SELECT * FROM movimientos WHERE id = ${id}`;
  if (!result[0]) return null;
  const row = result[0];
  return {
    id: row.id,
    fecha: row.fecha,
    licores: typeof row.licores === 'string' ? JSON.parse(row.licores) : row.licores,
  };
}
