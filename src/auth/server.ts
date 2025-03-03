import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./auth";
import { registerWithValidation, loginWithLogging, logoutWithCleanup } from "./server/actions";

// Define types for our request bodies
interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface UserBody {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

// Create auth middleware using Elysia's macro
const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ error, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return error(401);
        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

// Create the main app
const app = new Elysia()
  .use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000"], // Allow both Vite and Elysia servers
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Set-Cookie"], // Important for auth cookies
  }))
  .use(betterAuth)
  // Custom auth endpoints
  .post("/api/custom-auth/register", async ({ body }) => {
    try {
      const typedBody = body as RegisterBody;
      const result = await registerWithValidation(typedBody);
      return result;
    } catch (err) {
      console.error("Registration error:", err);
      throw new Error("Registration failed");
    }
  })
  .post("/api/custom-auth/login", async ({ body }) => {
    try {
      const typedBody = body as LoginBody;
      const result = await loginWithLogging(typedBody);
      return result;
    } catch (err) {
      console.error("Login error:", err);
      throw new Error("Login failed");
    }
  })
  .post("/api/custom-auth/logout", async ({ request }) => {
    try {
      await logoutWithCleanup(request);
      return { success: true };
    } catch (err) {
      console.error("Logout error:", err);
      throw new Error("Logout failed");
    }
  })
  // Protected routes example
  .get("/api/users", () => [
    { id: 1, name: "User 1" },
    { id: 2, name: "User 2" }
  ])
  .post("/api/users", ({ body }) => {
    const typedBody = body as UserBody;
    return { id: 3, ...typedBody };
  }, { auth: true })
  .put("/api/users", ({ body }) => {
    const typedBody = body as UserBody;
    return { updated: true, ...typedBody };
  }, { auth: true })
  .delete("/api/users", () => new Response(null, { status: 204 }), { auth: true })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Keep graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  process.exit(0);
});