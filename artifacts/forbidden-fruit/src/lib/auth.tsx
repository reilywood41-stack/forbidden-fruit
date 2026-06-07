import { createContext, useContext, ReactNode, useEffect } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refetch: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isFetching, refetch } = useGetMe({
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    } as any,
  });

  return (
    <AuthContext.Provider value={{ 
      user: user ?? null, 
      isLoading: isLoading || isFetching,
      isAuthenticated: !!user,
      refetch 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode, adminOnly?: boolean }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && adminOnly && !user?.isAdmin) {
      setLocation("/content");
    }
  }, [isLoading, isAuthenticated, user, setLocation, adminOnly]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || (adminOnly && !user?.isAdmin)) {
    return null;
  }

  return <>{children}</>;
}
