"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

interface User {
  email: string
  name: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "nom_auth_user"
const TOKEN_STORAGE_KEY = "nom_auth_token"



export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsedUser = JSON.parse(stored)
        setUser(parsedUser)
      }
    } catch {
      // Invalid stored data, clear it
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    setIsInitialized(true)
  }, [])

  const API_URL = "http://localhost:8000"




const login = useCallback(async (email: string, password: string): Promise<boolean> => {
  setIsLoading(true)
  
  try {
    const response = await fetch(`${API_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    })

    if (!response.ok) {
      setIsLoading(false)
      return false
    }

    const data = await response.json()
    const token = data.access_token

    // Guarda el token
    localStorage.setItem(TOKEN_STORAGE_KEY, token)

    const newUser = {
      email,
      name: email.split("@")[0],
    }
    setUser(newUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser))
    setIsLoading(false)
    return true

  } catch {
    setIsLoading(false)
    return false
  }
}, [])

const logout = useCallback(() => {
  setUser(null)
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)  // limpia el token también
}, [])




  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitialized,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
