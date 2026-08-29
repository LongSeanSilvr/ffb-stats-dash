import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  isUnlocked: boolean;
  unlockWithPasscode: (code: string) => Promise<boolean>;
  lock: () => void;
  handleLogoTap: () => void;
  isUnlockModalOpen: boolean;
  setIsUnlockModalOpen: (open: boolean) => void;
  tapCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for the derived 256-bit AES cryptographic token
const VAULT_STORAGE_KEY = 'morty_vault_token_v1';

// Cryptographic constants (PBKDF2 100,000 rounds with SHA-256 and AES-256-GCM)
const CRYPTO_SALT = new TextEncoder().encode('morty_stats_commish_salt_2026');
const CANARY_IV = Uint8Array.from([0x84, 0x8d, 0x90, 0x90, 0xe1, 0xba, 0xd4, 0x85, 0x27, 0xbf, 0xe6, 0x9b]);
const CANARY_CIPHER_AND_TAG = Uint8Array.from([
  0x5a, 0xf8, 0x00, 0x45, 0x96, 0x76, 0x6c, 0x45, 0x6a, 0xa7, 0xda, 0xd0, 0x0c, 0xa7, 0x1a, 0x42,
  0x51, 0xf0, 0x65, 0x78, 0xd1, 0x40, 0xca, 0x0a, 0x37, 0x3b, 0x3e, 0xeb, 0x56, 0x73, 0xf9, 0x31,
  0xe6, 0x2b, 0xef, 0xb5, 0xb4, 0xc0, 0xeb, 0x02, 0x34, 0x3a, 0x31, 0x13, 0x5a, 0x0c, 0x50, 0x8d,
  0x10, 0x05
]);
const CANARY_EXPECTED = 'MORTY_COMMISSIONER_VERIFIED_ACCESS';

// Derive 256-bit AES-GCM key from input passphrase using PBKDF2
async function deriveKeyFromPasscode(passcode: string): Promise<CryptoKey> {
  const clean = passcode.trim();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(clean),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: CRYPTO_SALT, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Attempt to decrypt canary with the candidate AES key
async function verifyAesKey(key: CryptoKey): Promise<boolean> {
  try {
    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: CANARY_IV },
      key,
      CANARY_CIPHER_AND_TAG
    );
    const result = new TextDecoder().decode(decryptedBuf);
    return result === CANARY_EXPECTED;
  } catch {
    return false;
  }
}

// Verify a raw hex key string stored in localStorage
async function verifyStoredKey(hexKey: string): Promise<boolean> {
  if (!hexKey || hexKey.length !== 64) return false;
  try {
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      const byte = parseInt(hexKey.substr(i * 2, 2), 16);
      if (isNaN(byte)) return false;
      keyBytes[i] = byte;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    return await verifyAesKey(key);
  } catch {
    return false;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Validate stored cryptographic token on mount
  useEffect(() => {
    async function checkVault() {
      try {
        const storedKeyHex = localStorage.getItem(VAULT_STORAGE_KEY);
        if (storedKeyHex) {
          const isValid = await verifyStoredKey(storedKeyHex);
          if (isValid) {
            setIsUnlocked(true);
            return;
          } else {
            // Tampered or fraudulent localStorage token: immediately purge
            localStorage.removeItem(VAULT_STORAGE_KEY);
            setIsUnlocked(false);
          }
        }
      } catch {
        setIsUnlocked(false);
      }

      // Check URL query param for easy 1-click unlock: ?unlock=...
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const unlockParam = urlParams.get('unlock') || urlParams.get('key');
        if (unlockParam) {
          const key = await deriveKeyFromPasscode(unlockParam);
          const isValid = await verifyAesKey(key);
          if (isValid) {
            const rawKeyBuf = await crypto.subtle.exportKey('raw', key);
            const hexKey = Array.from(new Uint8Array(rawKeyBuf))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            localStorage.setItem(VAULT_STORAGE_KEY, hexKey);
            setIsUnlocked(true);
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', newUrl);
          }
        }
      } catch {
        // ignore
      }
    }

    checkVault();
  }, []);

  const unlockWithPasscode = async (code: string): Promise<boolean> => {
    try {
      const key = await deriveKeyFromPasscode(code);
      const isValid = await verifyAesKey(key);
      if (isValid) {
        const rawKeyBuf = await crypto.subtle.exportKey('raw', key);
        const hexKey = Array.from(new Uint8Array(rawKeyBuf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        localStorage.setItem(VAULT_STORAGE_KEY, hexKey);
        setIsUnlocked(true);
        setIsUnlockModalOpen(false);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const lock = () => {
    setIsUnlocked(false);
    try {
      localStorage.removeItem(VAULT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleLogoTap = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        setIsUnlockModalOpen(true);
        return 0;
      }
      return next;
    });

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    tapTimerRef.current = setTimeout(() => {
      setTapCount(0);
    }, 3500);
  };

  return (
    <AuthContext.Provider
      value={{
        isUnlocked,
        unlockWithPasscode,
        lock,
        handleLogoTap,
        isUnlockModalOpen,
        setIsUnlockModalOpen,
        tapCount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
