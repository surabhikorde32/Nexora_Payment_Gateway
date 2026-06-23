import { getPool } from "../../config/Dbconfig.js";
import type { UserRecord } from "./user.types.js";

export const ensureUsersTable = async () => {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await getPool().query(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS public_key,
      DROP COLUMN IF EXISTS private_key
  `);
};

export const createUser = async (input: {
  full_name: string;
  email: string;
  passwordHash: string;
}) => {
  await ensureUsersTable();

  const result = await getPool().query<UserRecord>(
    `
      INSERT INTO users (full_name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [input.full_name, input.email, input.passwordHash],
  );

  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  await ensureUsersTable();

  const result = await getPool().query<UserRecord>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email],
  );

  return result.rows[0] ?? null;
};

export const findUserById = async (id: string) => {
  await ensureUsersTable();

  const result = await getPool().query<UserRecord>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [id],
  );

  return result.rows[0] ?? null;
};

export const updateUserRecoveryCredentials = async (input: {
  id: number;
  passwordHash: string;
}) => {
  await ensureUsersTable();

  const result = await getPool().query<UserRecord>(
    `
      UPDATE users
      SET password = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [input.id, input.passwordHash],
  );

  return result.rows[0] ?? null;
};
