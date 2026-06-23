// src/services/authService.ts
import { api } from "@/lib/api"
import {
  encryptPrivateKey,
  generateWallet,
  recoverWalletFromMnemonic,
} from "@/lib/walletUtils"

export interface User {
  id: string
  full_name: string
  email: string
  publicKey?: string | null
  walletAddress?: string | null
}

type WalletAuthPayload = {
  full_name?: string
  email: string
  password: string
  private_key: string
  public_key: string
  wallet_address: string
}

type AuthResponse = {
  success?: boolean
  user?: User
}

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== "object") return false

  const user = value as Partial<User>
  return Boolean(user.id && user.full_name && user.email)
}

const getUserFromResponse = (response: AuthResponse | User): User | null => {
  if ("user" in response) {
    return isUser(response.user) ? response.user : null
  }

  return isUser(response) ? response : null
}

let _isAuthenticated = false
let _currentUser: User | null = null
let _sessionChecked = false
let _sessionCheckPromise: Promise<boolean> | null = null
let _authListeners: Array<(
  isAuthenticated: boolean,
  user: User | null,
) => void> = []

const setAuthenticatedUser = (user: User) => {
  _isAuthenticated = true
  _currentUser = user
  _sessionChecked = true
  authService.notifyListeners()
}

export const authService = {
  async initializeSession(): Promise<boolean> {
    if (_sessionChecked) return _isAuthenticated
    if (_sessionCheckPromise) return _sessionCheckPromise

    _sessionCheckPromise = this.getCurrentUser()
      .then((user) => {
        _isAuthenticated = !!user
        _currentUser = user
        _sessionChecked = true
        _sessionCheckPromise = null
        this.notifyListeners()
        return _isAuthenticated
      })
      .catch(() => {
        _isAuthenticated = false
        _currentUser = null
        _sessionChecked = true
        _sessionCheckPromise = null
        this.notifyListeners()
        return false
      })

    return _sessionCheckPromise
  },

  addListener(
    listener: (isAuthenticated: boolean, user: User | null) => void,
  ): () => void {
    _authListeners.push(listener)
    listener(_isAuthenticated, _currentUser)
    return () => {
      _authListeners = _authListeners.filter((item) => item !== listener)
    }
  },

  notifyListeners(): void {
    _authListeners.forEach((listener) => {
      listener(_isAuthenticated, _currentUser)
    })
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<AuthResponse | User>("users/me")
      const user = getUserFromResponse(response)

      if (user) {
        _isAuthenticated = true
        _currentUser = user
      } else {
        _isAuthenticated = false
        _currentUser = null
      }

      _sessionChecked = true
      this.notifyListeners()
      return user ?? null
    } catch {
      _isAuthenticated = false
      _currentUser = null
      _sessionChecked = true
      this.notifyListeners()
      return null
    }
  },

  async login(data: { email: string; password: string }): Promise<User> {
    const response = await api.post<AuthResponse>("users/login", data)
    const user = getUserFromResponse(response)

    if (!user) {
      throw new Error("Login response did not include user")
    }

    setAuthenticatedUser(user)
    return user
  },

  async signup(data: {
    full_name: string
    email: string
    password: string
  }): Promise<{ user: User; mnemonic: string }> {
    const wallet = await generateWallet()
    const encryptedPrivateKey = await encryptPrivateKey(
      wallet.privateKey,
      data.password,
    )

    const payload: WalletAuthPayload = {
      ...data,
      email: data.email.trim().toLowerCase(),
      private_key: encryptedPrivateKey,
      public_key: wallet.publicKey,
      wallet_address: wallet.address,
    }

    const response = await api.post<AuthResponse>("users/register", payload)
    const user = getUserFromResponse(response)

    if (!user) {
      throw new Error("Signup response did not include user")
    }

    setAuthenticatedUser(user)
    return { user, mnemonic: wallet.mnemonic ?? "" }
  },

  async recoverWithMnemonic(data: {
    email: string
    password: string
    mnemonic: string
  }): Promise<User> {
    const wallet = await recoverWalletFromMnemonic(data.mnemonic)
    const encryptedPrivateKey = await encryptPrivateKey(
      wallet.privateKey,
      data.password,
    )

    const payload: WalletAuthPayload = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      private_key: encryptedPrivateKey,
      public_key: wallet.publicKey,
      wallet_address: wallet.address,
    }

    const response = await api.post<AuthResponse>("users/recover", payload)
    const user = getUserFromResponse(response)

    if (!user) {
      throw new Error("Recovery response did not include user")
    }

    return user
  },

  async logout(): Promise<void> {
    try {
      await api.post("users/logout")
    } catch (err) {
      console.warn("Logout request failed on server.", err)
    } finally {
      _isAuthenticated = false
      _currentUser = null
      _sessionChecked = false
      this.notifyListeners()
    }
  },

  isAuthenticated(): boolean {
    return _isAuthenticated
  },

  isSessionChecked(): boolean {
    return _sessionChecked
  },

  getCurrentUserSync(): User | null {
    return _currentUser
  },

  clearSession(): void {
    _isAuthenticated = false
    _currentUser = null
    _sessionChecked = false
    this.notifyListeners()
  },
}


