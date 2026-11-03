import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware: Public Store Identity Resolution (Phase 4A)
 * Handles both platform subdomains (*.biztrix.in) and external custom domains.
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // 1. Resolve host metadata
  const isPlatformDomain = hostname.endsWith('biztrix.in') || hostname.endsWith('biztrix.io');
  
  // 2. Identify and Route Standard Subdomains
  if (isPlatformDomain) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const slug = parts[0].toLowerCase();
      if (!['www', 'app', 'admin', 'api'].includes(slug)) {
        if (url.pathname === '/') url.pathname = '/shop';
        
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-biztrix-slug', slug);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }
  } 

  // 3. Detect and Pass Custom Domain Candidates
  // Only trigger for non-development and non-platform hostnames
  const isDevHost = hostname.includes('localhost') || hostname.includes('run.app') || hostname.includes('studio-');
  
  if (!isPlatformDomain && !isDevHost) {
    if (url.pathname === '/') url.pathname = '/shop';
    
    const requestHeaders = new Headers(request.headers);
    // Pass the full hostname for server-side custom domain lookup
    requestHeaders.set('x-biztrix-custom-domain', hostname.toLowerCase());
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/shop/:path*'],
};