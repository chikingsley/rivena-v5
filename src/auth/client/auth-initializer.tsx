import { useEffect } from 'react';
import { authService } from '@/auth/client/auth-service';
import { useAuthStore } from '@/auth/client/auth-store';
import { useSession } from '@/auth/client/auth-client';

/**
 * Component that initializes authentication from cached JWT
 * and listens for auth:change events
 */
export function AuthInitializer() {
  // Subscribe to Better Auth session
  const { data: sessionData, error: sessionError } = useSession();

  // Effect to sync Better Auth session with our store
  useEffect(() => {
    if (sessionData?.user) {
      // We have a user in the session, update the store
      useAuthStore.getState().setUser(sessionData.user);
      useAuthStore.getState().setAuthenticated(true);
      console.log('Session user detected, updating state:', sessionData.user);
    } else if (sessionError) {
      // Session error, clear auth state
      useAuthStore.getState().logout();
      console.error('Session error:', sessionError);
    }
  }, [sessionData, sessionError]);

  useEffect(() => {
    // Initialize auth from cached data
    initializeAuth();
    
    // Listen for auth change events
    window.addEventListener('auth:change', handleAuthChange);
    console.log('Auth change event listener registered');
    
    return () => {
      window.removeEventListener('auth:change', handleAuthChange);
    };
  }, []);
  
  // Initialize auth from cached data
  const initializeAuth = () => {
    // Set loading state while we check
    useAuthStore.getState().setLoading(true);
    
    // Check for cached authentication
    const user = authService.getCurrentUser();
    const token = authService.getAuthToken();
    
    if (user && token) {
      // We have cached auth, update the store
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setToken(token);
      useAuthStore.getState().setAuthenticated(true);
      console.log('Loaded cached user:', user);
    } else {
      console.log('No cached user found');
    }
    
    // Set loading to false regardless of result
    useAuthStore.getState().setLoading(false);
  };
  
  // Handle auth change events
  const handleAuthChange = (event: Event) => {
    // Cast the event to CustomEvent with the expected payload type
    const customEvent = event as CustomEvent<{ isAuthenticated: boolean }>;
    console.log('Auth change event received:', customEvent.detail);
    
    if (customEvent.detail.isAuthenticated) {
      // User is authenticated, update store with latest data
      const user = authService.getCurrentUser();
      const token = authService.getAuthToken();
      
      if (user && token) {
        useAuthStore.getState().setUser(user);
        useAuthStore.getState().setToken(token);
        useAuthStore.getState().setAuthenticated(true);
        console.log('Auth state updated after event:', user);
      }
    } else {
      // User is not authenticated, clear store
      useAuthStore.getState().logout();
      console.log('Auth state cleared after logout event');
    }
    
    // Always update loading state
    useAuthStore.getState().setLoading(false);
  };
  
  // This component doesn't render anything
  return null;
} 