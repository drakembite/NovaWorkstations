import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_COOKIE_NAME,
  validateCredentials,
  createSessionToken,
  verifySessionToken,
} from '../src/lib/auth';
import { POST as loginApi } from '../src/app/api/admin/auth/login/route';
import { POST as logoutApi } from '../src/app/api/admin/auth/logout/route';
import { middleware } from '../src/middleware';
import { GET as getOrdersApi } from '../src/app/api/orders/route';

const env = process.env as Record<string, string | undefined>;

/** Runs `fn` with the given env overrides (undefined deletes the key), restoring afterwards. */
async function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    previous[key] = env[key];
    if (overrides[key] === undefined) delete env[key];
    else env[key] = overrides[key];
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete env[key];
      else env[key] = previous[key];
    }
  }
}

/** Captures console.error output while `fn` runs. */
async function captureErrors<T>(fn: () => Promise<T>): Promise<{ result: T; logs: string }> {
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
  };
  try {
    const result = await fn();
    return { result, logs: lines.join('\n') };
  } finally {
    console.error = original;
  }
}

async function runAuthTests() {
  console.log('🧪 Starting NovaWorkstations Auth & Admin Protection Tests...\n');

  // =========================================================================
  // 1. Credentials Validation
  // =========================================================================
  console.log('--- Test 1: Credentials Validation ---');
  {
    assert.strictEqual(validateCredentials('AdminPrueba1234', 'AdminPassword1234'), true);
    assert.strictEqual(validateCredentials('AdminPrueba1234', 'WrongPassword'), false);
    assert.strictEqual(validateCredentials('WrongUser', 'AdminPassword1234'), false);
    assert.strictEqual(validateCredentials('', ''), false);
    assert.strictEqual(validateCredentials(null, null), false);
    console.log('✅ Credentials validation verified.');
  }

  // =========================================================================
  // 2. Cryptographic Token Lifecycle
  // =========================================================================
  console.log('\n--- Test 2: HMAC Session Token Lifecycle ---');
  {
    const token = await createSessionToken(ADMIN_USERNAME);
    assert.ok(typeof token === 'string' && token.includes('.'), 'Token must be header.signature format');

    const isValid = await verifySessionToken(token);
    assert.strictEqual(isValid, true, 'Valid token must be verified successfully');

    // Tampered token test
    const tampered = token.slice(0, -4) + 'abcd';
    const isTamperedValid = await verifySessionToken(tampered);
    assert.strictEqual(isTamperedValid, false, 'Tampered token must be rejected');

    // Garbage token test
    assert.strictEqual(await verifySessionToken('invalid.garbage.token'), false);
    assert.strictEqual(await verifySessionToken(''), false);
    assert.strictEqual(await verifySessionToken(null), false);

    console.log('✅ Token creation, signature verification, and tampering rejection verified.');
  }

  // =========================================================================
  // 3. Login and Logout API Routes
  // =========================================================================
  console.log('\n--- Test 3: Login & Logout API Routes ---');
  {
    // 3.1 Invalid login credentials
    const badLoginReq = new NextRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'AdminPrueba1234',
        password: 'wrong_password',
      }),
    });
    const badRes = await loginApi(badLoginReq);
    assert.strictEqual(badRes.status, 401, 'Invalid credentials must return 401');
    const badJson = await badRes.json();
    assert.strictEqual(badJson.error, 'Credenciales inválidas');

    // 3.2 Valid login credentials
    const goodLoginReq = new NextRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'AdminPrueba1234',
        password: 'AdminPassword1234',
      }),
    });
    const goodRes = await loginApi(goodLoginReq);
    assert.strictEqual(goodRes.status, 200, 'Valid login must return 200');
    const goodJson = await goodRes.json();
    assert.strictEqual(goodJson.success, true);

    const sessionCookie = goodRes.cookies.get(ADMIN_COOKIE_NAME);
    assert.ok(sessionCookie, 'Response must set session cookie');
    assert.strictEqual(sessionCookie.httpOnly, true, 'Cookie must be httpOnly');
    assert.ok(await verifySessionToken(sessionCookie.value), 'Set cookie must be a valid session token');

    // 3.3 Logout route
    const logoutRes = await logoutApi();
    assert.strictEqual(logoutRes.status, 200);
    const logoutJson = await logoutRes.json();
    assert.strictEqual(logoutJson.success, true);
    const clearedCookie = logoutRes.cookies.get(ADMIN_COOKIE_NAME);
    assert.ok(clearedCookie, 'Logout must clear cookie');
    assert.strictEqual(clearedCookie.value, '');

    console.log('✅ Login and Logout API endpoints verified.');
  }

  // =========================================================================
  // 4. Middleware Route Protection
  // =========================================================================
  console.log('\n--- Test 4: Middleware Route Protection ---');
  {
    const validToken = await createSessionToken(ADMIN_USERNAME);

    // 4.1 Unauthenticated request to /admin -> Redirect to /admin/login
    const unauthAdminReq = new NextRequest('http://localhost:3000/admin');
    const unauthAdminRes = await middleware(unauthAdminReq);
    assert.strictEqual(unauthAdminRes.status, 307, 'Should redirect unauthenticated user');
    assert.ok(
      unauthAdminRes.headers.get('location')?.endsWith('/admin/login'),
      'Redirect location should be /admin/login'
    );

    // 4.2 Unauthenticated request to /admin/productos -> Redirect to /admin/login
    const unauthSubReq = new NextRequest('http://localhost:3000/admin/productos');
    const unauthSubRes = await middleware(unauthSubReq);
    assert.strictEqual(unauthSubRes.status, 307);
    assert.ok(unauthSubRes.headers.get('location')?.endsWith('/admin/login'));

    // 4.3 Authenticated request to /admin -> Allow (status 200/NextResponse.next)
    const authAdminReq = new NextRequest('http://localhost:3000/admin', {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${validToken}` },
    });
    const authAdminRes = await middleware(authAdminReq);
    assert.strictEqual(authAdminRes.status, 200, 'Authenticated admin page access should be allowed');

    // 4.4 Unauthenticated request to /admin/login -> Allow access
    const unauthLoginReq = new NextRequest('http://localhost:3000/admin/login');
    const unauthLoginRes = await middleware(unauthLoginReq);
    assert.strictEqual(unauthLoginRes.status, 200, 'Login page should be accessible when not logged in');

    // 4.5 Authenticated request to /admin/login -> Redirect to /admin
    const authLoginReq = new NextRequest('http://localhost:3000/admin/login', {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${validToken}` },
    });
    const authLoginRes = await middleware(authLoginReq);
    assert.strictEqual(authLoginRes.status, 307);
    assert.ok(authLoginRes.headers.get('location')?.endsWith('/admin'));

    // 4.6 Unauthenticated request to /api/admin/products -> 401 JSON
    const unauthApiReq = new NextRequest('http://localhost:3000/api/admin/products');
    const unauthApiRes = await middleware(unauthApiReq);
    assert.strictEqual(unauthApiRes.status, 401, 'Unauthenticated admin API call must return 401');

    // 4.7 Authenticated request to /api/admin/products -> 200/next
    const authApiReq = new NextRequest('http://localhost:3000/api/admin/products', {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${validToken}` },
    });
    const authApiRes = await middleware(authApiReq);
    assert.strictEqual(authApiRes.status, 200, 'Authenticated admin API call should be allowed');

    // 4.8 Auth API endpoints (/api/admin/auth/login) always accessible
    const loginEndpointReq = new NextRequest('http://localhost:3000/api/admin/auth/login');
    const loginEndpointRes = await middleware(loginEndpointReq);
    assert.strictEqual(loginEndpointRes.status, 200, 'Login auth endpoint should bypass middleware check');

    console.log('✅ Middleware authorization & redirect rules verified.');
  }

  // =========================================================================
  // 5. Storefront Links & Hook Rules Verification
  // =========================================================================
  console.log('\n--- Test 5: Storefront Admin Button Removal & Hook Ordering ---');
  {
    const navbarContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Navbar.tsx'),
      'utf-8'
    );
    const footerContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/Footer.tsx'),
      'utf-8'
    );
    const checkoutContent = fs.readFileSync(
      path.join(process.cwd(), 'src/components/CheckoutView.tsx'),
      'utf-8'
    );

    // Verify /admin links removed from storefront components
    assert.ok(!navbarContent.includes('href="/admin"'), 'Navbar must not contain links to /admin');
    assert.ok(!footerContent.includes('href="/admin"'), 'Footer must not contain links to /admin');
    assert.ok(!checkoutContent.includes('href="/admin"'), 'CheckoutView must not contain links to /admin');

    // Verify hook ordering in Navbar.tsx
    const useEffectIdx = navbarContent.indexOf('useEffect(() => {\n    setMobileMenuOpen(false);');
    const returnNullIdx = navbarContent.indexOf("if (pathname?.startsWith('/admin'))");
    assert.ok(useEffectIdx !== -1, 'useEffect for mobileMenuOpen must exist in Navbar');
    assert.ok(returnNullIdx !== -1, 'Early return condition must exist in Navbar');
    assert.ok(
      useEffectIdx < returnNullIdx,
      'useEffect hook must appear BEFORE any conditional return statement'
    );

    console.log('✅ Storefront admin buttons removed and React hook rule order verified.');
  }

  // =========================================================================
  // 6. /api/orders requires the admin session (NL-2a)
  // =========================================================================
  console.log('\n--- Test 6: GET /api/orders requires the admin session ---');
  {
    // 6.1 No cookie -> 401 JSON without any order data
    const anonRes = await getOrdersApi(new Request('http://localhost:3000/api/orders'));
    assert.strictEqual(anonRes.status, 401, 'Unauthenticated GET /api/orders must return 401');
    const anonText = await anonRes.text();
    const anonJson = JSON.parse(anonText);
    assert.strictEqual(anonJson.success, false);
    assert.ok(!('orders' in anonJson), 'The 401 body must not carry orders');
    assert.ok(!/customer_email|customer_name|shipping_address/.test(anonText), 'The 401 body must not leak customer fields');

    // 6.2 Tampered / garbage cookie -> 401
    const badRes = await getOrdersApi(
      new Request('http://localhost:3000/api/orders', {
        headers: { cookie: `${ADMIN_COOKIE_NAME}=garbage.token` },
      })
    );
    assert.strictEqual(badRes.status, 401, 'An invalid session cookie must return 401');

    // 6.3 Valid admin session -> 200 with orders
    const token = await createSessionToken(ADMIN_USERNAME);
    const okRes = await getOrdersApi(
      new Request('http://localhost:3000/api/orders', {
        headers: { cookie: `other=1; ${ADMIN_COOKIE_NAME}=${token}` },
      })
    );
    assert.strictEqual(okRes.status, 200, 'Authenticated GET /api/orders must return 200');
    const okJson = await okRes.json();
    assert.strictEqual(okJson.success, true);
    assert.ok(Array.isArray(okJson.orders), 'Authenticated response must carry the orders array');

    // 6.4 Only GET and POST are exposed by the route (no unguarded mutation verbs)
    const routeModule = await import('../src/app/api/orders/route');
    const verbs = Object.keys(routeModule).filter((k) => /^(GET|POST|PUT|PATCH|DELETE)$/.test(k)).sort();
    assert.deepStrictEqual(verbs, ['GET', 'POST'], 'Orders route must expose only GET (guarded) and POST (checkout)');

    console.log('✅ GET /api/orders returns 401 without a session and 200 with one.');
  }

  // =========================================================================
  // 7. Session secret: no committed default, fail closed in production (NL-2b)
  // =========================================================================
  console.log('\n--- Test 7: Session secret handling ---');
  {
    // 7.1 The source no longer carries a hardcoded default secret
    const authSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');
    assert.ok(!authSource.includes('nova_workstations_secret'), 'auth.ts must not embed a default secret');

    // 7.2 .env.example documents the variable by name only (no value)
    const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');
    assert.ok(/^ADMIN_SESSION_SECRET=\s*$/m.test(envExample), '.env.example must list ADMIN_SESSION_SECRET with an empty value');

    const devToken = await withEnv({ NODE_ENV: 'development', VERCEL: undefined, ADMIN_SESSION_SECRET: undefined }, () =>
      createSessionToken(ADMIN_USERNAME)
    );

    // 7.3 Development / test without the variable: generated dev-only fallback works
    for (const nodeEnv of ['development', 'test']) {
      await withEnv({ NODE_ENV: nodeEnv, VERCEL: undefined, ADMIN_SESSION_SECRET: undefined }, async () => {
        const t = await createSessionToken(ADMIN_USERNAME);
        assert.strictEqual(await verifySessionToken(t), true, `Dev fallback must round-trip in ${nodeEnv}`);
        assert.strictEqual(await verifySessionToken(devToken), true, 'Dev fallback must be stable within the process');
      });
    }

    // 7.4 Production without the variable: fail closed, with a secret-free server log
    const prodEnv = { NODE_ENV: 'production', VERCEL: undefined, ADMIN_SESSION_SECRET: undefined };
    const { result: prodOutcome, logs: prodLogs } = await captureErrors(() =>
      withEnv(prodEnv, async () => {
        let createError: unknown = null;
        try {
          await createSessionToken(ADMIN_USERNAME);
        } catch (e) {
          createError = e;
        }
        const verified = await verifySessionToken(devToken);
        const mw = await middleware(
          new NextRequest('http://localhost:3000/admin', { headers: { cookie: `${ADMIN_COOKIE_NAME}=${devToken}` } })
        );
        const login = await loginApi(
          new NextRequest('http://localhost:3000/api/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
          })
        );
        const orders = await getOrdersApi(
          new Request('http://localhost:3000/api/orders', { headers: { cookie: `${ADMIN_COOKIE_NAME}=${devToken}` } })
        );
        return { createError, verified, mwStatus: mw.status, loginStatus: login.status, loginCookie: login.cookies.get(ADMIN_COOKIE_NAME), ordersStatus: orders.status };
      })
    );
    assert.ok(prodOutcome.createError, 'Production without a secret must refuse to create sessions');
    assert.strictEqual(prodOutcome.verified, false, 'Production without a secret must refuse to validate sessions');
    assert.strictEqual(prodOutcome.mwStatus, 307, 'Middleware must treat the request as unauthenticated');
    assert.ok(prodOutcome.loginStatus >= 500, 'Login must fail with a server error, not issue a session');
    assert.ok(!prodOutcome.loginCookie || !prodOutcome.loginCookie.value, 'Login must not set a session cookie');
    assert.strictEqual(prodOutcome.ordersStatus, 401, 'GET /api/orders must stay closed');
    assert.ok(prodLogs.includes('ADMIN_SESSION_SECRET'), 'A server-side error log must name the missing variable');

    // 7.5 VERCEL alone (even if NODE_ENV is not production) also fails closed
    const vercelOutcome = await captureErrors(() =>
      withEnv({ NODE_ENV: 'development', VERCEL: '1', ADMIN_SESSION_SECRET: undefined }, () => verifySessionToken(devToken))
    );
    assert.strictEqual(vercelOutcome.result, false, 'VERCEL without a secret must fail closed');

    // 7.6 Production with the variable works, and a different secret invalidates tokens (no secret in logs)
    const secretA = 'unit-test-secret-A-0123456789abcdef';
    const secretB = 'unit-test-secret-B-0123456789abcdef';
    const { result: prodOk, logs: okLogs } = await captureErrors(() =>
      withEnv({ NODE_ENV: 'production', VERCEL: undefined, ADMIN_SESSION_SECRET: secretA }, async () => {
        const t = await createSessionToken(ADMIN_USERNAME);
        const sameSecret = await verifySessionToken(t);
        const otherSecret = await withEnv({ ADMIN_SESSION_SECRET: secretB }, () => verifySessionToken(t));
        return { sameSecret, otherSecret };
      })
    );
    assert.strictEqual(prodOk.sameSecret, true, 'Production with the variable must validate its own tokens');
    assert.strictEqual(prodOk.otherSecret, false, 'A token signed with another secret must be rejected');
    for (const leaked of [secretA, secretB]) {
      assert.ok(!prodLogs.includes(leaked) && !okLogs.includes(leaked), 'Logs must never contain a secret value');
    }

    console.log('✅ No committed secret; production fails closed; dev fallback works.');
  }

  console.log('\n🎉 ALL AUTH & ADMIN PROTECTION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Auth test failed:', err);
  process.exit(1);
});
