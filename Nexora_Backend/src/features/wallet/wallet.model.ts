import { getPool } from "../../config/Dbconfig.js";

export const ensureWalletsTable = async () => {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      wallet_address TEXT,
      public_key TEXT,
      private_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

export const createWallet = async (input: {
  userId: number;
  walletAddress?: string | null;
  publicKey?: string | null;
  privateKey?: string | null;
}) => {
  await ensureWalletsTable();

  const result = await getPool().query(
    `
      INSERT INTO wallets (user_id, wallet_address, public_key, private_key)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      input.userId,
      input.walletAddress || null,
      input.publicKey || null,
      input.privateKey || null,
    ],
  );

  return result.rows[0];
};
