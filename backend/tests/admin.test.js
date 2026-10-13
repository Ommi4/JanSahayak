const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Scheme = require('../models/Scheme');
const Conversation = require('../models/Conversation');
const { generateToken } = require('../utils/jwt');
const { connectDB, disconnectDB } = require('../config/db');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/jansahayak_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_automated_testing_phase5';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';

describe('JanSahayak Phase 5 - Admin Suite', () => {
  let adminUser;
  let adminToken;
  let citizenUser;
  let citizenToken;
  let testSchemeId;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    await User.deleteMany({});
    await Scheme.deleteMany({});
    await Conversation.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin_test@example.com',
      password: 'AdminPassword123!',
      role: 'admin',
      preferredLanguage: 'English',
    });
    adminToken = generateToken(adminUser._id);

    // Create normal citizen user
    citizenUser = await User.create({
      name: 'Regular Citizen',
      email: 'citizen_test@example.com',
      password: 'CitizenPassword123!',
      role: 'user',
      preferredLanguage: 'Hindi',
    });
    citizenToken = generateToken(citizenUser._id);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Scheme.deleteMany({});
    await Conversation.deleteMany({});
    await disconnectDB();
  });

  describe('1. Admin Authorization & Guards', () => {
    test('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    test('should reject citizen request with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/administrator privileges required/i);
    });

    test('should allow admin request to access admin dashboard with 200 OK', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(2);
      expect(res.body.data.totalSchemes).toBeDefined();
    });
  });

  describe('2. User Overview API', () => {
    test('should allow admin to list users and never expose password hashes', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(2);

      // Verify passwords and __v are stripped
      res.body.data.forEach((u) => {
        expect(u.password).toBeUndefined();
        expect(u.__v).toBeUndefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
      });
    });

    test('should allow admin to search users by name or email', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=Regular')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Regular Citizen');
    });

    test('should reject citizen access to users list with 403', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('3. Scheme Management CRUD', () => {
    test('should create a new scheme with valid inputs and deterministic rules', async () => {
      const newSchemeData = {
        schemeName: 'National Skill Development Grant',
        department: 'Ministry of Skill Development',
        category: 'Education',
        beneficiary: 'Youth & Students',
        state: 'All',
        description: 'Financial aid and certified vocational training for young citizens.',
        benefits: ['₹15,000 one-time stipend', 'Industry certification'],
        eligibilityText: 'Citizens aged between 18 and 30 with annual income below ₹3,00,000.',
        rules: {
          minAge: 18,
          maxAge: 30,
          maxAnnualIncome: 300000,
          student: true,
        },
        documents: ['Aadhaar Card', 'Student ID / Enrollment Certificate', 'Income Certificate'],
        applicationProcess: [
          'Visit the official Skill India portal.',
          'Fill out online candidate registration form.',
          'Upload required educational documents.',
        ],
        officialWebsite: 'https://www.skillindia.gov.in',
        source: 'Ministry of Skill Development and Entrepreneurship Notification 2026',
        isActive: true,
      };

      const res = await request(app)
        .post('/api/admin/schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newSchemeData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.schemeName).toBe(newSchemeData.schemeName);
      expect(res.body.data.rules.minAge).toBe(18);
      expect(res.body.data.rules.student).toBe(true);

      testSchemeId = res.body.data._id;
    });

    test('should reject scheme creation if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/admin/schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Incomplete scheme without name and category',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/scheme name is required/i);
    });

    test('should reject scheme creation if officialWebsite is not a valid URL', async () => {
      const res = await request(app)
        .post('/api/admin/schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schemeName: 'Invalid URL Scheme',
          category: 'Healthcare',
          description: 'Testing invalid URL validation',
          officialWebsite: 'not_a_valid_url',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid HTTP or HTTPS URL/i);
    });

    test('should allow admin to list all schemes including active and inactive', async () => {
      const res = await request(app)
        .get('/api/admin/schemes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    test('should allow admin to update an existing scheme', async () => {
      const res = await request(app)
        .put(`/api/admin/schemes/${testSchemeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          department: 'Ministry of Skill Development & Entrepreneurship (Updated)',
          benefits: ['₹20,000 stipend (Revised)', 'Industry certification'],
          rules: {
            minAge: 18,
            maxAge: 35,
            maxAnnualIncome: 400000,
            student: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.department).toContain('(Updated)');
      expect(res.body.data.rules.maxAge).toBe(35);
    });

    test('should allow admin to deactivate a scheme and verify public API hides it', async () => {
      // Deactivate scheme
      const patchRes = await request(app)
        .patch(`/api/admin/schemes/${testSchemeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.isActive).toBe(false);

      // Public citizen API should NOT return the deactivated scheme
      const publicRes = await request(app).get('/api/schemes');
      const foundInPublic = publicRes.body.data.some((s) => s._id === testSchemeId);
      expect(foundInPublic).toBe(false);

      // Admin API SHOULD still return the deactivated scheme
      const adminRes = await request(app)
        .get(`/api/admin/schemes/${testSchemeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.isActive).toBe(false);
    });

    test('should allow admin to reactivate scheme and verify public API returns it', async () => {
      const patchRes = await request(app)
        .patch(`/api/admin/schemes/${testSchemeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.isActive).toBe(true);

      // Public API should now return it
      const publicRes = await request(app).get('/api/schemes');
      const foundInPublic = publicRes.body.data.some((s) => s._id === testSchemeId);
      expect(foundInPublic).toBe(true);
    });

    test('deterministic eligibility engine should evaluate admin-created scheme correctly', async () => {
      // 1. Eligible student (age 22, student true, income 200000)
      const eligibleRes = await request(app)
        .post(`/api/schemes/${testSchemeId}/eligibility`)
        .send({
          age: 22,
          student: true,
          annualIncome: 200000,
        });

      expect(eligibleRes.status).toBe(200);
      expect(eligibleRes.body.data.status).toBe('eligible');
      expect(eligibleRes.body.data.eligible).toBe(true);

      // 2. Ineligible non-student / over-age (age 40, student false)
      const ineligibleRes = await request(app)
        .post(`/api/schemes/${testSchemeId}/eligibility`)
        .send({
          age: 40,
          student: false,
          annualIncome: 200000,
        });

      expect(ineligibleRes.status).toBe(200);
      expect(ineligibleRes.body.data.status).toBe('ineligible');
      expect(ineligibleRes.body.data.reasons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
