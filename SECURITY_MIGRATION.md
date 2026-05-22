# Frontend Security Hardening: Token Management Migration Guide

## Overview
The frontend currently stores authentication tokens in `localStorage`, which is vulnerable to XSS attacks. This guide explains the migration to a more secure token storage approach using HttpOnly cookies for refresh tokens.

## Current State
- **Access Token**: Stored in `localStorage` ❌ (Vulnerable to XSS)
- **Refresh Token**: Stored in `localStorage` ❌ (Vulnerable to XSS)
- **Backend**: Already supports HttpOnly cookies for refresh tokens ✅

## Target State
- **Access Token**: Store in memory or short-lived (5-15 min) ✅
- **Refresh Token**: Automatic cookie handling (HttpOnly, Secure, SameSite) ✅
- **Backend Cookie Refresh**: Enabled ✅

## Migration Steps

### Phase 1: Remove Refresh Token from localStorage (CRITICAL)
**Files to update:**
- `src/hooks/useLoginLogic.ts` - Remove refresh_token storage
- `src/App.tsx` - Stop reading refresh_token from localStorage
- `src/utils/authService.ts` - Use cookie-based refresh

**Changes:**
```typescript
// BEFORE (insecure)
localStorage.setItem('refresh_token', response.refresh);
localStorage.setItem('access_token', response.access);

// AFTER (secure)
// Refresh token is automatically set in HttpOnly cookie by backend
// Store only access token temporarily in memory or sessionStorage
const accessToken = response.access;
// Use memory variable or sessionStorage (less secure but better than localStorage)
```

### Phase 2: Implement Secure Token Refresh (MEDIUM PRIORITY)
**Endpoint**: `POST /api/token/refresh/`
- Frontend: Automatically sends refresh_token from cookies
- Backend: Returns new access token
- No manual token handling needed

**Implementation:**
```typescript
// In authService.ts
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    // Backend reads refresh_token from cookies automatically
    const response = await fetch(`${API_ENDPOINT}/token/refresh/`, {
      method: 'POST',
      credentials: 'include', // Important: sends cookies
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.access; // New access token
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  return null;
};
```

### Phase 3: Global Token Management (LOW PRIORITY)
Replace direct `localStorage.getItem('access_token')` calls with a centralized auth context:
- Create `AuthContext` to manage tokens in memory
- Use axios interceptors to auto-refresh tokens
- Store access token only in memory (lost on page refresh, user must re-login)

**Files affected:**
- `src/utils/faculty_api.ts` (20+ occurrences)
- `src/utils/authService.ts`
- `src/App.tsx`
- All API call utilities

## Implementation Checklist

### Immediate (Critical - Week 1)
- [ ] Remove `refresh_token` from localStorage in all files
- [ ] Update login endpoint to not return `refresh_token` in response body
- [ ] Test cookie-based refresh with new backend

### Short-term (High - Week 2-3)
- [ ] Create `AuthContext` for centralized token management
- [ ] Implement axios interceptor for auto-refresh
- [ ] Update `fetchWithTokenRefresh` to use new pattern
- [ ] Add CSRF token handling for state-changing requests

### Medium-term (Medium - Week 3-4)
- [ ] Migrate all API calls to use centralized auth
- [ ] Add sessionStorage as fallback (optional, lower security)
- [ ] Implement token expiration warnings
- [ ] Add logout on token expiration

### Long-term (Low - As needed)
- [ ] Implement refresh token rotation (backend already supports)
- [ ] Add device/session management
- [ ] Add audit logging for auth events
- [ ] Implement browser fingerprinting for additional security

## CSP & Sanitization Status

### Content Security Policy ✅
- Added CSP middleware to Django: `attendance_system/csp_middleware.py`
- Middleware activated in `attendance_system/settings.py`
- Headers include: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`

### HTML Sanitization ✅
- Added DOMPurify to `package.json`
- Created `src/utils/sanitize.ts` with sanitization functions
- Updated Chat component to use `sanitizeHtml()`
- All user-generated HTML now sanitized before rendering

## Testing Checklist

- [ ] Login works without localStorage
- [ ] Refresh token automatic via cookies
- [ ] Page refresh doesn't break auth (user redirected to login if no cookie)
- [ ] Token expiration handled gracefully
- [ ] XSS payload in chat messages is sanitized
- [ ] CSP headers present in all responses
- [ ] No errors in browser console related to auth

## Rollout Strategy

1. **Merge backend changes** - CSP headers, cookie refresh endpoints
2. **Deploy to staging** - Test token refresh flow
3. **Merge frontend changes** - Remove localStorage tokens, add sanitization
4. **Deploy to staging** - Verify auth flow works
5. **Production rollout** - Monitor for issues, prepare rollback plan

## Monitoring & Alerts

Set up monitoring for:
- Failed token refresh attempts
- Unusual login patterns
- XSS detection (CSP violations)
- CSRF failures
- Unauthorized access attempts

## References
- [OWASP: Secure Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#token-based-mitigation)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
