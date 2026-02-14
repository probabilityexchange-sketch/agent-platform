"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMemo } from "react";

export function useAuth() {
    const { login, logout, user, authenticated, ready } = usePrivy();

    // Map Privy user to our expected User format if needed
    // For now, we'll just return what's necessary
    const mappedUser = useMemo(() => {
        if (!user) return null;
        return {
            id: user.id,
            walletAddress: user.wallet?.address || "",
            // Add other fields as needed by the app
        };
    }, [user]);

    return {
        user: mappedUser,
        loading: !ready,
        isAuthenticated: authenticated,
        signIn: login,
        signOut: logout,
    };
}
