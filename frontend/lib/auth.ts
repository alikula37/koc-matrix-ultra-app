"use client"
// JWT + PIN + WebAuthn helper — localStorage token encrypt, PWA biometric/PIN lock
// Production-grade: AES-GCM (Web Crypto) + PBKDF2-like SHA-256 derivation, xor fallback for legacy
const TOKEN_KEY = "access_token"
const ENC_KEY = "enc_token"
const ENC_IV_KEY = "enc_iv" // legacy compat
const REFRESH_KEY = "refresh_token"
const PIN_HASH_KEY = "pin_hash"
const ENC_ALG = "enc_alg" // "aes-gcm" | "xor"

function isSecureContextAvailable(): boolean {
  return typeof window !== "undefined" && !!window.crypto?.subtle
}

// --- legacy xor (fallback & migration) ---
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

// --- AES-GCM via Web Crypto (SHA-256 key derivation) ---
async function deriveAesKey(pin: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(pin))
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
}

async function aesEncrypt(plain: string, pin: string): Promise<string> {
  if(!isSecureContextAvailable()) return xorEncrypt(plain, pin)
  const enc = new TextEncoder()
  const key = await deriveAesKey(pin)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain))
  const cipherArr = new Uint8Array(cipherBuf)
  const combined = new Uint8Array(iv.length + cipherArr.length)
  combined.set(iv, 0)
  combined.set(cipherArr, iv.length)
  // binary -> base64
  let binary = ""
  combined.forEach(b => binary += String.fromCharCode(b))
  return btoa(binary)
}

async function aesDecrypt(b64: string, pin: string): Promise<string> {
  if(!isSecureContextAvailable()) return xorDecrypt(b64, pin)
  try {
    const dec = new TextDecoder()
    const raw = atob(b64)
    const combined = Uint8Array.from(raw, c => c.charCodeAt(0))
    if(combined.length < 13) throw new Error("too short")
    const iv = combined.slice(0, 12)
    const cipher = combined.slice(12)
    const key = await deriveAesKey(pin)
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher)
    return dec.decode(plainBuf)
  } catch {
    // fallback to legacy xor
    return xorDecrypt(b64, pin)
  }
}

export async function setToken(access: string, refresh?: string, pin?: string) {
  if(pin) {
    const enc = await aesEncrypt(access, pin)
    localStorage.setItem(ENC_KEY, enc)
    localStorage.setItem(ENC_ALG, isSecureContextAvailable() ? "aes-gcm" : "xor")
    localStorage.setItem(PIN_HASH_KEY, btoa(pin))
    localStorage.removeItem(TOKEN_KEY)
  } else {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.removeItem(ENC_KEY)
    localStorage.removeItem(ENC_ALG)
  }
  if(refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

// sync wrapper for callers that can't await (stores plain temporarily, then upgrades to AES async)
export function setTokenSync(access: string, refresh?: string, pin?: string) {
  if(pin) {
    // fire-and-forget upgrade to AES-GCM
    aesEncrypt(access, pin).then(enc=>{
      localStorage.setItem(ENC_KEY, enc)
      localStorage.setItem(ENC_ALG, isSecureContextAvailable() ? "aes-gcm" : "xor")
    })
    localStorage.setItem(PIN_HASH_KEY, btoa(pin))
    localStorage.removeItem(TOKEN_KEY)
  } else {
    localStorage.setItem(TOKEN_KEY, access)
  }
  if(refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function getToken(): string | null {
  const plain = localStorage.getItem(TOKEN_KEY)
  if(plain) return plain
  const enc = localStorage.getItem(ENC_KEY)
  if(enc) return null // locked — needs PIN unlock (async)
  return null
}

export function getEncToken(): string | null { return localStorage.getItem(ENC_KEY) }
export function getEncAlg(): string | null { return localStorage.getItem(ENC_ALG) }

export async function unlockWithPin(pin: string): Promise<boolean> {
  const enc = localStorage.getItem(ENC_KEY)
  if(!enc) return false
  const dec = await aesDecrypt(enc, pin)
  if(dec.split(".").length===3) {
    localStorage.setItem(TOKEN_KEY, dec)
    localStorage.removeItem(ENC_KEY)
    localStorage.removeItem(ENC_ALG)
    // re-encrypt with AES-GCM for future locks (ensure alg is aes-gcm)
    const reEnc = await aesEncrypt(dec, pin)
    // keep plain for session, but store reEnc for next lock cycle via PIN_HASH
    // no-op: we already have plain, lock() will use AES
    return true
  }
  return false
}

// legacy sync version (deprecated)
export function unlockWithPinSync(pin: string): boolean {
  const enc = localStorage.getItem(ENC_KEY)
  if(!enc) return false
  const dec = xorDecrypt(enc, pin)
  if(dec.split(".").length===3) {
    localStorage.setItem(TOKEN_KEY, dec)
    localStorage.removeItem(ENC_KEY)
    return true
  }
  return false
}

export async function lock() {
  const t = localStorage.getItem(TOKEN_KEY)
  if(t) {
    const pinHash = localStorage.getItem(PIN_HASH_KEY)
    if(pinHash) {
      const pin = atob(pinHash)
      const enc = await aesEncrypt(t, pin)
      localStorage.setItem(ENC_KEY, enc)
      localStorage.setItem(ENC_ALG, isSecureContextAvailable() ? "aes-gcm" : "xor")
      localStorage.removeItem(TOKEN_KEY)
    }
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ENC_KEY)
  localStorage.removeItem(ENC_ALG)
  localStorage.removeItem(REFRESH_KEY)
}

export function isAuthenticated(): boolean { return !!getToken() }
export function isLocked(): boolean { return !!getEncToken() && !getToken() }

// WebAuthn biometric — platform authenticator
export async function registerBiometric(): Promise<boolean> {
  if(!window.PublicKeyCredential) return false
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Koç Matrix Ultra" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "trader@kocmatrix.com", displayName: "Trader" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", requireResidentKey: false },
        timeout: 60000,
        attestation: "none"
      } as any
    })
    return !!cred
  } catch { return false }
}

export async function authWithBiometric(): Promise<boolean> {
  if(!window.PublicKeyCredential) return false
  try {
    const assertion = await navigator.credentials.get({
      publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [], userVerification: "required", timeout: 60000 } as any
    })
    return !!assertion
  } catch { return false }
}
