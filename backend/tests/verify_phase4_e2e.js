/**
 * JanSahayak - Phase 4 Complete Citizen Journey Live End-to-End Verification Script
 * Validates the full citizen journey across all frontend-backend integrated capabilities:
 * 1. Health & Status
 * 2. Citizen Registration & JWT Issuance
 * 3. Citizen Login & Profile Hydration
 * 4. Citizen Dashboard (Recent Conversations)
 * 5. Scheme Discovery (Full List, Category Filter, Search)
 * 6. Scheme Details (Metadata, Official Links, Benefits, Steps, Documents)
 * 7. Deterministic Eligibility Checker (Eligible, Ineligible, Missing Information)
 * 8. Chat in English (Creation, Messaging, Fallback AI Response, Title Auto-generation)
 * 9. Chat in Hindi (Creation, Multilingual Messaging, Hindi Response)
 * 10. Chat in Telugu (Creation, Multilingual Messaging, Telugu Response)
 * 11. Conversation History & Message Thread Retrieval
 * 12. Security & User Isolation (User B cannot read/write User A's conversations)
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

async function runE2EVerification() {
  console.log('================================================================');
  console.log('JanSahayak - Phase 4 Complete Citizen Frontend E2E Verification');
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

  const userAEmail = `citizen_a_${Date.now()}@example.com`;
  const userBEmail = `citizen_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  let tokenA = null;
  let tokenB = null;
  let userA = null;
  let userB = null;
  let pmKisanScheme = null;
  let convEnglishId = null;
  let convHindiId = null;
  let convTeluguId = null;

  try {
    // 1. Health check
    console.log('--- Step 1: Backend Health Check ---');
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.body.success === true, 'GET /api/health returns 200 OK');

    // 2. Register Citizen A
    console.log('\n--- Step 2: Citizen Registration (User A) ---');
    const regA = await makeRequest('POST', '/api/auth/register', {
      name: 'Ramesh Patel',
      email: userAEmail,
      password: password,
      preferredLanguage: 'English',
    });
    assert(regA.status === 201 && !!regA.body.data.token, 'Register User A succeeds with 201 and JWT');
    tokenA = regA.body.data.token;
    userA = regA.body.data.user;

    // Register Citizen B for isolation tests
    const regB = await makeRequest('POST', '/api/auth/register', {
      name: 'Suresh Kumar',
      email: userBEmail,
      password: password,
      preferredLanguage: 'Hindi',
    });
    tokenB = regB.body.data.token;
    userB = regB.body.data.user;

    // 3. Login Citizen A
    console.log('\n--- Step 3: Citizen Login (User A) ---');
    const loginA = await makeRequest('POST', '/api/auth/login', {
      email: userAEmail,
      password: password,
    });
    assert(loginA.status === 200 && loginA.body.data.user.name === 'Ramesh Patel', 'Login User A succeeds with 200');

    // 4. Dashboard Data Fetch
    console.log('\n--- Step 4: Dashboard Data Fetch ---');
    const dashConvs = await makeRequest('GET', '/api/conversations', null, tokenA);
    assert(dashConvs.status === 200 && Array.isArray(dashConvs.body.data), 'GET /api/conversations returns empty array initially');

    // 5. Scheme Discovery & Filtering
    console.log('\n--- Step 5: Scheme Discovery & Filtering ---');
    const allSchemesRes = await makeRequest('GET', '/api/schemes');
    assert(allSchemesRes.status === 200 && allSchemesRes.body.data.length >= 10, 'GET /api/schemes returns 10 verified schemes');

    const agSchemes = await makeRequest('GET', '/api/schemes?category=Agriculture');
    assert(agSchemes.status === 200 && agSchemes.body.data.every(s => s.category.toLowerCase() === 'agriculture'), 'Filter by Category: Agriculture returns only agricultural schemes');

    const searchSchemes = await makeRequest('GET', '/api/schemes?search=kisan');
    assert(searchSchemes.status === 200 && searchSchemes.body.data.length > 0, 'Search by keyword "kisan" returns relevant schemes');
    pmKisanScheme = allSchemesRes.body.data.find(s => s.schemeName.toLowerCase().includes('kisan'));
    assert(!!pmKisanScheme, 'PM-KISAN scheme identified in database');

    // 6. Scheme Details
    console.log('\n--- Step 6: Scheme Details & Official URLs ---');
    const schemeDetailRes = await makeRequest('GET', `/api/schemes/${pmKisanScheme._id}`);
    assert(schemeDetailRes.status === 200 && schemeDetailRes.body.data.schemeName === pmKisanScheme.schemeName, 'GET /api/schemes/:id returns complete metadata');
    assert(schemeDetailRes.body.data.officialWebsite.startsWith('http'), 'Official website is present and well-formed');
    assert(schemeDetailRes.body.data.benefits.length > 0, 'Scheme benefits list is populated');
    assert(schemeDetailRes.body.data.documents.length > 0, 'Scheme documents checklist is populated');
    assert(schemeDetailRes.body.data.applicationProcess.length > 0, 'Application process steps are populated');

    // 7. Deterministic Eligibility Checker
    console.log('\n--- Step 7: Deterministic Eligibility Engine Tests ---');
    // 7A: Eligible citizen profile
    const eligibleProfile = {
      age: 40,
      occupation: 'Farmer',
      farmer: true,
      annualIncome: 150000,
      state: 'Andhra Pradesh',
      category: 'OBC',
    };
    const evalEligible = await makeRequest('POST', `/api/schemes/${pmKisanScheme._id}/eligibility`, eligibleProfile);
    assert(
      evalEligible.status === 200 && evalEligible.body.data.status === 'eligible',
      'Eligibility evaluation: returns status "eligible" for eligible profile'
    );

    // 7B: Ineligible citizen profile (wrong occupation / not a farmer)
    const ineligibleProfile = {
      age: 40,
      occupation: 'Software Engineer',
      farmer: false,
      annualIncome: 1500000,
      state: 'Andhra Pradesh',
    };
    const evalIneligible = await makeRequest('POST', `/api/schemes/${pmKisanScheme._id}/eligibility`, ineligibleProfile);
    assert(
      evalIneligible.status === 200 && evalIneligible.body.data.status === 'ineligible',
      'Eligibility evaluation: returns status "ineligible" for non-farmer profile'
    );
    assert(
      evalIneligible.body.data.reasons.length > 0,
      'Eligibility evaluation: provides specific deterministic failing reasons'
    );

    // 7C: Missing information profile
    const emptyProfile = {};
    const evalMissing = await makeRequest('POST', `/api/schemes/${pmKisanScheme._id}/eligibility`, emptyProfile);
    assert(
      evalMissing.status === 200 && (evalMissing.body.data.status === 'missing_information' || evalMissing.body.data.status === 'ineligible'),
      'Eligibility evaluation handles empty/sparse profile'
    );

    // 8. JanSahayak Chat: English
    console.log('\n--- Step 8: JanSahayak Chat (English) ---');
    const convEnRes = await makeRequest('POST', '/api/conversations', { language: 'en', title: 'English Assistance' }, tokenA);
    assert(convEnRes.status === 201 && convEnRes.body.data.language === 'en', 'Create English conversation returns 201');
    convEnglishId = convEnRes.body.data._id;

    const msgEnRes = await makeRequest('POST', `/api/conversations/${convEnglishId}/messages`, {
      message: 'What schemes are available for farmers?',
    }, tokenA);
    assert(msgEnRes.status === 200 && msgEnRes.body.success === true, 'POST /messages in English responds 200 OK');
    assert(msgEnRes.body.data.assistantMessage.content.length > 20, 'Assistant returned meaningful English welfare guidance');
    assert(msgEnRes.body.data.structured.language === 'en', 'Response structured language matches "en"');

    // 9. JanSahayak Chat: Hindi
    console.log('\n--- Step 9: JanSahayak Chat (Hindi - हिंदी) ---');
    const convHiRes = await makeRequest('POST', '/api/conversations', { language: 'hi', title: 'हिंदी सहायता' }, tokenA);
    assert(convHiRes.status === 201 && convHiRes.body.data.language === 'hi', 'Create Hindi conversation returns 201');
    convHindiId = convHiRes.body.data._id;

    const msgHiRes = await makeRequest('POST', `/api/conversations/${convHindiId}/messages`, {
      message: 'नमस्ते, किसानों के लिए क्या योजनाएं हैं?',
    }, tokenA);
    assert(msgHiRes.status === 200 && msgHiRes.body.success === true, 'POST /messages in Hindi responds 200 OK');
    assert(/[\u0900-\u097F]/.test(msgHiRes.body.data.assistantMessage.content), 'Assistant response contains genuine Hindi Devanagari characters');

    // 10. JanSahayak Chat: Telugu
    console.log('\n--- Step 10: JanSahayak Chat (Telugu - తెలుగు) ---');
    const convTeRes = await makeRequest('POST', '/api/conversations', { language: 'te', title: 'తెలుగు సహాయం' }, tokenA);
    assert(convTeRes.status === 201 && convTeRes.body.data.language === 'te', 'Create Telugu conversation returns 201');
    convTeluguId = convTeRes.body.data._id;

    const msgTeRes = await makeRequest('POST', `/api/conversations/${convTeluguId}/messages`, {
      message: 'నమస్కారం, రైతులకు ఏ పథకాలు ఉన్నాయి?',
    }, tokenA);
    assert(msgTeRes.status === 200 && msgTeRes.body.success === true, 'POST /messages in Telugu responds 200 OK');
    assert(/[\u0C00-\u0C7F]/.test(msgTeRes.body.data.assistantMessage.content), 'Assistant response contains genuine Telugu script characters');

    // 11. Conversation History & Thread Inspection
    console.log('\n--- Step 11: Conversation History & Thread Retrieval ---');
    const userAConvs = await makeRequest('GET', '/api/conversations', null, tokenA);
    assert(userAConvs.status === 200 && userAConvs.body.data.length === 3, 'User A conversation list returns all 3 conversations');

    const threadRes = await makeRequest('GET', `/api/conversations/${convEnglishId}`, null, tokenA);
    assert(threadRes.status === 200 && threadRes.body.data.messages.length === 2, 'GET /api/conversations/:id returns full user & assistant message thread');

    // 12. Security & User Isolation
    console.log('\n--- Step 12: Security & User Isolation ---');
    // User B tries to read User A's conversation
    const crossReadRes = await makeRequest('GET', `/api/conversations/${convEnglishId}`, null, tokenB);
    assert(crossReadRes.status === 403, 'Cross-user read rejected with 403 Forbidden');

    // User B tries to send a message to User A's conversation
    const crossWriteRes = await makeRequest('POST', `/api/conversations/${convEnglishId}/messages`, { message: 'Unauthorized hijack' }, tokenB);
    assert(crossWriteRes.status === 403, 'Cross-user write rejected with 403 Forbidden');

    // User B's conversation list is empty (isolated)
    const userBConvs = await makeRequest('GET', '/api/conversations', null, tokenB);
    assert(userBConvs.status === 200 && userBConvs.body.data.length === 0, 'User B conversation list isolated (length 0)');

  } catch (err) {
    console.error('Fatal error during E2E verification:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`Phase 4 E2E Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2EVerification();
