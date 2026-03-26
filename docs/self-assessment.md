# Self-Assessment

> [Main Guide](./README.md) | [Validation Guide](./validation.md) | [Evaluation Guide](./evaluation.md) | [Testing Guide](./testing.md) | [Implementation Guide](./implementation.md)

## Overview

This document provides a self-assessment of the implementation submitted for the Coding Workshop, covering what was implemented, known issues, and key learnings.

---

## Implemented Requirements

### 1. Individuals Management ✅
- Full CRUD: create, list, get by ID, update, delete
- Validates required fields: `name`, `location`, `employment_type`
- Validates `employment_type` is one of: `full-time`, `part-time`, `contractor`
- Returns 404 when individual does not exist

### 2. Teams Management ✅
- Full CRUD: create, list, get by ID, update, delete
- Validates `leader_id` references a valid individual
- Validates each `member_id` references a valid individual
- GET responses include resolved `leader` and `members` objects (not just IDs)
- Supports optional `org_id` for organisation grouping

### 3. Achievements Management ✅
- Full CRUD: create, list, get by ID, update, delete
- Validates `team_id` references a valid team
- Validates `month` follows `YYYY-MM` format
- Supports query filters: `?team_id=` and `?month=`
- Supports optional `metrics` field for quantitative data

### 4. Metadata Management ✅
- Full CRUD: create, list, get by ID, update, delete
- Validates `category` is one of: `individual`, `team`, `organization`
- Enforces uniqueness on `category` + `key` combination
- GET list returns metadata grouped by category

### 5. Authentication & RBAC ✅
- JWT-based authentication (HS256)
- PBKDF2-HMAC-SHA256 password hashing with random salt
- Token expiration (8-hour tokens)
- Four roles with permission levels:
  - **Admin**: read, create, update, delete, manage_users
  - **Manager**: read, create, update, delete
  - **Contributor**: read, create, update
  - **Viewer**: read only
- All CRUD endpoints protected by JWT middleware
- Permission checks per HTTP method (GET=read, POST=create, PUT=update, DELETE=delete)

### 6. API Design ✅
- RESTful conventions with correct HTTP methods
- Correct status codes: 200, 201, 204, 400, 401, 403, 404, 405, 500
- Consistent JSON response format
- Consistent error format: `{"error": "..."}` or `{"errors": [...]}`

### 7. Frontend ✅
- Built with React 19 + Vite + Material UI v6
- Pages: Login, Register, Individuals, Teams, Achievements, Metadata
- All pages support full CRUD with forms and validation
- Confirmation dialogs for all delete operations
- Loading spinners during API calls
- Success/error snackbar notifications
- JWT stored in `localStorage`, auto-restored on refresh
- Responsive layout with sidebar navigation

### 8. Deployment ✅
- Backend: 5 AWS Lambda functions deployed via Terraform
- Database: AWS DocumentDB (MongoDB-compatible)
- Frontend: React app deployed to S3, served via CloudFront
- Live URL: **https://d1nhgql6n40xk4.cloudfront.net**

### 9. Testing ✅
- **51 backend tests** passing (pytest)
- Coverage: auth flows, CRUD operations, JWT middleware, RBAC, validation, error handling

---

## Known Issues

| Issue | Impact | Notes |
|-------|--------|-------|
| No frontend unit tests | Medium | Jest/React Testing Library not implemented |
| No E2E tests | Low | Cypress/Selenium not implemented |
| CloudFront cache invalidation delay | Low | New deployments take ~1 min to propagate globally |

---

## What I Learned

- **Serverless architecture**: Building and deploying Lambda functions with Terraform, understanding cold starts and function URL routing through CloudFront
- **JWT authentication from scratch**: Implementing HMAC-SHA256 token signing, PBKDF2 password hashing, and RBAC permission checks without using an auth library
- **CloudFront path routing**: How ordered cache behaviours work and how the full `/api/service/id` path is forwarded to Lambda (requiring correct path parsing at the Lambda level)
- **DocumentDB vs MongoDB**: Connection string differences, TLS requirements, and the `IS_LOCAL` branching pattern
- **React with Material UI**: Building a full CRUD frontend with context-based auth, form validation, and responsive design

---

## Live Application

| Resource | Value |
|----------|-------|
| Frontend URL | https://d1nhgql6n40xk4.cloudfront.net |
| API Base URL | https://d1nhgql6n40xk4.cloudfront.net |
| Auth endpoint | `/api/auth/login` |
| Test credentials | Username: `Mahmoudshheideh` / Role: `admin` |

---

## Navigation Links

<nav aria-label="breadcrumb">
  <ol>
    <li><a href="./README.md">Main Guide</a></li>
    <li><a href="./validation.md">Validation Guide</a></li>
    <li><a href="./evaluation.md">Evaluation Guide</a></li>
    <li><a href="./testing.md">Testing Guide</a></li>
    <li><a href="./implementation.md">Implementation Guide</a></li>
  </ol>
</nav>
