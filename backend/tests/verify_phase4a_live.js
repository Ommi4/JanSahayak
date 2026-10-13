/**
 * JanSahayak - Phase 4A Live Authentication Verification Script
 * Validates all authentication flows end-to-end against live backend and frontend contracts:
 * - Test A: User Registration (validates registration response, JWT generation, user object)
 * - Test B: User Login (validates credentials, JWT generation, profile return)
 * - Test C: Protected Route Access & Unauthenticated Rejection (verifies 401 on missing/invalid token)
 * - Test D: Login Failure (verifies 401 on invalid password with clean error message)
 * - Test E: Logout Simulation & Protected State Re-verification
 * - Test F: Token Persistence / Session Refresh (verifies /api/auth/me with stored token)
 * - Test G: Duplicate Registration Error (verifies 400 on duplicate email)
 * - Test H: Validation Errors (verifies 400 on short password, invalid email format)
 */

const http = require('http');

const API_BASE = 'http://localhost:5000/api';

const makeRequest = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runLiveVerification() {
  console.log('====================================================');
  console.log('JanSahayak - Phase 4A Live Authentication Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  };

  const testEmail = `citizen_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let authToken = null;
  let authUser = null;

  try {
    // 0. Health check
    console.log('--- Step 0: Health Check ---');
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.body.success === true, 'GET /api/health responds 200 OK');

    // Test A: Registration
    console.log('\n--- Test A: Registration ---');
    const regRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Ramesh Sharma',
      email: testEmail,
      password: testPassword,
      preferredLanguage: 'Telugu',
    });

    assert(
      regRes.status === 201 && regRes.body.success === true,
      'POST /api/auth/register responds 201 Created',
      JSON.stringify(regRes.body)
    );
    assert(
      !!regRes.body.data.token,
      'Registration response returns valid JWT token'
    );
    assert(
      regRes.body.data.user.email === testEmail.toLowerCase(),
      'Registration response returns user object with matching normalized email'
    );
    assert(
      regRes.body.data.user.password === undefined,
      'Registration response strips password from user object'
    );
    assert(
      regRes.body.data.user.preferredLanguage === 'Telugu',
      'Registration response preserves preferred language'
    );

    authToken = regRes.body.data.token;
    authUser = regRes.body.data.user;

    // Test B: Login
    console.log('\n--- Test B: Login ---');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });

    assert(
      loginRes.status === 200 && loginRes.body.success === true,
      'POST /api/auth/login responds 200 OK with correct credentials',
      JSON.stringify(loginRes.body)
    );
    assert(
      !!loginRes.body.data.token,
      'Login response returns JWT token'
    );
    assert(
      loginRes.body.data.user.name === 'Ramesh Sharma',
      'Login response returns correct citizen name'
    );

    // Test C: Protected route verification
    console.log('\n--- Test C: Protected Route Access & Unauthenticated Rejection ---');
    // C1: Authenticated access
    const authMeRes = await makeRequest('GET', '/api/auth/me', null, authToken);
    assert(
      authMeRes.status === 200 && authMeRes.body.success === true,
      'GET /api/auth/me responds 200 OK when authenticated with Bearer token'
    );
    assert(
      authMeRes.body.data.user.email === testEmail.toLowerCase(),
      'GET /api/auth/me returns authenticated user profile'
    );

    // C2: Unauthenticated access (missing token)
    const unauthRes = await makeRequest('GET', '/api/auth/me');
    assert(
      unauthRes.status === 401 && unauthRes.body.success === false,
      'GET /api/auth/me responds 401 Unauthorized without token (triggers redirect to /login in frontend)'
    );

    // C3: Invalid token access
    const invalidTokenRes = await makeRequest('GET', '/api/auth/me', null, 'invalid.jwt.token');
    assert(
      invalidTokenRes.status === 401 && invalidTokenRes.body.success === false,
      'GET /api/auth/me responds 401 Unauthorized with malformed token'
    );

    // Test D: Login Failure
    console.log('\n--- Test D: Login Failure Handling ---');
    const failLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword999',
    });

    assert(
      failLoginRes.status === 401 && failLoginRes.body.success === false,
      'POST /api/auth/login responds 401 Unauthorized on invalid password'
    );
    assert(
      failLoginRes.body.message === 'Invalid email or password',
      'Login failure returns user-friendly error message'
    );

    // Test E: Logout Simulation
    console.log('\n--- Test E: Logout Simulation & Dashboard Guard ---');
    // In frontend, logout purges localStorage. Simulate subsequent request without token:
    const postLogoutMe = await makeRequest('GET', '/api/auth/me', null, null);
    assert(
      postLogoutMe.status === 401,
      'After token removal (logout), protected route access returns 401 (dashboard guarded)'
    );

    // Test F: Token Persistence / Session Refresh
    console.log('\n--- Test F: Token Persistence / Refresh ---');
    const refreshMeRes = await makeRequest('GET', '/api/auth/me', null, authToken);
    assert(
      refreshMeRes.status === 200 && refreshMeRes.body.data.user.email === testEmail.toLowerCase(),
      'Persistent token validates successfully on page reload and recovers user profile'
    );

    // Test G: Duplicate Registration Error
    console.log('\n--- Test G: Duplicate Registration Error ---');
    const dupRegRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Duplicate Ramesh',
      email: testEmail,
      password: 'Password123!',
    });
    assert(
      dupRegRes.status === 400 && dupRegRes.body.success === false,
      'POST /api/auth/register responds 400 on duplicate email'
    );
    assert(
      dupRegRes.body.message === 'An account with this email already exists',
      'Duplicate registration returns user-friendly message'
    );

    // Test H: Validation Errors
    console.log('\n--- Test H: Validation Errors ---');
    const shortPassRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Short Pass',
      email: `short_${Date.now()}@example.com`,
      password: '123',
    });
    assert(
      shortPassRes.status === 400,
      'POST /api/auth/register responds 400 for password shorter than 6 chars'
    );

    const invalidEmailRes = await makeRequest('POST', '/api/auth/register', {
      name: 'Invalid Email',
      email: 'not-an-email',
      password: 'Password123!',
    });
    assert(
      invalidEmailRes.status === 400,
      'POST /api/auth/register responds 400 for invalid email format'
    );

  } catch (err) {
    console.error('Fatal error during verification:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`Live Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveVerification();
