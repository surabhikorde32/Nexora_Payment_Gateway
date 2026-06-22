// 

// src/services/authService.ts
import { api } from "@/lib/api"

export interface User {
  id: string
  full_name: string
  email: string
  publicKey?: string | null
}

type AuthResponse = {
  success?: boolean
  user: User
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
      const response = await api.get<AuthResponse>("users/me")
      const user = response.user

      if (user) {
        _isAuthenticated = true
        _currentUser = user
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
    if (response.user) {
      _isAuthenticated = true
      _currentUser = response.user
      _sessionChecked = true
      this.notifyListeners()
    }
    return response.user
  },

  /**
   * Sign up user
   */
  async signup(data: {
    full_name: string
    email: string
    password: string
    private_key: string
    public_key: string
  }): Promise<User> {
    const response = await api.post<AuthResponse>("users/register", data)
    if (response.user) {
      _isAuthenticated = true
      _currentUser = response.user
      _sessionChecked = true
      this.notifyListeners()
    }
    return response.user
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
