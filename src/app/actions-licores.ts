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
};

/** Raw `licores` row. Columns are Spanish, see CLAUDE.md §10. */
type LicorRow = {
  id: string;
  nombre: string;
  tipo: string;
  brand: string | null;
  subcategory: string | null;
  abv: string | number | null;
  origin: string | null;
  age: string | null;
};

export async function getLicores(): Promise<Licor[]> {
  const rows = (await sql`SELECT * FROM licores ORDER BY nombre ASC`) as LicorRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.nombre,
    type: row.tipo,
    brand: row.brand ?? undefined,
    subcategory: row.subcategory ?? undefined,
    abv: row.abv ? Number(row.abv) : undefined,
    origin: row.origin ?? undefined,
    age: row.age ?? undefined,
  }));
}
