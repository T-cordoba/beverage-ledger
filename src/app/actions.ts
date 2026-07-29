'use server';

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export type Licor = {
  id: string;
  name: string;
  type: string;
  brand?: string;
  subcategory?: string;
  abv?: number;
  origin?: string;
  age?: string;
  quantity: number;
  unit: 'bottle' | 'case';
};

export type Movimiento = {
  id: string;
  date: string;
  liquors: Licor[];
};

/** Raw `movimientos` row. Columns are Spanish, see CLAUDE.md §10. */
type MovimientoRow = {
  id: string;
  fecha: string;
  licores: string | Licor[];
};

function toMovimiento(row: MovimientoRow): Movimiento {
  return {
    id: row.id,
    date: row.fecha,
    liquors: typeof row.licores === 'string' ? JSON.parse(row.licores) : row.licores,
  };
}

export async function getMovimientos(): Promise<Movimiento[]> {
  const rows = (await sql`SELECT * FROM movimientos ORDER BY fecha DESC`) as MovimientoRow[];
  return rows.map(toMovimiento);
}

export async function createMovimiento({
  date,
  liquors,
}: {
  date: string;
  liquors: Licor[];
}): Promise<Movimiento> {
  const rows = (await sql`
    INSERT INTO movimientos (id, fecha, licores)
    VALUES (gen_random_uuid(), ${date}, ${JSON.stringify(liquors)})
    RETURNING *
  `) as MovimientoRow[];
  return toMovimiento(rows[0]);
}

export async function getMovimientoById(id: string): Promise<Movimiento | null> {
  const rows = (await sql`SELECT * FROM movimientos WHERE id = ${id}`) as MovimientoRow[];
  return rows[0] ? toMovimiento(rows[0]) : null;
}
