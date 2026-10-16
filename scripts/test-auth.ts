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

  console.log('\n🎉 ALL AUTH & ADMIN PROTECTION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Auth test failed:', err);
  process.exit(1);
});
