export interface VendorSession {
  token: string;
  vendor: {
    id: string;
    email: string;
    full_name: string;
    location?: string;
  };
}

const TOKEN_KEY = "cloudcrop_vendor_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// Backward-compatible aliases
export const getAuthToken = getToken;
export const setAuthToken = setToken;
export const clearAuthToken = clearToken;
