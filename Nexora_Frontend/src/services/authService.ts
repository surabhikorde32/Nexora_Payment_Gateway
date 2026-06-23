// 

// src/services/authService.ts
import { api } from "@/lib/api"
import { encryptPrivateKey, generateWallet } from "@/lib/walletUtils"

export interface User {
  id: string
  full_name: string
  email: string
  publicKey?: string | null
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

// Runtime auth state - never stored in localStorage
let _isAuthenticated = false
let _currentUser: User | null = null
let _sessionChecked = false
let _sessionCheckPromise: Promise<boolean> | null = null
let _authListeners: Array<(isAuthenticated: boolean, user: User | null) => void> = []

export const authService = {
  /**
   * Initialize session - checks if user is authenticated
   */
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

  /**
   * Add auth state listener
   */
  addListener(listener: (isAuthenticated: boolean, user: User | null) => void): () => void {
    _authListeners.push(listener)
    listener(_isAuthenticated, _currentUser)
    return () => {
      _authListeners = _authListeners.filter(l => l !== listener)
    }
  },

  /**
   * Notify all listeners
   */
  notifyListeners(): void {
    _authListeners.forEach(listener => {
      listener(_isAuthenticated, _currentUser)
    })
  },

  /**
   * Get the current user profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<AuthResponse | User>("users/me")
      const user = getUserFromResponse(response)

      if (user) {
        _isAuthenticated = true
        _currentUser = user
        _sessionChecked = true
        this.notifyListeners()
      }

      if (!user) {
        _isAuthenticated = false
        _currentUser = null
        _sessionChecked = true
        this.notifyListeners()
      }

      return user ?? null
    } catch (err) {
      _isAuthenticated = false
      _currentUser = null
      _sessionChecked = true
      this.notifyListeners()
      return null
    }
  },

  /**
   * Log in user
   */
  async login(data: { email: string; password: string }): Promise<User> {
    const response = await api.post<AuthResponse>("users/login", data)
    const user = getUserFromResponse(response)

    if (!user) {
      throw new Error("Login response did not include user")
    }

    _isAuthenticated = true
    _currentUser = user
    _sessionChecked = true
    this.notifyListeners()

    return user
  },

  /**
   * Sign up user — returns user + mnemonic for display
   */
  async signup(data: {
    full_name: string
    email: string
    password: string
  }): Promise<{ user: User; mnemonic: string }> {

    const wallet = await generateWallet();
    const encryptedPrivateKey = await encryptPrivateKey(wallet.privateKey, data.password);
    const response = await api.post<AuthResponse>("users/register", {
      ...data,
      private_key: encryptedPrivateKey,
      public_key: wallet.publicKey,
      wallet_address: wallet.address,
    });
    const user = getUserFromResponse(response);

    if (!user) throw new Error("Signup response did not include user");

    _isAuthenticated = true;
    _currentUser = user;
    _sessionChecked = true;
    this.notifyListeners();

    return { user, mnemonic: wallet.mnemonic ?? "" };
  },

  /**
   * Log out user
   */
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
  }
}



