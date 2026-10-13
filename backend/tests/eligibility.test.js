const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Scheme = require('../models/Scheme');
const { connectDB, disconnectDB } = require('../config/db');
const { evaluateEligibility } = require('../services/eligibilityService');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/jansahayak_test';
process.env.NODE_ENV = 'test';

describe('JanSahayak Phase 2 - Deterministic Eligibility Engine Suite', () => {
  let apScheme;
  let ssyScheme;
  let apyScheme;
  let pmkisanScheme;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    await Scheme.deleteMany({});

    // AP Women Scheme: requires AP state, female, age 45-60, category SC/ST/BC, income <= 144000
    apScheme = await Scheme.create({
      schemeName: 'YSR Cheyutha Test Scheme',
      category: 'Women Empowerment',
      state: 'Andhra Pradesh',
      description: 'Test scheme for Andhra Pradesh women',
      rules: {
        states: ['Andhra Pradesh'],
        gender: ['female'],
        age: { min: 45, max: 60 },
        categories: ['sc', 'st', 'obc', 'bc'],
        annualIncome: { max: 144000 },
      },
      isActive: true,
    });

    // Sukanya Samriddhi: female, age 0 to 10
    ssyScheme = await Scheme.create({
      schemeName: 'Sukanya Samriddhi Test Scheme',
      category: 'Child Welfare',
      state: 'All',
      description: 'Test scheme for girl child',
      rules: {
        gender: ['female'],
        age: { min: 0, max: 10 },
      },
      isActive: true,
    });

    // APY Scheme: age 18 to 40
    apyScheme = await Scheme.create({
      schemeName: 'Atal Pension Test Scheme',
      category: 'Pension',
      state: 'All',
      description: 'Test scheme for unorganized workers',
      rules: {
        age: { min: 18, max: 40 },
      },
      isActive: true,
    });

    // PM-KISAN: farmer: true, age >= 18
    pmkisanScheme = await Scheme.create({
      schemeName: 'PM-KISAN Test Scheme',
      category: 'Agriculture',
      state: 'All',
      description: 'Test scheme for farmers',
      rules: {
        farmer: true,
        age: { min: 18 },
      },
      isActive: true,
    });
  });

  afterAll(async () => {
    await Scheme.deleteMany({});
    await disconnectDB();
  });

  describe('1. Unit Tests - evaluateEligibility()', () => {
    test('Eligible case: profile satisfying all criteria returns status "eligible" and eligible: true', () => {
      const profile = {
        age: 50,
        gender: 'female',
        state: 'Andhra Pradesh',
        category: 'BC',
        annualIncome: 100000,
      };

      const result = evaluateEligibility(profile, apScheme);
      expect(result.eligible).toBe(true);
      expect(result.status).toBe('eligible');
      expect(result.reasons).toHaveLength(0);
      expect(result.missingInformation).toHaveLength(0);
    });

    test('Ineligible case: profile failing a single criterion returns status "ineligible" with structured reason', () => {
      const profile = {
        age: 40, // Below minimum 45
        gender: 'female',
        state: 'Andhra Pradesh',
        category: 'BC',
        annualIncome: 100000,
      };

      const result = evaluateEligibility(profile, apScheme);
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('ineligible');
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0].field).toBe('age');
      expect(result.reasons[0].expected).toBe('>= 45');
      expect(result.reasons[0].actual).toBe(40);
    });

    test('Multiple failures: correctly aggregates all failed rules in reasons', () => {
      const profile = {
        age: 30, // Below min 45
        gender: 'male', // Requires female
        state: 'Karnataka', // Requires Andhra Pradesh
        category: 'General', // Not in SC/ST/BC
        annualIncome: 200000, // Exceeds 144000
      };

      const result = evaluateEligibility(profile, apScheme);
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('ineligible');
      expect(result.reasons.length).toBe(5);

      const failedFields = result.reasons.map((r) => r.field);
      expect(failedFields).toContain('age');
      expect(failedFields).toContain('gender');
      expect(failedFields).toContain('state');
      expect(failedFields).toContain('category');
      expect(failedFields).toContain('annualIncome');
    });

    test('Missing information: returns status "missing_information" without false eligibility', () => {
      const profile = {
        gender: 'female',
        state: 'Andhra Pradesh',
        // age, category, annualIncome are omitted
      };

      const result = evaluateEligibility(profile, apScheme);
      expect(result.eligible).toBe(false);
      expect(result.status).toBe('missing_information');
      expect(result.reasons).toHaveLength(0);
      expect(result.missingInformation).toContain('age');
      expect(result.missingInformation).toContain('category');
      expect(result.missingInformation).toContain('annualIncome');
    });

    describe('Numeric Boundary Tests', () => {
      test('Exact minimum age boundary: age === minAge (18) is eligible for APY', () => {
        const result = evaluateEligibility({ age: 18 }, apyScheme);
        expect(result.eligible).toBe(true);
        expect(result.status).toBe('eligible');
      });

      test('One below minimum age: age === 17 is ineligible for APY', () => {
        const result = evaluateEligibility({ age: 17 }, apyScheme);
        expect(result.eligible).toBe(false);
        expect(result.status).toBe('ineligible');
        expect(result.reasons[0].field).toBe('age');
      });

      test('Exact maximum age boundary: age === maxAge (40) is eligible for APY', () => {
        const result = evaluateEligibility({ age: 40 }, apyScheme);
        expect(result.eligible).toBe(true);
        expect(result.status).toBe('eligible');
      });

      test('One above maximum age: age === 41 is ineligible for APY', () => {
        const result = evaluateEligibility({ age: 41 }, apyScheme);
        expect(result.eligible).toBe(false);
        expect(result.status).toBe('ineligible');
        expect(result.reasons[0].field).toBe('age');
      });

      test('Exact income limit boundary: annualIncome === maxAnnualIncome (144000) is eligible', () => {
        const profile = {
          age: 50,
          gender: 'female',
          state: 'Andhra Pradesh',
          category: 'SC',
          annualIncome: 144000,
        };
        const result = evaluateEligibility(profile, apScheme);
        expect(result.eligible).toBe(true);
        expect(result.status).toBe('eligible');
      });

      test('One rupee above income limit: annualIncome === 144001 is ineligible', () => {
        const profile = {
          age: 50,
          gender: 'female',
          state: 'Andhra Pradesh',
          category: 'SC',
          annualIncome: 144001,
        };
        const result = evaluateEligibility(profile, apScheme);
        expect(result.eligible).toBe(false);
        expect(result.status).toBe('ineligible');
        expect(result.reasons[0].field).toBe('annualIncome');
      });
    });

    describe('Boolean & State Criteria Tests', () => {
      test('Boolean flag farmer=true satisfies PM-KISAN requirement', () => {
        const result = evaluateEligibility({ farmer: true, age: 30 }, pmkisanScheme);
        expect(result.eligible).toBe(true);
        expect(result.status).toBe('eligible');
      });

      test('Boolean flag farmer=false fails PM-KISAN requirement', () => {
        const result = evaluateEligibility({ farmer: false, age: 30 }, pmkisanScheme);
        expect(result.eligible).toBe(false);
        expect(result.status).toBe('ineligible');
        expect(result.reasons[0].field).toBe('farmer');
      });

      test('Omitted farmer boolean returns missing_information for PM-KISAN', () => {
        const result = evaluateEligibility({ age: 30 }, pmkisanScheme);
        expect(result.eligible).toBe(false);
        expect(result.status).toBe('missing_information');
        expect(result.missingInformation).toContain('farmer');
      });

      test('State matching allows specified state and rejects non-matching states', () => {
        const matchingProfile = {
          age: 50,
          gender: 'female',
          state: 'andhra pradesh', // case-insensitive check
          category: 'SC',
          annualIncome: 100000,
        };
        expect(evaluateEligibility(matchingProfile, apScheme).eligible).toBe(true);

        const nonMatchingProfile = { ...matchingProfile, state: 'Telangana' };
        const result = evaluateEligibility(nonMatchingProfile, apScheme);
        expect(result.eligible).toBe(false);
        expect(result.reasons[0].field).toBe('state');
      });
    });
  });

  describe('2. API Integration Tests - POST /api/schemes/:id/eligibility', () => {
    test('POST /api/schemes/:id/eligibility returns 200 with eligible result', async () => {
      const res = await request(app)
        .post(`/api/schemes/${apScheme._id}/eligibility`)
        .send({
          age: 48,
          gender: 'female',
          state: 'Andhra Pradesh',
          category: 'BC',
          annualIncome: 120000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eligible).toBe(true);
      expect(res.body.data.status).toBe('eligible');
      expect(res.body.data.schemeName).toBe('YSR Cheyutha Test Scheme');
    });

    test('POST /api/schemes/:id/eligibility returns 200 with ineligible result and reasons', async () => {
      const res = await request(app)
        .post(`/api/schemes/${apScheme._id}/eligibility`)
        .send({
          age: 25, // Too young
          gender: 'male', // Wrong gender
          state: 'Delhi', // Wrong state
          category: 'General',
          annualIncome: 500000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eligible).toBe(false);
      expect(res.body.data.status).toBe('ineligible');
      expect(res.body.data.reasons.length).toBeGreaterThan(0);
    });

    test('POST /api/schemes/:id/eligibility rejects invalid negative age with 400', async () => {
      const res = await request(app)
        .post(`/api/schemes/${apScheme._id}/eligibility`)
        .send({ age: -5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid number between 0 and 130/i);
    });

    test('POST /api/schemes/:id/eligibility rejects invalid negative income with 400', async () => {
      const res = await request(app)
        .post(`/api/schemes/${apScheme._id}/eligibility`)
        .send({ annualIncome: -10000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/non-negative number/i);
    });

    test('POST /api/schemes/:id/eligibility returns 404 for nonexistent scheme', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/schemes/${nonExistentId}/eligibility`)
        .send({ age: 25 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
