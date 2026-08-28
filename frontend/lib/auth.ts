"use client"
// JWT + PIN + WebAuthn helper — localStorage token encrypt, PWA biometric/PIN lock
const TOKEN_KEY = "access_token"
const ENC_KEY = "enc_token"
const REFRESH_KEY = "refresh_token"
const PIN_HASH_KEY = "pin_hash"

// Simple XOR encrypt with PIN (demo-level, production'da AES-GCM önerilir)
function xorEncrypt(text: string, pin: string): string {
  let out = ""
  for(let i=0;i<text.length;i++) out += String.fromCharCode(text.charCodeAt(i) ^ pin.charCodeAt(i % pin.length))
  return btoa(out)
}
function xorDecrypt(enc: string, pin: string): string {
  try {
    const decoded = atob(enc)
    let out = ""
    for(let i=0;i<decoded.length;i++) out += String.fromCharCode(decoded.charCodeAt(i) ^ pin.charCodeAt(i % pin.length))
    return out
  } catch { return "" }
}

export function setToken(access: string, refresh?: string, pin?: string) {
  if(pin) {
    const enc = xorEncrypt(access, pin)
    localStorage.setItem(ENC_KEY, enc)
    localStorage.setItem(PIN_HASH_KEY, btoa(pin)) // hash placeholder
    localStorage.removeItem(TOKEN_KEY)
  } else {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.removeItem(ENC_KEY)
  }
  if(refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function getToken(): string | null {
  const plain = localStorage.getItem(TOKEN_KEY)
  if(plain) return plain
  const enc = localStorage.getItem(ENC_KEY)
  if(enc) return null // locked — needs PIN
  return null
}

export function getEncToken(): string | null { return localStorage.getItem(ENC_KEY) }

export function unlockWithPin(pin: string): boolean {
  const enc = localStorage.getItem(ENC_KEY)
  if(!enc) return false
  const dec = xorDecrypt(enc, pin)
  // JWT format check
  if(dec.split(".").length===3) {
    localStorage.setItem(TOKEN_KEY, dec)
    localStorage.removeItem(ENC_KEY)
    return true
  }
  return false
}

export function lock() {
  const t = localStorage.getItem(TOKEN_KEY)
  if(t) {
    const pinHash = localStorage.getItem(PIN_HASH_KEY)
    if(pinHash) {
      const pin = atob(pinHash)
      const enc = xorEncrypt(t, pin)
      localStorage.setItem(ENC_KEY, enc)
      localStorage.removeItem(TOKEN_KEY)
    }
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ENC_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isAuthenticated(): boolean { return !!getToken() }
export function isLocked(): boolean { return !!getEncToken() && !getToken() }

// WebAuthn biometric placeholder — if available, register & authenticate
export async function registerBiometric(): Promise<boolean> {
  if(!window.PublicKeyCredential) return false
  try {
    // Simplified: create credential with user id "koc-matrix"
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: { name: "Koç Matrix Ultra" },
        user: { id: new Uint8Array([1,2,3]), name: "trader@kocmatrix.local", displayName: "Trader" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" }
      } as any
    })
    return !!cred
  } catch { return false }
}

export async function authWithBiometric(): Promise<boolean> {
  if(!window.PublicKeyCredential) return false
  try {
    const assertion = await navigator.credentials.get({
      publicKey: { challenge: new Uint8Array(32), allowCredentials: [] } as any
    })
    return !!assertion
  } catch { return false }
}
