import { defineMiddleware } from 'astro:middleware';
import { createClient } from './lib/supabase-ssr';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/create', '/admin'];

// Public routes that should never be protected
const publicRoutes = ['/auth', '/r', '/privacy', '/terms', '/demo', '/studio'];

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Skip middleware for public routes
  const isPublic = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublic) {
    return next();
  }

  // Check if this is a protected route
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const supabase = createClient(context);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/'
        }
      });
    }

    // Add user to context for use in pages
    context.locals.user = user;
  }

  return next();
});

// Type definitions for context.locals
declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}
