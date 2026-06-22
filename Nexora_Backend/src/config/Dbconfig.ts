import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | undefined;

export const getPool = () => {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for PostgreSQL connection.");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
    });

    // Local PostgreSQL connection config. Keep this commented when using Neon DATABASE_URL.
    // pool = new Pool({
    //   host: process.env.DB_HOST,
    //   user: process.env.DB_USER,
    //   password: String(process.env.DB_PASS),
    //   database: process.env.DB_NAME,
    //   port: Number(process.env.DB_PORT) || 5432,
    //   max: 10,
    //   idleTimeoutMillis: 60000,
    //   connectionTimeoutMillis: 10000,
    // });
  }
  return pool;
};

const db = {
  query: async (text: string, params?: unknown[]) => {
    let index = 1;
    let newText = text.replace(/\?/g, () => `$${index++}`);
    
    const isInsert = newText.trim().toUpperCase().startsWith("INSERT INTO");
    if (isInsert && !newText.toUpperCase().includes("RETURNING")) {
       newText += " RETURNING id";
    }

    const currentPool = getPool();
    const result = await currentPool.query(newText, params);

    const command = result.command.toUpperCase();
    if (command === "INSERT" || command === "UPDATE" || command === "DELETE") {
       const okPacket = {
         insertId: (command === "INSERT" && result.rows.length > 0) ? (result.rows[0].id || result.rows[0].ID) : null,
         affectedRows: result.rowCount,
         warningStatus: 0,
         serverStatus: 2,
         changedRows: command === "UPDATE" ? result.rowCount : 0
       };
       return [okPacket, result.fields];
    }
    
    return [result.rows, result.fields];
  },
  connect: () => getPool().connect(),
  end: () => getPool().end(),
};

export const dbConnection = async () => {
  try {
    const client = await getPool().connect();
    console.log("Connected to the PostgreSQL database.");
    client.release();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error connecting to the database:", message);
  }
};

export default db;




