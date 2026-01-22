import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Note: Auth checks are handled at the layout level, not in middleware.
// This is because Auth.js with Prisma adapter requires Node.js runtime,
// but Next.js middleware runs in edge runtime which is incompatible.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Generate a nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Build CSP header
  const cspHeader = buildCSP(nonce);

  const response = NextResponse.next();

  // Pass nonce to components via header
  response.headers.set("x-nonce", nonce);

  // Add security headers including CSP
  return addSecurityHeaders(response, cspHeader);
}

/**
 * Build Content Security Policy header value
 */
function buildCSP(nonce: string): string {
  const isProduction = process.env.NODE_ENV === "production";

  // Base CSP directives
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Allow eval in development for hot reload
      ...(isProduction ? [] : ["'unsafe-eval'"]),
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind and inline styles
    ],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:", // Allow images from any HTTPS source
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      // Ably WebSocket and REST connections
      "https://*.ably.io",
      "wss://*.ably.io",
      "https://rest.ably.io",
      "wss://realtime.ably.io",
      // Sentry error reporting
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
      // Development: allow localhost
      ...(isProduction ? [] : ["ws://localhost:*", "http://localhost:*"]),
    ],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  // Build the CSP string
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");
}

function addSecurityHeaders(
  response: NextResponse,
  cspHeader: string
): NextResponse {
  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy
  response.headers.set("Content-Security-Policy", cspHeader);

  // HSTS in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
