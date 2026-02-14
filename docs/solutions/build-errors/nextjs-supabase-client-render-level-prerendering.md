---
title: "Next.js Supabase Client Instantiation During Build Prerendering"
date: 2026-02-14
category: build-errors
tags:
  - next.js
  - supabase
  - static-generation
  - environment-variables
  - client-components
  - prerendering
severity: critical
component: "Authentication (login, forgot-password, reset-password pages)"
symptom: "next build fails with '@supabase/ssr: Your project's URL and API key are required to create a Supabase client!'"
root_cause: "Client components instantiated Supabase client at render-time. During Next.js static prerendering, components execute on the server where env vars are unavailable."
resolution: "Moved createClient() calls from component render-time into event handlers."
related_issues: []
---

# Next.js + Supabase: Build Failure from Client-Level `createClient()`

## Problem

When building a Next.js 16 application with Supabase authentication, `next build` fails during static prerendering:

```
Error occurred prerendering page "/forgot-password"
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

This affects all client component pages that create a Supabase client at the component render level (login, forgot-password, reset-password).

**Key insight**: `next dev` does NOT trigger this error. It only surfaces during `next build` because the dev server skips static prerendering.

## Root Cause

Client components marked with `"use client"` are still **server-side prerendered** during `next build`. When `createClient()` is called at the top of the component function body, it executes during this SSR prerender phase where `NEXT_PUBLIC_SUPABASE_*` environment variables may not be available.

```tsx
// BROKEN: createClient() runs during SSR prerender
export default function LoginPage() {
  const supabase = createClient(); // Executes at build time on server!

  async function handleSubmit(e: React.FormEvent) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
  }
}
```

## Solution

Move `createClient()` into event handlers so it only runs in the browser on user interaction:

```tsx
// FIXED: createClient() only runs on user action
export default function LoginPage() {
  // No createClient() here!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient(); // Only runs in browser
    const { error } = await supabase.auth.signInWithPassword({ email, password });
  }
}
```

Applied to all 3 affected files:
- `app/login/page.tsx`
- `app/forgot-password/page.tsx`
- `app/reset-password/page.tsx`

## Prevention

### Rule

Never call `createClient()` at the top level of a `"use client"` component. Always call it inside event handlers, `useEffect`, or other browser-only code paths.

### Correct Supabase + Next.js Pattern

| Context | Client Factory | Notes |
|---------|---------------|-------|
| Server Components | `@/lib/supabase/server` | Async, uses cookies, runs on server |
| Client Components | `@/lib/supabase/client` | **Only inside handlers/effects** |
| Middleware | `@/lib/supabase/middleware` | Special request/response cookie adapter |

### Code Review Checklist

- [ ] No `createClient()` at component render level in `"use client"` files
- [ ] All client-side `createClient()` calls are inside handlers, effects, or callbacks
- [ ] Run `next build` before deploying (dev server won't catch this)

## Additional Gotchas

### Supabase CLI Global Install Fails on Windows

`npm install -g supabase` is not supported. Use `npx supabase` instead:

```bash
npx supabase db push
npx supabase migration list
```

### `create-next-app` Stuck in Non-TTY

Interactive prompts block in CI/non-TTY shells. Manually scaffold instead:

```bash
npm init -y && npm install next react react-dom
```

### Next.js 16 Middleware Deprecation Warning

The warning "middleware file convention is deprecated, use proxy instead" is cosmetic. Supabase SSR auth patterns depend on middleware and it still works. Safe to ignore until a migration path is available.

## Related Documentation

- [Migration Plan](../../plans/2026-02-14-feat-nextjs-supabase-migration-plan.md)
