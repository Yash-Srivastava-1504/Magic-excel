// lib/useAuth.ts
// ----------------------------------------------------------
// Custom auth hook — we store the session in localStorage
// so the user stays logged in across page reloads.
// Replace plain-text passcode comparison with bcrypt in prod.
// ----------------------------------------------------------
import { useState, useEffect, useCallback } from "react";
import { backendApi } from "./api";

export interface AuthSession {
  userId:   string;
  username: string;
}

const SESSION_KEY = "talktoexl_session";

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function useAuth() {
  const [session, setSession]   = useState<AuthSession | null>(loadSession);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  // Persist session on change
  useEffect(() => {
    saveSession(session);
  }, [session]);

  const login = useCallback(async (username: string, passcode: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await backendApi.login(username, passcode);
      // Backend returns { access_token, token_type, user: { username, ... } }
      // The FastAPI OAuth2 response format.
      const userId = data.user?.id || data.user_id || username; 
      
      setSession({ userId, username: data.user?.username || username });
      return true;
    } catch (e: any) {
      setError(e.response?.data?.detail || "Invalid username or passcode.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  return { session, loading, error, login, logout };
}
