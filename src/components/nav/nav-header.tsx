import { Button } from "../../components/ui/button";
import { LogOut, Loader2, Mic } from "lucide-react";
import { secureSignOut } from "../../auth/client/auth-service";
import bunLogo from "../../assets/bun.svg";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "../../auth/client/auth-store";
import { Link } from "react-router-dom";

// Define a type for the component props
interface NavHeaderProps {
  openAuthModal: (mode: 'login' | 'register') => void;
}

export function NavHeader({ openAuthModal }: NavHeaderProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      const success = await secureSignOut();
      if (success) {
        toast.success("Logged out successfully");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center">
        <img src={bunLogo} alt="Rivena Logo" className="h-8 w-8 mr-2" />
        <span className="font-bold text-lg">Rivena</span>
      </div>
      <div className="flex items-center space-x-2">
        {isAuthenticated && user ? (
          <>
            <span className="text-sm mr-2">Hello, {user.name || user.email}</span>
            <Link to="/hume" className="mr-2">
              <Button variant="outline" size="sm">
                <Mic className="h-4 w-4 mr-2" />
                Hume Voice
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignOut}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openAuthModal('login')}
            >
              Sign in
            </Button>
            <Button 
              onClick={() => openAuthModal('register')}
              size="sm"
            >
              Register
            </Button>
          </>
        )}
      </div>
    </header>
  );
} 