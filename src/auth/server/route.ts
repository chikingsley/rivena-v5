import { auth } from "../auth";

/**
 * Auth handler for Bun server routes
 * 
 * This adapter converts between Bun's Request/Response format and the Node.js format
 * that Better Auth expects. It allows us to use Better Auth seamlessly with Bun.
 */
export const authHandler = auth.handler;

/**
 * Helper function to get the current session from a request
 * Can be used in middleware to protect routes
 */
export async function getSessionFromRequest(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });
    return session;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}
