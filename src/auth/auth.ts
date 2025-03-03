import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { jwt } from "better-auth/plugins";

const prisma = new PrismaClient();

// Check for required environment variables and provide empty strings as fallbacks
// This prevents TypeScript errors with undefined values
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || '';
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || '';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    // Simplify trusted origins to match CORS settings
    trustedOrigins: [
        "http://localhost:5173" // Only the frontend origin
    ],
    emailAndPassword: {  
        enabled: true,
        autoSignIn: true 
    },
    socialProviders: {
        // Only include providers if they have proper configuration
        ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? {
            google: {
                clientId: GOOGLE_CLIENT_ID, 
                clientSecret: GOOGLE_CLIENT_SECRET,
                // OAuth callbacks must go to the backend server
                redirectURI: "http://localhost:3000/api/auth/callback/google"   
            }
        } : {}),
        ...(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET ? {
            github: {
                clientId: GITHUB_CLIENT_ID,
                clientSecret: GITHUB_CLIENT_SECRET,
                redirectURI: "http://localhost:3000/api/auth/callback/github"
            }
        } : {}),
        ...(FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET ? {
            facebook: {
                clientId: FACEBOOK_CLIENT_ID,
                clientSecret: FACEBOOK_CLIENT_SECRET,
                redirectURI: "http://localhost:3000/api/auth/callback/facebook"
            }
        } : {})
    },
    session: {
        // Set session duration to 30 days (in seconds)
        expiresIn: 30 * 24 * 60 * 60,
        // Use more secure cookie settings
        cookie: {
            sameSite: "lax",
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }
    },
    plugins: [
        jwt({
            jwt: {
                // Set JWT to expire in 1 hour
                expirationTime: "1h",
                // Customize what's in the JWT payload
                definePayload: (session) => ({
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.name,
                    // Include any other fields needed for instant validation
                })
            }
        })
    ]
});