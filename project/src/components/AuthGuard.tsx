import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [user, loading] = useAuthState(auth);

  // Show loading screen while Firebase authentication is processing
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        aria-live="polite"
      >
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // If no user is logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render the protected content
  return <>{children}</>;
}
