const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Scheme = require('../models/Scheme');
const { connectDB, disconnectDB } = require('../config/db');
const { seedSchemes } = require('../seed/seedSchemes');
const aiService = require('../services/ai/aiService');
const { ClaudeUnavailableError } = require('../services/ai/claudeProvider');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/jansahayak_test';
process.env.JWT_SECRET = 'test_jwt_secret_for_automated_testing_phase3';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';
process.env.AI_MODE = 'fallback';

describe('JanSahayak Phase 3 - Conversation & AI Service Layer Suite', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;
  let convAId;

  beforeAll(async () => {
    await connectDB(TEST_DB_URI);
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await User.deleteMany({});
    await Scheme.deleteMany({});

    // Seed verified schemes into test DB
    await seedSchemes(TEST_DB_URI);
    await connectDB(TEST_DB_URI);

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Ananya Rao',
      email: 'ananya.rao@example.com',
      password: 'Password123',
      preferredLanguage: 'English',
    });
    tokenA = resA.body.data.token;
    userA = resA.body.data.user;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Bikram Singh',
      email: 'bikram.singh@example.com',
      password: 'Password123',
      preferredLanguage: 'Hindi',
    });
    tokenB = resB.body.data.token;
    userB = resB.body.data.user;
  });

  afterAll(async () => {
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await User.deleteMany({});
    await Scheme.deleteMany({});
    await disconnectDB();
  });

  describe('1. Conversation Lifecycle & Ownership', () => {
    test('1. Authenticated user can create a conversation', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ language: 'en' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.user).toBe(userA._id);
      expect(res.body.data.language).toBe('en');
      convAId = res.body.data._id;
    });

    test('2. Unauthenticated user cannot create a conversation (401)', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .send({ language: 'en' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('3. User can list only their own conversations', async () => {
      // Create a conversation for User B
      await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ language: 'hi' });

      const resA = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.count).toBe(1);
      expect(resA.body.data[0]._id).toBe(convAId);

      const resB = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.count).toBe(1);
      expect(resB.body.data[0]._id).not.toBe(convAId);
    });

    test('4. User can retrieve their own conversation and message history', async () => {
      const res = await request(app)
        .get(`/api/conversations/${convAId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation._id).toBe(convAId);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
    });

    test('5. User cannot retrieve another user\'s conversation (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/conversations/${convAId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });
  });

  describe('2. Message Handling & Validation', () => {
    test('6 & 7 & 8. User can send a message, and both user message and assistant response are persisted', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Hello JanSahayak' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('userMessage');
      expect(res.body.data).toHaveProperty('assistantMessage');
      expect(res.body.data.userMessage.content).toBe('Hello JanSahayak');
      expect(res.body.data.userMessage.sender).toBe('user');
      expect(res.body.data.assistantMessage.sender).toBe('assistant');
      expect(res.body.data.assistantMessage.content).toMatch(/Namaste/i);

      // Verify in DB that both messages are saved
      const savedMessages = await Message.find({ conversation: convAId });
      expect(savedMessages.length).toBe(2);
    });

    test('9. Empty message is rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot be empty/i);
    });

    test('10. Oversized message (>2000 chars) is rejected with 400 Bad Request', async () => {
      const hugeMessage = 'a'.repeat(2001);
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: hugeMessage });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/maximum allowed length/i);
    });

    test('11. User cannot send a message to another user\'s conversation (403)', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ message: 'Attempting unauthorized message' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Fallback AI Intent Handling', () => {
    test('12. Greeting response works and introduces JanSahayak', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Hi there' });

      expect(res.status).toBe(200);
      expect(res.body.data.structured.intent).toBe('greeting');
      expect(res.body.data.assistantMessage.content).toMatch(/JanSahayak/i);
    });

    test('13. Scheme discovery works and returns real verified schemes', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'What schemes are available for farmers?' });

      expect(res.status).toBe(200);
      expect(res.body.data.structured.intent).toBe('scheme_discovery');
      expect(res.body.data.assistantMessage.content).toMatch(/PM-KISAN/i);
      expect(res.body.data.structured.schemes.length).toBeGreaterThan(0);
    });

    test('14. Scheme detail lookup works and provides benefits and application info', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Tell me details of PM-KISAN' });

      expect(res.status).toBe(200);
      expect(res.body.data.structured.intent).toBe('scheme_details');
      expect(res.body.data.assistantMessage.content).toMatch(/Ministry of Agriculture/i);
      expect(res.body.data.assistantMessage.content).toMatch(/Required Documents/i);
    });

    test('15. Eligibility flow uses deterministic eligibility logic for eligible farmer', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'I am a 35 years old farmer. Am I eligible for PM-KISAN?' });

      expect(res.status).toBe(200);
      expect(res.body.data.structured.intent).toBe('eligibility');
      expect(res.body.data.structured.eligibility.status).toBe('eligible');
      expect(res.body.data.assistantMessage.content).toMatch(/ELIGIBLE/i);
    });

    test('16. Missing eligibility information is identified and prompts user', async () => {
      // Inquire about PM-KISAN without specifying farmer boolean or age
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Am I eligible for PM-KISAN?' });

      expect(res.status).toBe(200);
      expect(res.body.data.structured.intent).toBe('eligibility');
      expect(res.body.data.structured.eligibility.status).toBe('missing_information');
      expect(res.body.data.structured.missingFields.length).toBeGreaterThan(0);
      expect(res.body.data.assistantMessage.content).toMatch(/Additional Information Needed/i);
    });

    test('17. Official scheme URL comes directly from stored scheme data', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'What is the official website for PM-KISAN?' });

      expect(res.status).toBe(200);
      expect(res.body.data.structured.intent).toBe('official_source');
      expect(res.body.data.assistantMessage.content).toMatch(/https:\/\/pmkisan\.gov\.in\//i);
    });

    test('18. Unknown request receives safe general assistance fallback response', async () => {
      const res = await request(app)
        .post(`/api/conversations/${convAId}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'xyz random unparsable query 987' });

      expect(res.status).toBe(200);
      expect(res.body.data.structured.intent).toBe('unknown');
      expect(res.body.data.assistantMessage.content).toMatch(/I am JanSahayak/i);
    });
  });

  describe('4. Multilingual Support (English, Hindi, Telugu)', () => {
    test('19. English conversation generates English responses', async () => {
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ language: 'en' });
      const cid = convRes.body.data._id;

      const res = await request(app)
        .post(`/api/conversations/${cid}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Hello' });

      expect(res.body.data.assistantMessage.content).toMatch(/Namaste! I am JanSahayak/i);
    });

    test('20. Hindi conversation generates Hindi responses', async () => {
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ language: 'hi' });
      const cid = convRes.body.data._id;

      const res = await request(app)
        .post(`/api/conversations/${cid}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Namaste' });

      expect(res.body.data.assistantMessage.content).toMatch(/नमस्ते! मैं जनसहायक हूँ/);
    });

    test('21. Telugu conversation generates Telugu responses', async () => {
      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ language: 'te' });
      const cid = convRes.body.data._id;

      const res = await request(app)
        .post(`/api/conversations/${cid}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Namaskaram' });

      expect(res.body.data.assistantMessage.content).toMatch(/నమస్కారం! నేను జనసహాయక్/);
    });

    test('22. Unsupported language rejected or safely handled', async () => {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ language: 'unsupported_german' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/unsupported language/i);
    });
  });

  describe('5. Provider Configuration & Resilience', () => {
    test('23. AI_MODE=fallback operates reliably without Claude key', async () => {
      process.env.AI_MODE = 'fallback';
      const response = await aiService.generateResponse({
        message: 'Hello',
        language: 'en',
      });
      expect(response.provider).toBe('fallback');
      expect(response.text).toBeDefined();
    });

    test('24. Claude mode without API key fails gracefully with 503', async () => {
      process.env.AI_MODE = 'claude';
      delete process.env.ANTHROPIC_API_KEY;

      const convRes = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ language: 'en' });
      const cid = convRes.body.data._id;

      const res = await request(app)
        .post(`/api/conversations/${cid}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ message: 'Hello in Claude mode' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Anthropic Claude API is not configured/i);

      // Restore fallback mode
      process.env.AI_MODE = 'fallback';
    });

    test('25. AI provider error does not crash the server', async () => {
      process.env.AI_MODE = 'fallback';
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.success).toBe(true);
    });
  });
});
