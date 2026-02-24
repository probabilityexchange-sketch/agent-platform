export interface User {
  id: string;
  walletAddress: string;
  username: string | null;
  tokenBalance: number;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  connected: boolean;
}
