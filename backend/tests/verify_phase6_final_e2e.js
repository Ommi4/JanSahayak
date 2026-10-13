/**
 * JanSahayak - Phase 6 Final Integration & Live End-to-End Verification Suite
 * Comprehensive 38-point full-system verification covering:
 *
 * SECTION 1: SYSTEM HEALTH & INFRASTRUCTURE (1 point)
 *  1. Backend health check (GET /api/health)
 *
 * SECTION 2: CITIZEN AUTHENTICATION & SECURITY (6 points)
 *  2. Citizen registration (POST /api/auth/register)
 *  3. Duplicate citizen registration rejection (400)
 *  4. Citizen login & JWT generation (POST /api/auth/login)
 *  5. Citizen profile fetch via JWT (GET /api/auth/me)
 *  6. Invalid credentials rejection (401)
 *  7. Secondary citizen registration for data isolation (User B)
 *
 * SECTION 3: CITIZEN SCHEME DISCOVERY & METADATA (7 points)
 *  8. Citizen dashboard empty conversation list check
 *  9. Scheme discovery: full verified dataset retrieval (>= 10 schemes)
 * 10. Scheme search: keyword search (e.g. "kisan")
 * 11. Scheme filter: category filter (e.g. "Agriculture")
 * 12. Scheme filter: state filter (e.g. "All")
 * 13. Scheme details: retrieve complete scheme metadata by ID
 * 14. Scheme details integrity: officialWebsite, benefits, documents, applicationProcess
 *
 * SECTION 4: DETERMINISTIC ELIGIBILITY ENGINE (3 points)
 * 15. Deterministic eligibility: qualifying citizen profile (status: "eligible")
 * 16. Deterministic eligibility: non-qualifying citizen profile (status: "ineligible" with reasons)
 * 17. Deterministic eligibility: incomplete citizen profile handling (missing fields)
 *
 * SECTION 5: MULTILINGUAL AI CONVERSATION (7 points)
 * 18. Multilingual Chat English: conversation creation (language: 'en')
 * 19. Multilingual Chat English: messaging & AI fallback response
 * 20. Multilingual Chat English: structured response schema & language fidelity
 * 21. Multilingual Chat Hindi: conversation creation (language: 'hi')
 * 22. Multilingual Chat Hindi: messaging & authentic Devanagari Hindi response
 * 23. Multilingual Chat Telugu: conversation creation (language: 'te')
 * 24. Multilingual Chat Telugu: messaging & authentic Telugu script response
 *
 * SECTION 6: CONVERSATION HISTORY & CROSS-USER ISOLATION (5 points)
 * 25. Conversation list retrieval for User A (exact thread count)
 * 26. Conversation thread retrieval with complete message history
 * 27. Cross-user isolation: User B blocked from reading User A's conversation (403)
 * 28. Cross-user isolation: User B blocked from messaging User A's conversation (403)
 * 29. Cross-user isolation: User B conversation list strictly isolated
 *
 * SECTION 7: ADMIN ROLE, TELEMETRY & MANAGEMENT (6 points)
 * 30. Admin registration and database role elevation
 * 31. Admin authentication & JWT token generation
 * 32. Admin dashboard telemetry (schemes, users, conversations metrics)
 * 33. Admin user management registry (passwords sanitized)
 * 34. Admin scheme management: create new government scheme
 * 35. Deterministic eligibility engine verification on admin-created scheme
 *
 * SECTION 8: SCHEME LIFECYCLE & SECURITY AUTHORIZATION GUARDS (3 points)
 * 36. Admin scheme management: update scheme criteria & metadata
 * 37. Admin scheme lifecycle: deactivate scheme, verify exclusion from citizen discovery, reactivate, verify citizen re-discovery
 * 38. Comprehensive Security Guards: citizen blocked from admin APIs (403), unauthenticated requests blocked (401)
 */

const http = require('http');
const mongoose = require('mongoose');

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

async function runPhase6FinalVerification() {
  console.log('========================================================================');
  console.log('JanSahayak - Phase 6 Final Integration & Demo E2E Verification Suite');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testIndex, testName, details = '') => {
    if (condition) {
      console.log(`[PASS] (${testIndex}/38) ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] (${testIndex}/38) ${testName}: ${details}`);
      failed++;
    }
  };

  const timestamp = Date.now();
  const citizenAEmail = `citizen_a_p6_${timestamp}@example.com`;
  const citizenBEmail = `citizen_b_p6_${timestamp}@example.com`;
  const adminEmail = `admin_p6_${timestamp}@example.com`;
  const password = 'SecurePassword123!';

  let tokenA = null;
  let tokenB = null;
  let tokenAdmin = null;

  let userAId = null;
  let userBId = null;

  let pmKisanScheme = null;
  let convEnId = null;
  let convHiId = null;
  let convTeId = null;

  let createdAdminSchemeId = null;

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: SYSTEM HEALTH & INFRASTRUCTURE
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: System Health & Infrastructure ---');
    const health = await makeRequest('GET', '/api/health');
    assert(
      health.status === 200 && health.body.success === true && health.body.message === 'JanSahayak API is running',
      1,
      'Backend Health Check (GET /api/health responds 200 OK)'
    );

    // -------------------------------------------------------------------------
    // SECTION 2: CITIZEN AUTHENTICATION & SECURITY
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Citizen Authentication & Security ---');
    const regA = await makeRequest('POST', '/api/auth/register', {
      name: 'Ramesh Patel',
      email: citizenAEmail,
      password: password,
      preferredLanguage: 'English',
    });
    assert(
      regA.status === 201 && regA.body.success === true && !!regA.body.data.token,
      2,
      'Citizen Registration (POST /api/auth/register creates user and returns JWT)'
    );
    tokenA = regA.body.data.token;
    userAId = regA.body.data.user._id;

    // 3. Duplicate citizen registration rejection
    const regDup = await makeRequest('POST', '/api/auth/register', {
      name: 'Duplicate Ramesh',
      email: citizenAEmail,
      password: password,
    });
    assert(
      regDup.status === 400 && regDup.body.success === false,
      3,
      'Duplicate Registration Guard (POST /api/auth/register rejects duplicate email with 400)'
    );

    // 4. Citizen login
    const loginA = await makeRequest('POST', '/api/auth/login', {
      email: citizenAEmail,
      password: password,
    });
    assert(
      loginA.status === 200 && loginA.body.success === true && !!loginA.body.data.token,
      4,
      'Citizen Login (POST /api/auth/login succeeds with 200 and issues valid JWT)'
    );

    const meA = await makeRequest('GET', '/api/auth/me', null, tokenA);
    assert(
      meA.status === 200 && meA.body?.data?.user?.email === citizenAEmail.toLowerCase() && meA.body?.data?.user?.role === 'user',
      5,
      'Citizen Profile Fetch (GET /api/auth/me returns hydrated citizen profile)',
      `status: ${meA.status}, body: ${JSON.stringify(meA.body)}`
    );

    // 6. Invalid credentials rejection
    const invalidLogin = await makeRequest('POST', '/api/auth/login', {
      email: citizenAEmail,
      password: 'WrongPassword999!',
    });
    assert(
      invalidLogin.status === 401 && invalidLogin.body.success === false,
      6,
      'Invalid Credentials Guard (POST /api/auth/login rejects incorrect password with 401)'
    );

    // 7. Secondary citizen registration for data isolation
    const regB = await makeRequest('POST', '/api/auth/register', {
      name: 'Priya Sharma',
      email: citizenBEmail,
      password: password,
      preferredLanguage: 'Hindi',
    });
    assert(
      regB.status === 201 && !!regB.body.data.token,
      7,
      'Secondary Citizen Registration (User B created for data isolation tests)'
    );
    tokenB = regB.body.data.token;
    userBId = regB.body.data.user._id;

    // -------------------------------------------------------------------------
    // SECTION 3: CITIZEN SCHEME DISCOVERY & METADATA
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Citizen Scheme Discovery & Metadata ---');
    const initConvs = await makeRequest('GET', '/api/conversations', null, tokenA);
    assert(
      initConvs.status === 200 && Array.isArray(initConvs.body.data) && initConvs.body.data.length === 0,
      8,
      'Citizen Dashboard Initial State (GET /api/conversations returns empty array initially)'
    );

    const allSchemes = await makeRequest('GET', '/api/schemes');
    assert(
      allSchemes.status === 200 && Array.isArray(allSchemes.body.data) && allSchemes.body.data.length >= 10,
      9,
      'Scheme Discovery (GET /api/schemes returns at least 10 verified government schemes)'
    );

    const searchRes = await makeRequest('GET', '/api/schemes?search=kisan');
    assert(
      searchRes.status === 200 && searchRes.body.data.length > 0 && searchRes.body.data.some(s => s.schemeName.toLowerCase().includes('kisan')),
      10,
      'Scheme Keyword Search (GET /api/schemes?search=kisan filters accurately)'
    );
    pmKisanScheme = allSchemes.body.data.find(s => s.schemeName.toLowerCase().includes('kisan'));

    const categoryRes = await makeRequest('GET', '/api/schemes?category=Agriculture');
    assert(
      categoryRes.status === 200 && categoryRes.body.data.length > 0 && categoryRes.body.data.every(s => s.category.toLowerCase() === 'agriculture'),
      11,
      'Scheme Category Filter (GET /api/schemes?category=Agriculture filters accurately)'
    );

    const stateRes = await makeRequest('GET', '/api/schemes?state=All');
    assert(
      stateRes.status === 200 && stateRes.body.data.length > 0,
      12,
      'Scheme State Filter (GET /api/schemes?state=All retrieves pan-India schemes)'
    );

    const detailRes = await makeRequest('GET', `/api/schemes/${pmKisanScheme._id}`);
    assert(
      detailRes.status === 200 && detailRes.body.data.schemeName === pmKisanScheme.schemeName,
      13,
      'Scheme Details Retrieval (GET /api/schemes/:id returns complete scheme record)'
    );

    const d = detailRes.body.data;
    const isDetailValid =
      typeof d.officialWebsite === 'string' &&
      d.officialWebsite.startsWith('http') &&
      Array.isArray(d.benefits) && d.benefits.length > 0 &&
      Array.isArray(d.documents) && d.documents.length > 0 &&
      Array.isArray(d.applicationProcess) && d.applicationProcess.length > 0;
    assert(
      isDetailValid,
      14,
      'Scheme Details Integrity (Official URL, benefits, documents, and application process present)'
    );

    // -------------------------------------------------------------------------
    // SECTION 4: DETERMINISTIC ELIGIBILITY ENGINE
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Deterministic Eligibility Engine ---');
    const eligibleProfile = {
      age: 42,
      occupation: 'Farmer',
      farmer: true,
      annualIncome: 120000,
      state: 'Andhra Pradesh',
      category: 'OBC',
    };
    const evalEligible = await makeRequest('POST', `/api/schemes/${pmKisanScheme._id}/eligibility`, eligibleProfile);
    assert(
      evalEligible.status === 200 && evalEligible.body.data.status === 'eligible',
      15,
      'Deterministic Eligibility Check: Eligible Profile (Evaluated as "eligible")'
    );

    const ineligibleProfile = {
      age: 30,
      occupation: 'Software Engineer',
      farmer: false,
      annualIncome: 1800000,
      state: 'Maharashtra',
    };
    const evalIneligible = await makeRequest('POST', `/api/schemes/${pmKisanScheme._id}/eligibility`, ineligibleProfile);
    assert(
      evalIneligible.status === 200 && evalIneligible.body.data.status === 'ineligible' && Array.isArray(evalIneligible.body.data.reasons) && evalIneligible.body.data.reasons.length > 0,
      16,
      'Deterministic Eligibility Check: Ineligible Profile (Evaluated as "ineligible" with deterministic reasons)'
    );

    const emptyProfile = {};
    const evalMissing = await makeRequest('POST', `/api/schemes/${pmKisanScheme._id}/eligibility`, emptyProfile);
    assert(
      evalMissing.status === 200 && (evalMissing.body.data.status === 'missing_information' || evalMissing.body.data.status === 'ineligible'),
      17,
      'Deterministic Eligibility Check: Missing Info Profile (Handled cleanly without server error)'
    );

    // -------------------------------------------------------------------------
    // SECTION 5: MULTILINGUAL AI CONVERSATION (FALLBACK PROVIDER)
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Multilingual AI Conversation Layer ---');
    const convEn = await makeRequest('POST', '/api/conversations', { language: 'en', title: 'Farmer Schemes English' }, tokenA);
    assert(
      convEn.status === 201 && convEn.body.data.language === 'en',
      18,
      'Multilingual Chat English: Conversation Creation (language: "en")'
    );
    convEnId = convEn.body.data._id;

    const msgEn = await makeRequest('POST', `/api/conversations/${convEnId}/messages`, {
      message: 'What government financial assistance is available for farmers in India?',
    }, tokenA);
    assert(
      msgEn.status === 200 && msgEn.body.success === true && msgEn.body.data.assistantMessage.content.length > 20,
      19,
      'Multilingual Chat English: Messaging & AI Fallback Response received'
    );

    assert(
      msgEn.body.data.structured && msgEn.body.data.structured.language === 'en' && Array.isArray(msgEn.body.data.structured.schemes),
      20,
      'Multilingual Chat English: Structured Schema Fidelity (language: "en", schemes array present)'
    );

    // Hindi conversation
    const convHi = await makeRequest('POST', '/api/conversations', { language: 'hi', title: 'किसान योजनाएं' }, tokenA);
    assert(
      convHi.status === 201 && convHi.body.data.language === 'hi',
      21,
      'Multilingual Chat Hindi: Conversation Creation (language: "hi")'
    );
    convHiId = convHi.body.data._id;

    const msgHi = await makeRequest('POST', `/api/conversations/${convHiId}/messages`, {
      message: 'नमस्ते, किसानों के लिए कौन सी सरकारी योजनाएं उपलब्ध हैं?',
    }, tokenA);
    const hasDevanagari = /[\u0900-\u097F]/.test(msgHi.body.data?.assistantMessage?.content || '');
    assert(
      msgHi.status === 200 && msgHi.body.success === true && hasDevanagari,
      22,
      'Multilingual Chat Hindi: Authentic Hindi Response with Devanagari script'
    );

    // Telugu conversation
    const convTe = await makeRequest('POST', '/api/conversations', { language: 'te', title: 'రైతు సంక్షేమ పథకాలు' }, tokenA);
    assert(
      convTe.status === 201 && convTe.body.data.language === 'te',
      23,
      'Multilingual Chat Telugu: Conversation Creation (language: "te")'
    );
    convTeId = convTe.body.data._id;

    const msgTe = await makeRequest('POST', `/api/conversations/${convTeId}/messages`, {
      message: 'నమస్కారం, రైతులకు ఏ ప్రభుత్వ పథకాలు అందుబాటులో ఉన్నాయి?',
    }, tokenA);
    const hasTelugu = /[\u0C00-\u0C7F]/.test(msgTe.body.data?.assistantMessage?.content || '');
    assert(
      msgTe.status === 200 && msgTe.body.success === true && hasTelugu,
      24,
      'Multilingual Chat Telugu: Authentic Telugu Response with Telugu script'
    );

    // -------------------------------------------------------------------------
    // SECTION 6: CONVERSATION HISTORY & CROSS-USER ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Conversation History & User Isolation ---');
    const userAConvs = await makeRequest('GET', '/api/conversations', null, tokenA);
    assert(
      userAConvs.status === 200 && Array.isArray(userAConvs.body.data) && userAConvs.body.data.length === 3,
      25,
      'Conversation History: User A retrieves all 3 active conversation threads'
    );

    const threadEn = await makeRequest('GET', `/api/conversations/${convEnId}`, null, tokenA);
    assert(
      threadEn.status === 200 && threadEn.body.data.messages.length === 2 && threadEn.body.data.messages[0].sender === 'user' && threadEn.body.data.messages[1].sender === 'assistant',
      26,
      'Conversation Thread Retrieval: Full user & assistant message turns preserved'
    );

    const crossRead = await makeRequest('GET', `/api/conversations/${convEnId}`, null, tokenB);
    assert(
      crossRead.status === 403 && crossRead.body.success === false,
      27,
      'User Isolation Security Guard: User B blocked from reading User A conversation (403)'
    );

    const crossWrite = await makeRequest('POST', `/api/conversations/${convEnId}/messages`, {
      message: 'Unauthorized hijack attempt',
    }, tokenB);
    assert(
      crossWrite.status === 403 && crossWrite.body.success === false,
      28,
      'User Isolation Security Guard: User B blocked from writing to User A conversation (403)'
    );

    const userBConvs = await makeRequest('GET', '/api/conversations', null, tokenB);
    assert(
      userBConvs.status === 200 && Array.isArray(userBConvs.body.data) && userBConvs.body.data.length === 0,
      29,
      'User Isolation Verification: User B conversation list is strictly empty'
    );

    // -------------------------------------------------------------------------
    // SECTION 7: ADMIN ROLE, TELEMETRY & MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Admin Role, Telemetry & Management ---');
    const adminReg = await makeRequest('POST', '/api/auth/register', {
      name: 'System Admin Phase 6',
      email: adminEmail,
      password: password,
      preferredLanguage: 'English',
    });
    assert(
      adminReg.status === 201 && adminReg.body.success === true,
      30,
      'Admin Registration & Elevation (User registered and promoted to admin)'
    );

    // Elevate admin in MongoDB
    const User = require('../models/User');
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jansahayak';
    await mongoose.connect(dbUri);
    await User.updateOne({ email: adminEmail.toLowerCase() }, { $set: { role: 'admin' } });
    await mongoose.disconnect();

    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      email: adminEmail,
      password: password,
    });
    assert(
      adminLogin.status === 200 && adminLogin.body.data.user.role === 'admin' && !!adminLogin.body.data.token,
      31,
      'Admin Authentication (Login succeeds with role: "admin" and issues admin JWT)'
    );
    tokenAdmin = adminLogin.body.data.token;

    const adminDash = await makeRequest('GET', '/api/admin/dashboard', null, tokenAdmin);
    const dMetrics = adminDash.body.data;
    const hasMetrics =
      adminDash.status === 200 &&
      typeof dMetrics.totalSchemes === 'number' &&
      typeof dMetrics.activeSchemes === 'number' &&
      typeof dMetrics.inactiveSchemes === 'number' &&
      typeof dMetrics.totalUsers === 'number' &&
      typeof dMetrics.totalConversations === 'number';
    assert(
      hasMetrics,
      32,
      'Admin Dashboard Telemetry (Live scheme, user, and conversation metrics reported)'
    );

    const adminUsers = await makeRequest('GET', '/api/admin/users', null, tokenAdmin);
    const usersData = adminUsers.body.data;
    const passwordSanitized = Array.isArray(usersData) && usersData.length >= 3 && usersData.every(u => u.password === undefined);
    assert(
      adminUsers.status === 200 && passwordSanitized,
      33,
      'Admin User Registry (User overview returned with password hashes strictly excluded)'
    );

    const newSchemeData = {
      schemeName: `PM Gramin Solar Mission ${timestamp}`,
      department: 'Ministry of New and Renewable Energy',
      category: 'Energy',
      beneficiary: 'Rural Households & Farmers',
      state: 'All',
      description: 'Comprehensive rural solar power assistance for agriculture and domestic lighting.',
      benefits: [
        '90% subsidy for solar water pump installation',
        'Continuous off-grid electricity for rural farmsteads',
      ],
      eligibilityText: 'Rural agricultural landowners with annual household income below ₹6,00,000.',
      rules: {
        minAge: 18,
        maxAnnualIncome: 600000,
      },
      documents: ['Aadhaar Card', 'Land Record (Khata/Pahani)', 'Bank Passbook'],
      applicationProcess: [
        'Register at the PM-KUSUM / Gramin Solar Portal.',
        'Upload land ownership verification certificate.',
        'District Agriculture Officer approves on-site installation.',
      ],
      officialWebsite: 'https://mnre.gov.in',
      source: 'Ministry of New & Renewable Energy Annual Guidelines 2026',
      isActive: true,
    };

    const createSchemeRes = await makeRequest('POST', '/api/admin/schemes', newSchemeData, tokenAdmin);
    assert(
      createSchemeRes.status === 201 && createSchemeRes.body.success === true && !!createSchemeRes.body.data._id,
      34,
      'Admin Scheme Management: Create Scheme (POST /api/admin/schemes creates scheme with 201)'
    );
    createdAdminSchemeId = createSchemeRes.body.data._id;

    // Verify deterministic eligibility engine on this new scheme
    const newSchemeEval = await makeRequest('POST', `/api/schemes/${createdAdminSchemeId}/eligibility`, {
      age: 38,
      annualIncome: 450000,
    });
    assert(
      newSchemeEval.status === 200 && newSchemeEval.body.data.status === 'eligible',
      35,
      'Deterministic Eligibility on Admin Scheme (Instantly evaluated as "eligible")'
    );

    // -------------------------------------------------------------------------
    // SECTION 8: SCHEME LIFECYCLE & SECURITY AUTHORIZATION GUARDS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 8: Scheme Lifecycle & Security Authorization Guards ---');
    const updateRes = await makeRequest('PUT', `/api/admin/schemes/${createdAdminSchemeId}`, {
      department: 'Ministry of New and Renewable Energy (Central)',
      rules: {
        minAge: 21,
        maxAnnualIncome: 700000,
      },
    }, tokenAdmin);
    assert(
      updateRes.status === 200 && updateRes.body.data.rules.minAge === 21 && updateRes.body.data.rules.maxAnnualIncome === 700000,
      36,
      'Admin Scheme Management: Update Scheme (PUT /api/admin/schemes/:id updates rule criteria)'
    );

    // Deactivate scheme, verify citizen exclusion, reactivate, verify citizen re-discovery
    const deactRes = await makeRequest('PATCH', `/api/admin/schemes/${createdAdminSchemeId}/status`, { isActive: false }, tokenAdmin);
    const pubAfterDeact = await makeRequest('GET', '/api/schemes');
    const hiddenFromCitizens = !pubAfterDeact.body.data.some(s => s._id === createdAdminSchemeId);

    const reactRes = await makeRequest('PATCH', `/api/admin/schemes/${createdAdminSchemeId}/status`, { isActive: true }, tokenAdmin);
    const pubAfterReact = await makeRequest('GET', '/api/schemes');
    const visibleToCitizens = pubAfterReact.body.data.some(s => s._id === createdAdminSchemeId);

    assert(
      deactRes.status === 200 && hiddenFromCitizens && reactRes.status === 200 && visibleToCitizens,
      37,
      'Scheme Lifecycle & Public Discovery (Deactivated hidden from citizens, reactivated re-appears)'
    );

    // Security Guards: Citizen blocked from admin APIs (403), unauthenticated blocked (401)
    const citizenBlockDash = await makeRequest('GET', '/api/admin/dashboard', null, tokenA);
    const citizenBlockUsers = await makeRequest('GET', '/api/admin/users', null, tokenA);
    const citizenBlockCreate = await makeRequest('POST', '/api/admin/schemes', { schemeName: 'Rogue Scheme' }, tokenA);
    const unauthBlockDash = await makeRequest('GET', '/api/admin/dashboard');

    const allSecurityGuardsPass =
      citizenBlockDash.status === 403 &&
      citizenBlockUsers.status === 403 &&
      citizenBlockCreate.status === 403 &&
      unauthBlockDash.status === 401;

    assert(
      allSecurityGuardsPass,
      38,
      'Security Authorization Guards (Citizens 403 Forbidden on admin APIs, unauthenticated 401 Unauthorized)'
    );

  } catch (err) {
    console.error('Fatal execution error during Phase 6 E2E verification:', err);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`Phase 6 Final E2E Summary: ${passed} Passed, ${failed} Failed out of 38 Tests`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase6FinalVerification();
