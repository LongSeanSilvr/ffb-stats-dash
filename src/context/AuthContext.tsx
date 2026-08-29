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

const STORAGE_KEY = 'morty_commissioner_unlocked_v1';

// SHA-256 hashes of accepted commissioner passphrases
const VALID_HASHES = [
  '1d54368caa7d719ae5b7324d0f4c832e0b8d5ab48d19cbd9940d864640d9e68d',
  '47c00f376acae6b8140dcad501fdb25427ee913cda5c68520d9ecfa724b51c29',
  (import.meta.env.VITE_COMMISSIONER_HASH as string)
].filter(Boolean);

async function hashPasscode(text: string): Promise<string> {
  const clean = text.toLowerCase().trim();
  const msgBuffer = new TextEncoder().encode(clean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check URL query param for easy mobile 1-click unlock: ?unlock=...
  useEffect(() => {
    async function checkUrlParam() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const unlockParam = urlParams.get('unlock') || urlParams.get('key');
        if (unlockParam) {
          const paramHash = await hashPasscode(unlockParam);
          if (VALID_HASHES.includes(paramHash)) {
            setIsUnlocked(true);
            localStorage.setItem(STORAGE_KEY, 'true');
            // Clean URL parameter without reloading
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', newUrl);
          }
        }
      } catch {
        // ignore
      }
    }
    checkUrlParam();
  }, []);

  const unlockWithPasscode = async (code: string): Promise<boolean> => {
    const codeHash = await hashPasscode(code);
    if (VALID_HASHES.includes(codeHash)) {
      setIsUnlocked(true);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
      setIsUnlockModalOpen(false);
      return true;
    }
    return false;
  };

  const lock = () => {
    setIsUnlocked(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
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
