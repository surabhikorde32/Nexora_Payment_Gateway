import { JsonRpcProvider, Wallet } from "ethers"

type WalletLike = {
  address: string
  privateKey: string
  signingKey: {
    compressedPublicKey: string
  }
}

type WalletPayload = {
  address: string
  privateKey: string
  publicKey: string
  mnemonic?: string
}

const KDF_ITERATIONS = 310_000

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const normalizeMnemonic = (mnemonic: string): string =>
  mnemonic.trim().toLowerCase().replace(/\s+/g, " ")

export const encryptPrivateKey = async (
  privateKey: string,
  password: string,
): Promise<string> => {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  )

  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  )

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoder.encode(privateKey),
  )

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)

  return bytesToBase64(combined)
}

let provider: JsonRpcProvider | null = null

export const initializeProvider = () => {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL ?? import.meta.env.VITE_RPC_URL

  if (!rpcUrl) {
    throw new Error("VITE_SEPOLIA_RPC_URL or VITE_RPC_URL is missing")
  }

  provider = new JsonRpcProvider(rpcUrl)
  return provider
}

const getProvider = () => provider ?? initializeProvider()

const serializeWallet = (wallet: WalletLike, mnemonic?: string): WalletPayload => ({
  address: wallet.address,
  privateKey: wallet.privateKey,
  publicKey: wallet.signingKey.compressedPublicKey,
  mnemonic,
})

export const generateWallet = async (): Promise<WalletPayload> => {
  const wallet = Wallet.createRandom().connect(getProvider())

  return serializeWallet(wallet, wallet.mnemonic?.phrase)
}

export const recoverWalletFromMnemonic = async (
  mnemonic: string,
): Promise<WalletPayload> => {
  const normalizedMnemonic = normalizeMnemonic(mnemonic)
  const words = normalizedMnemonic.split(" ")

  if (words.length !== 12) {
    throw new Error("Recovery phrase must contain exactly 12 words")
  }

  try {
    const wallet = Wallet.fromPhrase(normalizedMnemonic).connect(getProvider())
    return serializeWallet(wallet)
  } catch {
    throw new Error("Invalid recovery phrase")
  }
}

