import { defineMiddleware } from 'astro:middleware';
import { createClient } from './lib/supabase-ssr';

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/create', '/admin'];

// Public routes that should never be protected
const publicRoutes = ['/auth', '/r', '/privacy', '/terms', '/demo'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const pathname = url.pathname;
  
  // Skip middleware for public routes
  const isPublic = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublic) {
    return next();
  }
  
  // Check if this is a protected route
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtected) {
    const supabase = createClient({ headers: request.headers, cookies: context.cookies });
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      // Redirect to home if not authenticated
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/'
        }
      });
    }
    
    // Add user to context for use in pages
    context.locals.user = session.user;
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