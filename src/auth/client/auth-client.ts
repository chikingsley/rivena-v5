import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"

// Better Auth expects this format
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const { signIn, signUp, signOut, useSession } = createAuthClient({
    // Make sure we're pointing to the /api/auth prefix
    baseURL: `${API_URL}/api/auth`,
    // Add this to ensure cookies are sent with requests
    fetchOptions: {
        credentials: 'include'
    },
    plugins: [inferAdditionalFields({
        user: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" }
        }
    })]
})

// Log for debugging
console.log('Auth client configured with baseURL:', `${API_URL}/api/auth`);