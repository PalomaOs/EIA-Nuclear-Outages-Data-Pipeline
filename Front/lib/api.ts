// lib/api.ts
const TOKEN_STORAGE_KEY = "nom_auth_token"

export const API_URL = "http://localhost:8000"

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  })

  const newToken = res.headers.get("X-New-Token")
  if (newToken) {
    localStorage.setItem("nom_auth_token", newToken)
  }

  if (res.status === 401) {
    localStorage.removeItem("nom_auth_token")
    localStorage.removeItem("nom_auth_user")
    window.location.href = "/"
  }

  return res
}