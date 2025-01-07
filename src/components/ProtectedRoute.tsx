import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
    } catch (error) {
      console.error('Auth error:', error);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">กำลังตรวจสอบสิทธิ์...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/staff/login" replace />;
  }

  return <>{children}</>;
}