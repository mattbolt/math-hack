import express, { type Request, Response, NextFunction } from "express";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Domain redirection middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Define your primary domain here
  const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN || 'math-hack-mattbolt.replit.app';
  
  // Skip redirection in development
  if (app.get("env") === "development") {
    return next();
  }
  
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  
  // Check if the current host is not the primary domain
  if (host && host !== PRIMARY_DOMAIN) {
    const redirectUrl = `${protocol}://${PRIMARY_DOMAIN}${req.originalUrl}`;
    log(`Redirecting from ${host} to ${PRIMARY_DOMAIN}`);
    return res.redirect(301, redirectUrl);
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add Clerk middleware with environment-specific keys
const isDevelopment = app.get("env") === "development";
app.use(clerkMiddleware({
  publishableKey: isDevelopment 
    ? process.env.VITE_DEV_CLERK_PUBLISHABLE_KEY 
    : process.env.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: isDevelopment 
    ? process.env.DEV_CLERK_SECRET_KEY 
    : process.env.CLERK_SECRET_KEY,
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
