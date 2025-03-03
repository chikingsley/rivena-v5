import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"

export const { signIn, signUp, signOut, useSession } = createAuthClient({
    baseURL: "http://localhost:3000",
    plugins: [inferAdditionalFields({
        user: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" }
        }
    })]
})