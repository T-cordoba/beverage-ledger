import { neon } from "@neondatabase/serverless";

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

export async function getLicores(): Promise<Licor[]> {
  const result = await sql`SELECT * FROM licores ORDER BY nombre ASC`;
  return result.map((row: any) => ({
    id: row.id,
    name: row.nombre,
    type: row.tipo,
    brand: row.brand,
    subcategory: row.subcategory,
    abv: row.abv ? parseFloat(row.abv) : undefined,
    origin: row.origin,
    age: row.age,
  }));
}
