"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet as useSolanaWallet,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";
import type { User } from "@/types/user";

import "@solana/wallet-adapter-react-ui/styles.css";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { },
  signOut: () => { },
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useSolanaWallet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    const wallet = publicKey.toBase58();

    // 1. Get nonce
    const nonceRes = await fetch(`/api/auth/nonce?wallet=${wallet}`);
    const { nonce } = await nonceRes.json();

    // 2. Sign message
    const message = `Sign in to Agent Platform\nNonce: ${nonce}`;
    const encodedMessage = new TextEncoder().encode(message);
    const signatureBytes = await signMessage(encodedMessage);
    const signature = bs58.encode(signatureBytes);

    // 3. Verify
    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, signature, nonce }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json();
      throw new Error(err.error || "Verification failed");
    }

    const { user: userData } = await verifyRes.json();
    setUser(userData);
  }, [publicKey, signMessage]);

  // Check existing session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Auto-trigger sign-in when wallet connects but user is not authenticated
  useEffect(() => {
    if (connected && publicKey && signMessage && !user && !loading) {
      signIn().catch((err) => {
        console.error("Auto sign-in failed:", err);
      });
    }
  }, [connected, publicKey, signMessage, user, loading, signIn]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout request failed", e);
    }
    setUser(null);
    disconnect();
    // Cookie is also cleared by the server, but doing it here doesn't hurt
    document.cookie = "auth-token=; path=/; max-age=0";
  }, [disconnect]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [endpoint, setEndpoint] = useState(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet")
  );

  // Fetch runtime config so we can swap RPC/network without rebuilding
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.solanaRpcUrl) setEndpoint(data.solanaRpcUrl);
      })
      .catch(() => { });
  }, []);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
