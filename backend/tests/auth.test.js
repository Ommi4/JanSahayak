const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const { connectDB, disconnectDB } = require('../config/db');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/jansahayak_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_automated_testing_phase1';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';

describe('JanSahayak Phase 1 - Backend Foundation & Auth Suite', () => {
  beforeAll(async () => {
    // Connect to isolated test database
    await connectDB(TEST_DB_URI);
    // Clear test users collection
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data and close connection
    await User.deleteMany({});
    await disconnectDB();
  });

  describe('1. Server Health & Unknown Routes', () => {
    test('GET /api/health returns 200 and running status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('JanSahayak API is running');
    });

    test('Unknown route returns 404 with error message', async () => {
      const res = await request(app).get('/api/unknown-endpoint-404');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Not Found/);
    });
  });

  describe('2. User Registration (POST /api/auth/register)', () => {
    const validUser = {
      name: 'Ramesh Kumar',
      email: 'ramesh.kumar@example.com',
      password: 'SecurePassword123',
      preferredLanguage: 'Telugu',
    };

    test('should register a new user successfully with hashed password and JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');

      // Security verification: password and password hash must NEVER be returned
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.name).toBe(validUser.name);
      expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());
      expect(res.body.data.user.preferredLanguage).toBe('Telugu');

      // Verify in DB that password is encrypted with bcrypt
      const savedUser = await User.findOne({ email: validUser.email.toLowerCase() });
      expect(savedUser).not.toBeNull();
      expect(savedUser.password).not.toBe(validUser.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash format
    });

    test('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    test('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid User',
          email: 'invalid-email-address',
          password: 'Password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid email/i);
    });

    test('should reject registration with missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'noname@example.com',
          password: 'Password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name is required/i);
    });

    test('should reject registration with password under 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Pass',
          email: 'shortpass@example.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    test('should reject unsupported preferredLanguage', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'French User',
          email: 'french@example.com',
          password: 'Password123',
          preferredLanguage: 'French',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Preferred language must be one of/i);
    });
  });

  describe('3. User Login (POST /api/auth/login)', () => {
    beforeAll(async () => {
      await User.create({
        name: 'Sunita Sharma',
        email: 'sunita.sharma@example.com',
        password: 'Password456',
        preferredLanguage: 'Hindi',
      });
    });

    test('should login successfully with valid credentials and return token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sunita.sharma@example.com',
          password: 'Password456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('sunita.sharma@example.com');
      expect(res.body.data.user.password).toBeUndefined();
    });

    test('should fail login with incorrect password safely', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sunita.sharma@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    test('should fail login for nonexistent user safely without leaking account existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent.user@example.com',
          password: 'Password456',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    test('should reject missing email or password during login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sunita.sharma@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Token Verification & User Profile (GET /api/auth/me)', () => {
    let tokenUserA;
    let tokenUserB;
    let userAId;
    let userBId;

    beforeAll(async () => {
      const regResA = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Citizen A',
          email: 'citizen.a@example.com',
          password: 'Password123',
          preferredLanguage: 'English',
        });
      tokenUserA = regResA.body.data.token;
      userAId = regResA.body.data.user._id;

      const regResB = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Citizen B',
          email: 'citizen.b@example.com',
          password: 'Password123',
          preferredLanguage: 'Telugu',
        });
      tokenUserB = regResB.body.data.token;
      userBId = regResB.body.data.user._id;
    });

    test('should access /api/auth/me with valid Bearer token and return matching profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user._id).toBe(userAId);
      expect(res.body.data.user.name).toBe('Citizen A');
      expect(res.body.data.user.email).toBe('citizen.a@example.com');
      expect(res.body.data.user.password).toBeUndefined();
    });

    test('should strictly isolate User B profile when using User B token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user._id).toBe(userBId);
      expect(res.body.data.user.name).toBe('Citizen B');
      expect(res.body.data.user.preferredLanguage).toBe('Telugu');
    });

    test('should reject request when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no token provided/i);
    });

    test('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token_value');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });

    test('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: userAId },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });
  });
});
