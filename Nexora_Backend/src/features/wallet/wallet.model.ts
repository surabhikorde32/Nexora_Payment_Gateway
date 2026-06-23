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

export const findWalletByUserId = async (userId: number) => {
  await ensureWalletsTable();

  const result = await getPool().query(
    "SELECT * FROM wallets WHERE user_id = $1 LIMIT 1",
    [userId],
  );

  return result.rows[0] ?? null;
};

export const updateWalletForUser = async (input: {
  userId: number;
  walletAddress: string;
  publicKey: string;
  privateKey: string;
}) => {
  await ensureWalletsTable();

  const result = await getPool().query(
    `
      UPDATE wallets
      SET wallet_address = $2,
          public_key = $3,
          private_key = $4,
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `,
    [input.userId, input.walletAddress, input.publicKey, input.privateKey],
  );

  return result.rows[0] ?? null;
};
