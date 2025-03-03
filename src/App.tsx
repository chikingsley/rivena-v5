import "./index.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { LoginForm } from "./auth/compnents/login-form";
import { RegisterForm } from "./auth/compnents/register-form";
import { AuthProvider } from "./auth/compnents/AuthProvider";
import Home from "./pages/Home";
import ChatLayout from "./components/layouts/chat-layout";
import { NavHeader } from "./components/nav/nav-header";
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader
} from "./components/ui/dialog";
import { useAuthStore } from "./auth/client/auth-store";
import { authService } from "./auth/client/auth-service";
import { AuthInitializer } from "./auth/client/auth-initializer";
import Hume from "./pages/Hume";

// Layout for public pages that includes the nav header
function PublicLayout({ openAuthModal }: { openAuthModal: (mode: 'login' | 'register') => void }) {
  return (
    <>
      <NavHeader openAuthModal={openAuthModal} />
      <main className="pt-20 pb-8">
        <Outlet />
      </main>
    </>
  );
}

export function App() {
  // State for auth modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Initialize auth from cached JWT on app load
  useEffect(() => {
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
    }
    
    // Set loading to false regardless of result
    useAuthStore.getState().setLoading(false);
  }, []);
  
  // Handle successful auth
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  // Show the auth modal
  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthInitializer />
        <div className="min-h-screen bg-background relative">
          {/* Authentication Modal */}
          <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
            <DialogContent className="sm:max-w-md backdrop-blur-lg">
              <DialogHeader>
                <DialogTitle className="sr-only">
                  {authMode === 'login' ? 'Login to your account' : 'Create an account'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {authMode === 'login' ? 'Enter your credentials to login to your account' : 'Fill in your details to create a new account'}
                </DialogDescription>
              </DialogHeader>
              {authMode === 'login' ? (
                <LoginForm 
                  onSuccess={handleAuthSuccess}
                  onError={(error) => console.error(error)}
                />
              ) : (
                <RegisterForm 
                  onSuccess={handleAuthSuccess}
                  onError={(error) => console.error(error)}
                />
              )}
            </DialogContent>
          </Dialog>
          
          {/* Routes Configuration */}
          <Routes>
            {/* Public routes with NavHeader */}
            <Route element={<PublicLayout openAuthModal={openAuthModal} />}>
              <Route path="/" element={<Home openAuthModal={openAuthModal} />} />
            </Route>
            
            {/* Protected routes with ChatLayout */}
            <Route element={
              <AuthProvider requireAuth={true} redirectTo="/">
                <ChatLayout />
              </AuthProvider>
            }>
              <Route path="/hume" element={<Hume />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
