# Coding Workshop - Backend Code

## Overview

This folder contains Python backend services for CRUD operations on Individuals, Teams, Achievements, and Metadata.

## Prerequisites

- Python - Backend language
- Boto3 - AWS SDK for Python
- AWS Lambda - Serverless compute
- Amazon DocumentDB - MongoDB-compatible database

Predefined environment variables are injected into each backend service automatically, simplifying the need to manage them manually:

| Variable | Description | Local | Cloud |
|----------|-------------|-------|-------|
| `MONGO_HOST` | Mongo database hostname | `host.docker.internal` | AWS DocumentDB endpoint |
| `MONGO_PORT` | Mongo database port | `27017` | `27017` |
| `MONGO_NAME` | Mongo database name | *(not injected)* | *(not injected)* |
| `MONGO_USER` | Mongo database username | *(empty — no auth locally)* | AWS DocumentDB username |
| `MONGO_PASS` | Mongo database password | *(empty — no auth locally)* | AWS DocumentDB password |
| `IS_LOCAL` | Indicates local vs cloud environment | `true` | `false` |

> **Connection behavior:** When `IS_LOCAL` is `true`, the connection uses no TLS even if credentials are present (local MongoDB requires auth but not TLS). When `IS_LOCAL` is `false`, TLS is required for DocumentDB.

## Structure

The backend is organized into Lambda functions, one for each CRUD service:

```
coding-workshop-participant/
├── backend/               # Python backend
│   ├── auth/                # Authentication service (register, login, me)
│   │   ├── function.py        # JWT auth, PBKDF2 password hashing, RBAC
│   │   └── requirements.txt   # Python dependencies
│   ├── achievements/        # CRUD service for achievements
│   │   ├── function.py        # Business logic with team validation
│   │   └── requirements.txt   # Python dependencies
│   ├── individuals/         # CRUD service for individuals
│   │   ├── function.py        # Business logic with employment type validation
│   │   └── requirements.txt   # Python dependencies
│   ├── metadata/            # CRUD service for metadata
│   │   ├── function.py        # Business logic with category/key uniqueness
│   │   └── requirements.txt   # Python dependencies
│   ├── teams/               # CRUD service for teams
│   │   ├── function.py        # Business logic with leader/member validation
│   │   └── requirements.txt   # Python dependencies
│   └── tests/               # Backend test suite
│       └── test_handlers.py   # 51 unit and integration tests
```

## API Endpoints

All endpoints require a `Bearer` token in the `Authorization` header (except `/api/auth/register` and `/api/auth/login`).

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT token |
| GET | `/api/auth/me` | Get current user info |

### Individuals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/individuals` | Create new individual |
| GET | `/api/individuals` | List all individuals |
| GET | `/api/individuals/{id}` | Get individual by ID |
| PUT | `/api/individuals/{id}` | Update individual |
| DELETE | `/api/individuals/{id}` | Delete individual |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams` | Create new team |
| GET | `/api/teams` | List all teams (includes leader and member objects) |
| GET | `/api/teams/{id}` | Get team by ID |
| PUT | `/api/teams/{id}` | Update team |
| DELETE | `/api/teams/{id}` | Delete team |

### Achievements

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/achievements` | Create new achievement |
| GET | `/api/achievements` | List achievements (supports `?team_id=` and `?month=` filters) |
| GET | `/api/achievements/{id}` | Get achievement by ID |
| PUT | `/api/achievements/{id}` | Update achievement |
| DELETE | `/api/achievements/{id}` | Delete achievement |

### Metadata

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/metadata` | Create new metadata entry |
| GET | `/api/metadata` | List all metadata (grouped by category) |
| GET | `/api/metadata/{id}` | Get metadata by ID |
| PUT | `/api/metadata/{id}` | Update metadata entry |
| DELETE | `/api/metadata/{id}` | Delete metadata entry |

## Usage

### Local Development

To run your application locally:

```sh
./bin/start-dev.sh
```

### Cloud Deployment

To deploy your backend to AWS:

```sh
./bin/deploy-backend.sh
```

To test your newly deployed code:

```sh
# Login and get token
TOKEN=$(curl -s -X POST https://{API_BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}' | jq -r '.token')

# Example: Get all individuals
curl -X GET https://{API_BASE_URL}/api/individuals \
  -H "Authorization: Bearer $TOKEN"
```

### Running Tests

```sh
python3 -m pytest backend/tests/ -v
```

## Clean Up

To remove all deployed resources (including backend):

```sh
./bin/clean-up.sh
```

This will remove all AWS resources such as Lambda functions, CloudFront distributions, and much more.

**Warning**: This removes all infra resources. Cannot be undone.
