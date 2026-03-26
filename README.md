# Team Tracker

> Built as part of the **AWS Cloud Computing Workshop at Citigroup** — March 2026

Full-stack team management app built on AWS. React frontend, Python Lambda backend, DocumentDB database. Deployed via CloudFront and S3 using Terraform. Features JWT authentication, role-based access control, and full CRUD for individuals, teams, achievements and metadata.

## 🔗 Live App
**https://d1nhgql6n40xk4.cloudfront.net**

---

## ⚡ What It Does

- Manage **individuals** in your organisation (name, location, employment type)
- Manage **teams** with leaders and members
- Record monthly **achievements** per team
- Store reference **metadata** by category
- **Search** and filter across all pages
- **Authentication** with 4 roles: Admin, Manager, Contributor, Viewer

---

## 🏗️ Architecture

```
User Browser
     │
     ▼
Amazon CloudFront  ──────────────────────────────────┐
     │                                               │
     │  /api/*                       /*              │
     ▼                                ▼              │
AWS Lambda (Python)             Amazon S3            │
  ├── auth                    (React Frontend)       │
  ├── individuals                                    │
  ├── teams                                          │
  ├── achievements                                   │
  └── metadata                                       │
     │                                               │
     ▼                                               │
AWS DocumentDB                                       │
(MongoDB-compatible)─────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Material UI, Vite |
| Backend | Python 3.11, AWS Lambda |
| Database | AWS DocumentDB (MongoDB) |
| Infrastructure | Terraform, AWS S3, CloudFront |
| Auth | JWT, PBKDF2 password hashing |

---

## 🔐 Roles & Permissions

| Permission | Viewer | Contributor | Manager | Admin |
|---|---|---|---|---|
| Read | ✅ | ✅ | ✅ | ✅ |
| Create | ❌ | ✅ | ✅ | ✅ |
| Update | ❌ | ✅ | ✅ | ✅ |
| Delete | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |

---

## 📁 Project Structure

```
├── frontend/        # React application
├── backend/         # Python Lambda functions
│   ├── auth/
│   ├── individuals/
│   ├── teams/
│   ├── achievements/
│   └── metadata/
├── infra/           # Terraform infrastructure
└── bin/             # Deploy scripts
```

---

## 🚀 Deployment

```bash
# Deploy backend
./bin/deploy-backend.sh aws

# Deploy frontend
./bin/deploy-frontend.sh aws
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get JWT token |
| GET | /api/individuals | List all individuals |
| POST | /api/individuals | Create individual |
| PUT | /api/individuals/{id} | Update individual |
| DELETE | /api/individuals/{id} | Delete individual |
| GET | /api/teams | List all teams |
| POST | /api/teams | Create team |
| PUT | /api/teams/{id} | Update team / manage members |
| DELETE | /api/teams/{id} | Delete team |
| GET | /api/achievements | List achievements |
| POST | /api/achievements | Record achievement |
| PUT | /api/achievements/{id} | Update achievement |
| DELETE | /api/achievements/{id} | Delete achievement |
| GET | /api/metadata | List all metadata |
| POST | /api/metadata | Create metadata entry |
| PUT | /api/metadata/{id} | Update metadata entry |
| DELETE | /api/metadata/{id} | Delete metadata entry |

---

# Coding Workshop

The goal of this coding workshop is to enable and assess the hands-on skills
of participants through development of a practical technical solution that
solves a theoretical business problem.

## Getting Started

Navigate to [Coding Workshop - Main Guide](./docs/README.md) to get started.

## Coding Workshop Example

Coding workshop organizer(s) will provide instructions to follow by email. Here
below is a real example of requirements and expectations for participant(s):

### Requirements: Business Problem

Our company ACME Inc. is going through a massive organizational transformation
to become a more data-driven organization. Information about teams structure
and performance is currently scattered across multiple systems, making it
difficult to get a comprehensive view of team dynamics and achievements.

We are struggling to answer simple questions like:

* Who are the members of each team?
* Where are the teams located?
* What are the key achievements of each team on a monthly basis?
* How many teams have team leader not co-located with team members?
* How many teams have team leader as a non-direct staff?
* How many teams have non-direct staff to employees ratio above 20%?
* How many teams are reporting to an organization leader?

### Requirements: Technical Solution

As part of this transformation, we are looking to build a centralized team
management tool that will allow us to track team members, team locations,
monthly team achievements, as well as individual-level and team-level metadata.
Initial focus is to provide a self-service capability without any integrations
with other tools such as Employee Directory, Project Tracking, or Performance
Management.

The technical solution involves developing a stand-alone web application using
modern technologies. The application will have the following features:

* User authentication and authorization
* Role-based access control
* CRUD operations for individuals, teams, achievements and metadata
* Search and filter functionality
* Responsive design for mobile and desktop usage

### Requirements: Technology Stack

The following technologies will be used to build the application:

* Frontend: HTML, CSS, React.js with React Responsive and Material UI Components
* Backend: Python
* Database: MongoDB / DocumentDB
* Infrastructure: Terraform
* Version Control: Git, GitHub
* Deployment Mode: Shell Scripts
* Deployment Target: AWS Serverless (e.g., S3, CloudFront, Lambda, DocumentDB)

### Expectations: Value-Based Outcomes

By the end of the workshop, participants will have developed a functional
web application that meets the requirements outlined above. The application
will be deployed to a cloud environment and accessible via a web browser.
Participants will also gain hands-on experience with modern web development
technologies and best practices.

## Contributing

See the [CONTRIBUTING](./CONTRIBUTING.md) resource for more details.

## License

This library is licensed under the MIT-0 License.
See the [LICENSE](./LICENSE) resource for more details.

## Roadmap

See the
[open issues](https://github.com/eistrati/coding-workshop-participant/issues)
for a list of proposed roadmap features (and known issues).

## Security

See the
[Security Issue Notifications](./CONTRIBUTING.md#security-issue-notifications)
resource for more details.

## Authors

The following people have contributed to this workshop:

* Colin Heilman - [@heilmancs](https://github.com/heilmancs)
* Eugene Istrati - [@eistrati](https://github.com/eistrati)
* Isaiah Cornelius Smith - [@corneliusmith](https://github.com/corneliusmith)
* Juan Arevalo - [@jparevalo27](https://github.com/jparevalo27)
* Michael Annucci - [@michael-annucci](https://github.com/michael-annucci)

## Feedback

We'd love to hear your feedback! Please:

* ⭐ Star the repository if you find it helpful
* 🐛 Report issues on GitHub
* 💡 Suggest improvements
* 📝 Share your experience
