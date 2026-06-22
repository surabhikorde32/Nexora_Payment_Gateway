export type UserRecord = {
  id: number;
  full_name: string;
  email: string;
  password: string;
  public_key: string | null;
  private_key: string | null;
  created_at: Date;
  updated_at: Date;
};

export type SafeUser = {
  id: number;
  full_name: string;
  email: string;
  publicKey: string | null;
};

export const serializeUser = (user: UserRecord): SafeUser => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  publicKey: user.public_key,
});
