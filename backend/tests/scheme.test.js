const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Scheme = require('../models/Scheme');
const { connectDB, disconnectDB } = require('../config/db');
const { seedSchemes } = require('../seed/seedSchemes');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/jansahayak_test';
process.env.NODE_ENV = 'test';

describe('JanSahayak Phase 2 - Scheme APIs Suite', () => {
  let sampleSchemeId;
  let inactiveSchemeId;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    await Scheme.deleteMany({});
    
    // Seed verified schemes into isolated test database
    await seedSchemes(TEST_DB_URI);
    // Connect again because seedSchemes disconnects upon completion
    await connectDB(TEST_DB_URI);

    const firstScheme = await Scheme.findOne({ isActive: true });
    sampleSchemeId = firstScheme._id.toString();

    // Create an inactive scheme for testing active filtering
    const inactive = await Scheme.create({
      schemeName: 'Old Inactive Discontinued Scheme',
      department: 'Old Department',
      category: 'Discontinued',
      state: 'All',
      description: 'This scheme is no longer active.',
      isActive: false,
    });
    inactiveSchemeId = inactive._id.toString();
  });

  afterAll(async () => {
    await Scheme.deleteMany({});
    await disconnectDB();
  });

  describe('GET /api/schemes', () => {
    test('should return all active schemes and exclude inactive ones by default', async () => {
      const res = await request(app).get('/api/schemes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(10);

      // Verify no inactive scheme is present
      const hasInactive = res.body.data.some((s) => s._id === inactiveSchemeId);
      expect(hasInactive).toBe(false);
    });

    test('should filter schemes by category (case-insensitive)', async () => {
      const res = await request(app).get('/api/schemes?category=Agriculture');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      res.body.data.forEach((scheme) => {
        expect(scheme.category.toLowerCase()).toBe('agriculture');
      });
    });

    test('should filter schemes by state (returns state-specific + national/all schemes)', async () => {
      const res = await request(app).get('/api/schemes?state=Andhra%20Pradesh');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const hasAPSpecific = res.body.data.some(
        (s) => s.state && s.state.toLowerCase() === 'andhra pradesh'
      );
      expect(hasAPSpecific).toBe(true);
    });

    test('should search schemes by keyword in name or description', async () => {
      const res = await request(app).get('/api/schemes?search=Arogya');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].schemeName).toMatch(/Jan Arogya/i);
    });
  });

  describe('GET /api/schemes/:id', () => {
    test('should return scheme details for a valid existing ID', async () => {
      const res = await request(app).get(`/api/schemes/${sampleSchemeId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data._id).toBe(sampleSchemeId);
      expect(res.body.data.schemeName).toBeDefined();
      expect(res.body.data.officialWebsite).toBeDefined();
      expect(res.body.data.source).toBeDefined();
    });

    test('should return 400 Bad Request for an invalid ObjectId format', async () => {
      const res = await request(app).get('/api/schemes/not-a-valid-object-id');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid scheme id format/i);
    });

    test('should return 404 Not Found for a non-existent ObjectId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/schemes/${nonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/scheme not found/i);
    });
  });
});
