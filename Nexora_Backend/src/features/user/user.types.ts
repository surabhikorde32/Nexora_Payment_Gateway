export type UserRecord = {
  id: number;
  full_name: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
};

export type WalletRecordLike = {
  wallet_address?: string | null;
  public_key?: string | null;
};

export type SafeUser = {
  id: number;
  full_name: string;
  email: string;
  walletAddress: string | null;
  publicKey: string | null;
};

export const serializeUser = (
  user: UserRecord,
  wallet?: WalletRecordLike | null,
): SafeUser => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  walletAddress: wallet?.wallet_address ?? null,
  publicKey: wallet?.public_key ?? null,
});
