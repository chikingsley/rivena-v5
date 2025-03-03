import { useState, useEffect } from "react";
import { getHumeAccessToken } from "../../lib/hume-utils/getHumeAccessToken";
import ClientComponent from "../../voice/chat/window/Chat";

// Dynamic import for the client component to avoid SSR issues
const Chat = ClientComponent;

export default function Hume() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the Hume access token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const token = await getHumeAccessToken();
        
        if (!token) {
          setError("Failed to get Hume access token. Please check your API keys.");
          return;
        }
        
        setAccessToken(token);
      } catch (err) {
        console.error("Error fetching Hume access token:", err);
        setError("An error occurred while fetching the Hume access token.");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state
  if (error || !accessToken) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="text-destructive text-xl font-semibold mb-2">Error</div>
        <p className="text-center">{error || "Unable to initialize Hume Voice Chat."}</p>
        <button 
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render the Chat component with the access token
  return (
    <div className="flex flex-col h-screen">
      <h1 className="text-2xl font-bold p-4 border-b">Hume Voice Chat</h1>
      <div className="flex-1 overflow-hidden">
        <Chat accessToken={accessToken} />
      </div>
    </div>
  );
}
