
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('ProtectedRoute: Auth state:', { user: !!user, loading });
  }, [user, loading]);

  // Reduced timeout to 3 seconds for better UX
  useEffect(() => {
    if (loading) {
      console.log('ProtectedRoute: Loading auth state...');
      const timeout = setTimeout(() => {
        console.warn('ProtectedRoute: Auth loading timeout - proceeding anyway');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('ProtectedRoute: User authenticated, rendering children');
  return <>{children}</>;
};
