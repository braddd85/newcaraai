import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "./components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// ✅ Optimized QueryClient for better cache & error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Retry failed requests twice before throwing an error
      staleTime: 1000 * 60 * 5, // Cache stays fresh for 5 minutes
      cacheTime: 1000 * 60 * 10, // Garbage collects stale queries after 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* ✅ Redirects to Dashboard if authenticated */}
            <Route path="/login" element={<LoginRedirect />} />

            {/* ✅ Protected Route for Dashboard */}
            <Route
              path="/"
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              }
            />

            {/* ✅ Catch-All Route (404 Handling) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// ✅ Shows a loading screen while components are loading
const LoadingScreen = () => (
  <div className="loading-screen flex items-center justify-center h-screen">
    <span className="text-lg font-semibold">Loading...</span>
  </div>
);

// ✅ Automatically redirects authenticated users from Login page
function LoginRedirect() {
  const isAuthenticated = localStorage.getItem("userToken"); // Replace with actual auth state
  return isAuthenticated ? <Navigate to="/" replace /> : <Login />;
}

export default App;
