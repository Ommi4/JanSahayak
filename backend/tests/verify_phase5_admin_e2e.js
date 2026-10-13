/**
 * JanSahayak - Phase 5 Admin Panel & Scheme Management Live E2E Verification Script
 * Validates the full administrator journey and security guards against the live backend server:
 * 1. Health check
 * 2. Create/Login Admin User & Obtain JWT
 * 3. Admin Dashboard Metrics (Schemes, Users, Conversations)
 * 4. Safe User Registry (No Passwords / Secrets Exposed)
 * 5. Scheme Management: List all schemes (including active/inactive)
 * 6. Scheme Management: Create new scheme with deterministic rules
 * 7. Scheme Management: Retrieve scheme by ID
 * 8. Deterministic Eligibility Engine Verification on Admin-created Scheme
 * 9. Scheme Management: Update scheme metadata and rules
 * 10. Scheme Status Management: Deactivate scheme
 * 11. Public Isolation Verification: Deactivated scheme hidden from citizen GET /api/schemes
 * 12. Scheme Status Management: Reactivate scheme
 * 13. Public Re-appearance Verification: Reactivated scheme visible to citizens
 * 14. Citizen Creation & Authentication
 * 15. Security Authorization Guard: Citizen blocked from GET /api/admin/dashboard (403)
 * 16. Security Authorization Guard: Citizen blocked from GET /api/admin/users (403)
 * 17. Security Authorization Guard: Citizen blocked from POST /api/admin/schemes (403)
 * 18. Security Authentication Guard: Unauthenticated requests blocked (401)
 * 19. Public Citizen Scheme Discovery Regression
 * 20. Public Citizen Chat/Conversation Regression
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

async function runAdminE2E() {
  console.log('================================================================');
  console.log('JanSahayak - Phase 5 Admin Panel & Scheme Management Live E2E');
  console.log('================================================================\n');

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

  const adminEmail = `admin_live_${Date.now()}@example.com`;
  const citizenEmail = `citizen_live_${Date.now()}@example.com`;
  const password = 'AdminPassword123!';

  let adminToken = null;
  let citizenToken = null;
  let createdSchemeId = null;

  try {
    // 1. Health check
    console.log('--- Step 1: Health Check ---');
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.body.success === true, 'GET /api/health responds 200 OK');

    // 2. Admin & Citizen Setup
    console.log('\n--- Step 2: User Creation & Authentication ---');
    // Register citizen
    const citizenReg = await makeRequest('POST', '/api/auth/register', {
      name: 'Test Citizen',
      email: citizenEmail,
      password: password,
      preferredLanguage: 'English',
    });
    assert(citizenReg.status === 201, 'Citizen user registered successfully');
    citizenToken = citizenReg.body.data.token;

    // Register user that we will promote to admin or register admin directly
    // Let's create an admin via DB or register and test
    const adminReg = await makeRequest('POST', '/api/auth/register', {
      name: 'System Admin Live',
      email: adminEmail,
      password: password,
      preferredLanguage: 'English',
    });
    assert(adminReg.status === 201, 'Admin user account created');
    
    // For live testing, promote adminEmail in DB
    const mongoose = require('mongoose');
    const User = require('../models/User');
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jansahayak';
    await mongoose.connect(dbUri);
    await User.updateOne({ email: adminEmail.toLowerCase() }, { $set: { role: 'admin' } });
    await mongoose.disconnect();

    // Re-login as admin to get fresh user context
    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      email: adminEmail,
      password: password,
    });
    assert(adminLogin.status === 200 && adminLogin.body.data.user.role === 'admin', 'Admin login succeeds and confirms role="admin"');
    adminToken = adminLogin.body.data.token;

    // 3. Admin Dashboard Metrics
    console.log('\n--- Step 3: Admin Dashboard Telemetry ---');
    const dashRes = await makeRequest('GET', '/api/admin/dashboard', null, adminToken);
    assert(dashRes.status === 200 && dashRes.body.success === true, 'GET /api/admin/dashboard returns 200 OK');
    assert(typeof dashRes.body.data.totalSchemes === 'number', 'Dashboard returns totalSchemes metric');
    assert(typeof dashRes.body.data.activeSchemes === 'number', 'Dashboard returns activeSchemes metric');
    assert(typeof dashRes.body.data.inactiveSchemes === 'number', 'Dashboard returns inactiveSchemes metric');
    assert(typeof dashRes.body.data.totalUsers === 'number', 'Dashboard returns totalUsers metric');
    assert(typeof dashRes.body.data.totalConversations === 'number', 'Dashboard returns totalConversations metric');

    // 4. Safe User Registry
    console.log('\n--- Step 4: Citizen & User Registry Overview ---');
    const usersRes = await makeRequest('GET', '/api/admin/users', null, adminToken);
    assert(usersRes.status === 200 && usersRes.body.data.length >= 2, 'GET /api/admin/users returns user list');
    const passwordsLeaked = usersRes.body.data.some(u => u.password !== undefined || u.__v !== undefined);
    assert(!passwordsLeaked, 'Security: Password hashes and internals are never exposed in user overview');

    // 5. Scheme Management: List all schemes
    console.log('\n--- Step 5: Scheme Management (Listing) ---');
    const schemesRes = await makeRequest('GET', '/api/admin/schemes', null, adminToken);
    assert(schemesRes.status === 200 && Array.isArray(schemesRes.body.data), 'GET /api/admin/schemes returns schemes array');
    const initialSchemeCount = schemesRes.body.data.length;

    // 6. Scheme Management: Create new scheme
    console.log('\n--- Step 6: Create New Government Scheme ---');
    const newSchemePayload = {
      schemeName: `PM Solar Rooftop Assistance ${Date.now()}`,
      department: 'Ministry of New and Renewable Energy',
      category: 'Housing',
      beneficiary: 'Residential Households',
      state: 'All',
      description: 'Subsidy scheme to install grid-connected solar rooftop panels on residential homes.',
      benefits: [
        'Up to ₹78,000 direct subsidy for 3kW solar systems',
        'Free electricity generation up to 300 units monthly',
      ],
      eligibilityText: 'Indian residential property owners with maximum annual household income of ₹8,00,000.',
      rules: {
        minAge: 18,
        maxAnnualIncome: 800000,
      },
      documents: [
        'Aadhaar Card',
        'Electricity Connection Bill',
        'Proof of Roof Ownership',
      ],
      applicationProcess: [
        'Register on the National Portal for Rooftop Solar.',
        'Submit online application with electricity bill and roof photo.',
        'Choose authorized vendor for installation.',
      ],
      officialWebsite: 'https://pmsuryaghar.gov.in',
      source: 'Ministry of New and Renewable Energy Guidelines 2026',
      isActive: true,
    };

    const createRes = await makeRequest('POST', '/api/admin/schemes', newSchemePayload, adminToken);
    assert(createRes.status === 201 && createRes.body.success === true, 'POST /api/admin/schemes creates scheme with 201 Created');
    createdSchemeId = createRes.body.data._id;
    assert(createRes.body.data.rules.maxAnnualIncome === 800000, 'Deterministic income rule persisted correctly');

    // 7. Retrieve Scheme by ID
    console.log('\n--- Step 7: Retrieve Scheme by ID ---');
    const getByIdRes = await makeRequest('GET', `/api/admin/schemes/${createdSchemeId}`, null, adminToken);
    assert(getByIdRes.status === 200 && getByIdRes.body.data.schemeName === newSchemePayload.schemeName, 'GET /api/admin/schemes/:id returns complete scheme record');

    // 8. Deterministic Eligibility Evaluation on New Scheme
    console.log('\n--- Step 8: Deterministic Eligibility Engine Verification ---');
    const eligibleProfile = {
      age: 35,
      annualIncome: 500000,
      state: 'Andhra Pradesh',
    };
    const evalEligible = await makeRequest('POST', `/api/schemes/${createdSchemeId}/eligibility`, eligibleProfile);
    assert(evalEligible.status === 200 && evalEligible.body.data.status === 'eligible', 'Deterministic engine evaluates qualifying citizen as "eligible"');

    const ineligibleProfile = {
      age: 35,
      annualIncome: 1200000, // exceeds 8,00,000
    };
    const evalIneligible = await makeRequest('POST', `/api/schemes/${createdSchemeId}/eligibility`, ineligibleProfile);
    assert(evalIneligible.status === 200 && evalIneligible.body.data.status === 'ineligible', 'Deterministic engine evaluates high-income citizen as "ineligible"');
    assert(evalIneligible.body.data.reasons.length > 0, 'Ineligible evaluation provides exact failure reason');

    // 9. Update Scheme
    console.log('\n--- Step 9: Update Scheme Metadata & Rules ---');
    const updateRes = await makeRequest('PUT', `/api/admin/schemes/${createdSchemeId}`, {
      department: 'Ministry of New and Renewable Energy (Updated)',
      rules: {
        minAge: 21,
        maxAnnualIncome: 900000,
      },
    }, adminToken);
    assert(updateRes.status === 200 && updateRes.body.data.rules.minAge === 21, 'PUT /api/admin/schemes/:id updates rule criteria successfully');

    // 10. Deactivate Scheme
    console.log('\n--- Step 10: Deactivate Scheme ---');
    const deactRes = await makeRequest('PATCH', `/api/admin/schemes/${createdSchemeId}/status`, { isActive: false }, adminToken);
    assert(deactRes.status === 200 && deactRes.body.data.isActive === false, 'PATCH /api/admin/schemes/:id/status deactivates scheme');

    // 11. Public Isolation Check: Inactive scheme must NOT appear in citizen search
    console.log('\n--- Step 11: Public Citizen Isolation Check ---');
    const publicSchemesAfterDeact = await makeRequest('GET', '/api/schemes');
    const foundInPublicDeact = publicSchemesAfterDeact.body.data.some(s => s._id === createdSchemeId);
    assert(!foundInPublicDeact, 'Deactivated scheme is safely excluded from citizen public discovery');

    // 12. Reactivate Scheme
    console.log('\n--- Step 12: Reactivate Scheme ---');
    const reactRes = await makeRequest('PATCH', `/api/admin/schemes/${createdSchemeId}/status`, { isActive: true }, adminToken);
    assert(reactRes.status === 200 && reactRes.body.data.isActive === true, 'PATCH /api/admin/schemes/:id/status reactivates scheme');

    // 13. Public Re-appearance Check
    console.log('\n--- Step 13: Public Citizen Visibility Check ---');
    const publicSchemesAfterReact = await makeRequest('GET', '/api/schemes');
    const foundInPublicReact = publicSchemesAfterReact.body.data.some(s => s._id === createdSchemeId);
    assert(foundInPublicReact, 'Reactivated scheme is immediately discoverable by citizens');

    // 14. Security Guards: Citizen authorization
    console.log('\n--- Step 14: Security Authorization Guards (Citizen Rejection) ---');
    const citizenDash = await makeRequest('GET', '/api/admin/dashboard', null, citizenToken);
    assert(citizenDash.status === 403, 'Citizen blocked from GET /api/admin/dashboard with 403 Forbidden');

    const citizenUsers = await makeRequest('GET', '/api/admin/users', null, citizenToken);
    assert(citizenUsers.status === 403, 'Citizen blocked from GET /api/admin/users with 403 Forbidden');

    const citizenCreate = await makeRequest('POST', '/api/admin/schemes', { schemeName: 'Hack Scheme' }, citizenToken);
    assert(citizenCreate.status === 403, 'Citizen blocked from POST /api/admin/schemes with 403 Forbidden');

    // 15. Security Guards: Unauthenticated rejection
    console.log('\n--- Step 15: Security Authentication Guards (Unauthenticated Rejection) ---');
    const unauthDash = await makeRequest('GET', '/api/admin/dashboard');
    assert(unauthDash.status === 401, 'Unauthenticated request blocked with 401 Unauthorized');

    // 16. Regression: Citizen Discovery & Chat
    console.log('\n--- Step 16: Citizen Features Regression Check ---');
    const citizenSchemes = await makeRequest('GET', '/api/schemes');
    assert(citizenSchemes.status === 200 && citizenSchemes.body.data.length >= 10, 'Citizen scheme discovery returns verified schemes');

    const convRes = await makeRequest('POST', '/api/conversations', { language: 'en', title: 'Admin Phase Check' }, citizenToken);
    assert(convRes.status === 201, 'Citizen conversation creation succeeds with 201');

    const msgRes = await makeRequest('POST', `/api/conversations/${convRes.body.data._id}/messages`, {
      message: 'What schemes are available for farmers?',
    }, citizenToken);
    assert(msgRes.status === 200 && msgRes.body.data.assistantMessage.content.length > 20, 'Citizen conversation messaging succeeds with 200 and AI fallback response');

  } catch (err) {
    console.error('Fatal error during Admin E2E verification:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`Phase 5 Admin E2E Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdminE2E();
