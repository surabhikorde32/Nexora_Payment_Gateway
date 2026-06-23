import * as ethers from 'ethers';
import { JsonRpcProvider } from 'ethers';

/**
 * Encrypt a private key using AES-GCM with the user's password.
 * Returns a base64 string: salt(16) + iv(12) + ciphertext
 */
export const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(privateKey)
  );

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
};

// Initialize provider
let provider: JsonRpcProvider | null = null;
const VITE_SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL 
/**
 * Initialize blockchain provider
 */
export const initializeProvider = () => {
  try {
    provider = new ethers.JsonRpcProvider(VITE_SEPOLIA_RPC_URL);
    return provider;
  } catch (error) {
    console.error('Failed to initialize provider:', error);
    throw new Error('Blockchain provider initialization failed');
  }
};

/**
 * Generate a new wallet
 */
export const generateWallet = async () => {
  try {
    // Initialize provider if not already done
    if (!provider) {
      initializeProvider();
    }

    // Create random wallet
    const wallet = ethers.Wallet.createRandom();
    
    const connectedWallet = wallet.connect(provider!);

    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      mnemonic: wallet.mnemonic?.phrase,
  
    };
  } catch (error) {
    console.error('Failed to generate wallet:', error);
    throw new Error('Wallet generation failed');
  }
};


