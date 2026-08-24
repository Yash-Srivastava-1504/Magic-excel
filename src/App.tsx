import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginScreen from "@/components/LoginScreen";
import LandingPage from "./pages/LandingPage";
import { useAuth } from "@/lib/useAuth";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">The application encountered an unexpected error. This is likely due to stale state after a code update.</p>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs text-left mb-8 max-w-2xl overflow-auto w-full">
             {String(this.state.error)}
          </div>
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Reload Workspace
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthGate() {
  const { session, loading, error, login, logout } = useAuth();
  const isDeployed = import.meta.env.VITE_APP_DEPLOYED === "true";

  if (!session) {
    if (isDeployed) {
      return (
        <LoginScreen
          onLogin={login}
          loading={loading}
          error={error}
        />
      );
    }
    return <LandingPage />;
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <Index
                userId={session.userId}
                username={session.username}
                onLogout={logout}
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" enableSystem defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthGate />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
