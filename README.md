# JanSahayak (जनसहायक) — AI Citizen Assistance Platform

> **Empowering Indian Citizens to Discover, Verify, and Access Government Welfare Schemes**  
> Multilingual, Deterministic, and LLM-Independent Welfare Guidance in **English**, **हिंदी (Hindi)**, and **తెలుగు (Telugu)**.

---

## 🏛️ Project Overview

**JanSahayak** is a full-stack, production-ready AI citizen assistance platform designed to bridge the gap between Indian government welfare programs and the citizens who need them most. From smallholder farmers and rural artisans to students, women entrepreneurs, and senior citizens, JanSahayak makes welfare discovery transparent, accessible, and completely verifiable.

### Core Pillars

1. **Deterministic Eligibility Engine (Source of Truth)**  
   Welfare eligibility decisions are **never hallucinated**. The backend deterministic rule engine acts as the authoritative source of truth, validating citizen demographics against official government rules (income limits, landholding, age, occupation, gender, state, and category).
2. **AI Service Abstraction with Multilingual Fallback**  
   Designed with an extensible dual-provider AI architecture. In default deployment, it operates with `AI_MODE=fallback` — requiring **zero external LLM API keys** while delivering structured, context-aware responses in English, Hindi, and Telugu.
3. **Authoritative Government Scheme Dataset**  
   Includes a rich, pre-seeded dataset of verified central and state government schemes (PM-KISAN, Ayushman Bharat PM-JAY, PMAY-G, PM Ujjwala Yojana, Atal Pension Yojana, Mudra Yojana, etc.), complete with official `.gov.in` portal links, required document checklists, and application processes.
4. **Citizen & Administrator Portals**  
   - **Citizen Portal**: Search and filter schemes, inspect comprehensive benefit breakdowns, run instant eligibility checks, and engage in real-time conversational assistance.
   - **Admin Portal**: Real-time platform telemetry, user management overview, and full scheme lifecycle controls (create, update rules, activate, or deactivate schemes with immediate public isolation).
5. **Rigorous Security & User Isolation**  
   JWT-based authentication, salted bcrypt password hashing, role-based access control (`user` vs `admin`), and strict cross-user conversation isolation.

---

## 🏗️ Architecture & Technology Stack

```
                          ┌─────────────────────────────────────┐
                          │     Citizen & Admin Web Clients      │
                          │        (React 19 + Vite SPA)        │
                          └──────────────────┬──────────────────┘
                                             │ HTTP / REST
                                             ▼
                          ┌─────────────────────────────────────┐
                          │       JanSahayak Backend API        │
                          │          (Node.js + Express)        │
                          └──────┬───────────┬───────────┬──────┘
                                 │           │           │
         ┌───────────────────────┘           │           └───────────────────────┐
         ▼                                   ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐                 ┌─────────────────┐
│ Authentication  │                 │  Deterministic  │                 │   AI Service    │
│    & Security   │                 │   Eligibility   │                 │   Abstraction   │
│  - JWT Bearer   │                 │     Engine      │                 │ - Multilingual  │
│  - RBAC Guards  │                 │ - Rule Evaluator│                 │ - Fallback AI   │
│  - User Privacy │                 │ - Missing Fields│                 │ - Claude Adapter│
└────────┬────────┘                 └────────┬────────┘                 └────────┬────────┘
         │                                   │                                   │
         └───────────────────────────────────┼───────────────────────────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │     MongoDB + Mongoose    │
                               │  - Users & Profiles       │
                               │  - Government Schemes     │
                               │  - Conversations/Messages │
                               └───────────────────────────┘
```

### Technology Highlights

- **Backend**: Node.js (v18+), Express 4, Mongoose 8, JWT (`jsonwebtoken`), BcryptJS.
- **Frontend**: React 19, Vite, React Router DOM 7, Lucide Icons, Glassmorphic CSS.
- **Database**: MongoDB (v6+), indexed collections with schema-level validation.
- **Testing**: Jest, Supertest, Custom Live End-to-End HTTP verification suites.

---

## 📋 Verified Government Scheme Dataset

JanSahayak includes 10+ verified central and state government welfare schemes:

| Scheme Name | Central/State Department | Category | Key Target Beneficiary |
| :--- | :--- | :--- | :--- |
| **PM-KISAN** | Ministry of Agriculture & Farmers Welfare | Agriculture | Small & Marginal Farmers |
| **Ayushman Bharat (PM-JAY)** | National Health Authority (MoHFW) | Healthcare | Low-income Families (₹5 Lakh cover) |
| **PM Awas Yojana - Gramin** | Ministry of Rural Development | Housing | Rural Homeless / Kutcha House Dwellers |
| **PM Ujjwala Yojana (PMUY)** | Ministry of Petroleum & Natural Gas | Social Welfare | Adult Women in BPL/Poor Households |
| **Atal Pension Yojana (APY)** | PFRDA / Ministry of Finance | Financial Security | Unorganized Sector Workers (18–40 yrs) |
| **Sukanya Samriddhi Yojana** | Ministry of Finance | Women & Child | Girl Children (below 10 yrs) |
| **PM Mudra Yojana (PMMY)** | Ministry of Finance | Entrepreneurship | Micro / Small Enterprises (up to ₹10 Lakh) |
| **Post-Matric Scholarship** | Ministry of Social Justice & Empowerment | Education | SC / ST Students in Higher Education |
| **YSR Rythu Bharosa** | Dept. of Agriculture, Andhra Pradesh | Agriculture | Andhra Pradesh Landowning/Tenant Farmers |
| **YSR Cheyutha** | Dept. of Social Welfare, Andhra Pradesh | Women Empowerment | SC/ST/BC/Minority Women (45–60 yrs) |

---

## ⚡ Deterministic Eligibility Engine

Eligibility is calculated deterministically via `backend/services/eligibilityService.js`. The engine validates the following criteria without probabilistic approximations:

- **Age Constraints**: `minAge` and `maxAge`.
- **Income Ceiling**: `maxAnnualIncome` (tested against household earnings).
- **Occupation & Profile**: `farmer`, `student`, `disability`.
- **Gender & Category**: Specific women welfare initiatives, SC/ST/OBC/Minority reservations.
- **State Scope**: National (`All`) vs. State-specific (e.g. `Andhra Pradesh`).

### Evaluation Outcomes
- `eligible`: All mandatory criteria matched. Provides next steps and official portal link.
- `ineligible`: One or more criteria failed. Returns exact, human-readable rejection reasons.
- `missing_information`: Critical fields omitted. Prompts the citizen for missing profile attributes.

---

## 🌐 Multilingual AI Assistance

JanSahayak provides native conversational assistance in three languages:
- **English** (`en`)
- **हिंदी - Hindi** (`hi`)
- **తెలుగు - Telugu** (`te`)

When running in `AI_MODE=fallback`:
- Generates natural, idiomatically accurate responses using native scripts (Devanagari for Hindi, Telugu script for Telugu).
- Automatically links scheme discoveries, eligibility verdicts, and official application portals.
- Auto-generates concise conversation titles in the user's selected language.

---

## 🔒 Security & Privacy Architecture

- **Stateless Authentication**: Cryptographically signed JSON Web Tokens (JWT) with configurable expiration.
- **Secure Password Storage**: Salted bcrypt hashing with automatic pre-save hooks; plain passwords are never stored.
- **Data Protection**: Safe JSON serialization (`toJSON` hook) guarantees password hashes and internal Mongoose fields (`__v`) are never exposed in any API response.
- **Role-Based Access Control**: Strict `requireAdmin` middleware protects administrative telemetry and scheme mutation endpoints.
- **User Isolation**: Conversation retrieval and message dispatch enforce strict ownership checks; cross-user access attempts return `403 Forbidden`.
- **Zero API Secret Leakage**: Fully operational without external API keys. `.env` files are ignored in version control.

---

## 🚀 Getting Started (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Community Server v6.0+ running locally on port `27017`
- **npm**: v9.0.0 or higher

### 2. Clone & Setup Repository
```bash
git clone <repository-url>
cd JanSahayak
```

### 3. Backend Setup
```bash
cd backend
npm install

# Verify or configure backend/.env
# PORT=5000
# MONGODB_URI=mongodb://127.0.0.1:27017/jansahayak
# JWT_SECRET=jansahayak_secure_dev_secret_key_2026_x89a1b2
# JWT_EXPIRES_IN=7d
# AI_MODE=fallback

# Seed the verified scheme dataset into MongoDB
npm run seed

# Run automated test suites
npm test

# Start backend server
npm start
```
The backend API will be live at `http://localhost:5000/api`.

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install

# Verify frontend/.env
# VITE_API_BASE_URL=http://localhost:5000/api

# Run production build check
npm run build

# Start Vite development server
npm run dev
```
The citizen and admin interface will be available at `http://localhost:5173`.

---

## 🛡️ Creating an Administrator Account

To access the Admin Panel (`/admin`):
1. Register a user through the UI (`http://localhost:5173/register`) or API (`POST /api/auth/register`).
2. Promote the user's role to `'admin'` in MongoDB:
```bash
mongosh jansahayak --eval "db.users.updateOne({ email: 'your-email@example.com' }, { \$set: { role: 'admin' } })"
```
3. Log in with the elevated credentials. The **Admin Panel** link will automatically appear in the navigation bar.

---

## 🧪 Comprehensive Verification & Test Suites

JanSahayak is backed by automated unit, integration, and live end-to-end verification suites.

### Automated Backend Tests (Jest)
```bash
cd backend
npm test
```
- **80 / 80 tests passing** across 5 test suites:
  - `tests/auth.test.js` (17 tests) — Registration, duplicate handling, login, JWT validation, password hashing.
  - `tests/scheme.test.js` (7 tests) — Scheme listing, filters, detail retrieval, active state.
  - `tests/eligibility.test.js` (19 tests) — Deterministic engine, age/income/category/farmer criteria, edge cases.
  - `tests/conversation.test.js` (23 tests) — Multilingual chat, message threading, AI fallback, isolation.
  - `tests/admin.test.js` (14 tests) — Dashboard telemetry, safe user registry, scheme CRUD, authorization guards.

### Frontend Production Build
```bash
cd frontend
npm run build
```
- Transformed 107+ modules with zero errors; outputs optimized production assets.

### Live End-to-End Verification Suites (38-Point Full System Verification)
With the backend server running on port 5000:
```bash
cd backend

# Phase 6 Final Integration & Demo E2E Suite (38 points)
node tests/verify_phase6_final_e2e.js

# Phase 5 Admin E2E Suite (31 points)
node tests/verify_phase5_admin_e2e.js

# Phase 4 Citizen E2E Suite (32 points)
node tests/verify_phase4_e2e.js
```
All **101 live assertions** across all three verification scripts execute and pass against the live API.

---

## 🎬 Live Demo Walkthrough Guide

Follow these steps for a complete, end-to-end evaluation:

1. **Citizen Onboarding & Profile**:
   - Navigate to `http://localhost:5173/register`.
   - Register as a citizen (e.g., *Ramesh Patel*, preferred language: *English*).
   - View the Citizen Dashboard with quick-access cards and recent conversations.
2. **Scheme Discovery & Search**:
   - Navigate to **Schemes**.
   - Search for `kisan` or filter by category `Agriculture`.
   - Click on **PM-KISAN** to view comprehensive details, benefits, required documents, and the official portal link (`pmkisan.gov.in`).
3. **Deterministic Eligibility Check**:
   - On the PM-KISAN details page, test the **Check Eligibility** form:
     - *Age*: 42, *Occupation*: Farmer, *Annual Income*: ₹1,20,000, *State*: Andhra Pradesh $\rightarrow$ Returns **Eligible**.
     - *Age*: 30, *Occupation*: Software Engineer, *Annual Income*: ₹15,00,000 $\rightarrow$ Returns **Ineligible** with deterministic reasons.
4. **Multilingual AI Citizen Chat**:
   - Navigate to **Chat Assistant**.
   - Create a conversation in English: ask *"What schemes are available for farmers?"* $\rightarrow$ instant structured response.
   - Switch language to **Hindi (हिंदी)**: ask *"नमस्ते, किसानों के लिए कौन सी योजनाएं हैं?"* $\rightarrow$ authentic Devanagari guidance.
   - Switch language to **Telugu (తెలుగు)**: ask *"నమస్కారం, రైతులకు ఏ పథకాలు ఉన్నాయి?"* $\rightarrow$ authentic Telugu script guidance.
5. **Administrative Controls**:
   - Log out and log in with your Admin account.
   - Click **Admin Panel** in the top navigation.
   - Inspect platform metrics (Total Schemes, Active Schemes, Inactive Schemes, Users, Conversations).
   - Add a new scheme or deactivate an existing scheme.
   - Confirm that deactivated schemes are instantly hidden from the Citizen Scheme directory, and reactivated schemes re-appear immediately.

---

## 📄 License & Attribution

Developed for Indian citizen empowerment and transparent public service delivery. Built with standard open-source tools and authoritative government data sources.
