const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function verifyLive() {
  const base = 'http://127.0.0.1:5000';
  console.log('=== PHASE 3 LIVE HTTP VERIFICATION ===\n');

  // 1. Health
  console.log('1. Testing GET /api/health');
  const hRes = await fetch(base + '/api/health');
  const hJson = await hRes.json();
  console.log('Status:', hRes.status, 'Response:', JSON.stringify(hJson));
  if (hRes.status !== 200 || !hJson.success) throw new Error('Health check failed');

  // 2. Auth Users
  console.log('\n2. Registering User A & User B');
  const emailA = 'live.phase3.a.' + Date.now() + '@example.com';
  const emailB = 'live.phase3.b.' + Date.now() + '@example.com';

  const regA = await (await fetch(base + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Live User A', email: emailA, password: 'Password123', preferredLanguage: 'English' })
  })).json();
  const tokenA = regA.data.token;

  const regB = await (await fetch(base + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Live User B', email: emailB, password: 'Password123', preferredLanguage: 'Hindi' })
  })).json();
  const tokenB = regB.data.token;
  console.log('Users registered. User A:', emailA, 'User B:', emailB);

  // 3. Create Conversation
  console.log('\n3. POST /api/conversations (User A)');
  const cRes = await fetch(base + '/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ language: 'en', title: 'Farmer Scheme Inquiries' })
  });
  const cJson = await cRes.json();
  const convId = cJson.data._id;
  console.log('Status:', cRes.status, 'Created Conversation ID:', convId);

  // 4. Send: Hello
  console.log('\n4. Sending message: "Hello"');
  const m1 = await (await fetch(base + '/api/conversations/' + convId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ message: 'Hello' })
  })).json();
  console.log('Intent:', m1.data?.structured?.intent);
  console.log('Assistant Response:', m1.data?.assistantMessage?.content.slice(0, 100) + '...');

  // 5. Send: What schemes are available for farmers?
  console.log('\n5. Sending message: "What schemes are available for farmers?"');
  const m2 = await (await fetch(base + '/api/conversations/' + convId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ message: 'What schemes are available for farmers?' })
  })).json();
  console.log('Intent:', m2.data?.structured?.intent);
  console.log('Discovered Schemes Count:', m2.data?.structured?.schemes?.length);
  console.log('Assistant Response Snippet:\n' + m2.data?.assistantMessage?.content.slice(0, 200) + '...');

  // 6. Send scheme-specific question: PM-KISAN details
  console.log('\n6. Sending message: "Tell me about PM-KISAN"');
  const m3 = await (await fetch(base + '/api/conversations/' + convId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ message: 'Tell me details of PM-KISAN' })
  })).json();
  console.log('Intent:', m3.data?.structured?.intent);
  console.log('Assistant Response Snippet:\n' + m3.data?.assistantMessage?.content.slice(0, 150) + '...');

  // 7. Send eligibility question
  console.log('\n7. Sending message: "I am a 35 years old farmer. Am I eligible for PM-KISAN?"');
  const m4 = await (await fetch(base + '/api/conversations/' + convId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ message: 'I am a 35 years old farmer. Am I eligible for PM-KISAN?' })
  })).json();
  console.log('Intent:', m4.data?.structured?.intent);
  console.log('Eligibility Status:', m4.data?.structured?.eligibility?.status);
  console.log('Assistant Response Snippet:\n' + m4.data?.assistantMessage?.content.slice(0, 150) + '...');

  // 8. Test Hindi
  console.log('\n8. Creating Hindi conversation and sending: "नमस्ते"');
  const cHi = await (await fetch(base + '/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenB },
    body: JSON.stringify({ language: 'hi', title: 'Hindi Session' })
  })).json();
  const cHiId = cHi.data._id;
  const mHi = await (await fetch(base + '/api/conversations/' + cHiId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenB },
    body: JSON.stringify({ message: 'नमस्ते' })
  })).json();
  console.log('Hindi Assistant Content:', mHi.data?.assistantMessage?.content.slice(0, 80) + '...');

  // 9. Test Telugu
  console.log('\n9. Creating Telugu conversation and sending: "నమస్కారం"');
  const cTe = await (await fetch(base + '/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ language: 'te', title: 'Telugu Session' })
  })).json();
  const cTeId = cTe.data._id;
  const mTe = await (await fetch(base + '/api/conversations/' + cTeId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ message: 'నమస్కారం' })
  })).json();
  console.log('Telugu Assistant Content:', mTe.data?.assistantMessage?.content.slice(0, 80) + '...');

  // 10. Conversation Retrieval & Message persistence
  console.log('\n10. GET /api/conversations/:id (User A)');
  const getC = await fetch(base + '/api/conversations/' + convId, {
    headers: { 'Authorization': 'Bearer ' + tokenA }
  });
  const getCJson = await getC.json();
  console.log('Retrieval Status:', getC.status);
  console.log('Messages retrieved from DB for conversation:', getCJson.data?.messages?.length);
  if (getCJson.data?.messages?.length < 8) { // 4 turns = 8 messages
    throw new Error('Message persistence check failed');
  }

  // 11. Unauthorized access check
  console.log('\n11. Testing user isolation: User B accessing User A conversation');
  const unauth = await fetch(base + '/api/conversations/' + convId, {
    headers: { 'Authorization': 'Bearer ' + tokenB }
  });
  console.log('Unauthorized Access Status:', unauth.status, '(Expected 403)');
  if (unauth.status !== 403) throw new Error('User isolation check failed');

  console.log('\n=== ALL PHASE 3 LIVE HTTP VERIFICATIONS SUCCEEDED ===');
}

verifyLive().catch(err => {
  console.error('Live verification error:', err);
  process.exit(1);
});
