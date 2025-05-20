
# BCR System – Application Overview and Implementation Guide

This document provides a complete overview of the BCR (Business Change Request) system along with implementation guidance. It covers the system's purpose, architecture, technology stack, features, folder structure, and setup.

---

## 1. Purpose

The BCR system manages the lifecycle of internal and external change requests. It enables structured submission, review, tracking, approval, implementation, and release across 14 workflow phases.

---

## 2. Key Features

- Public submission form with validation
- Unique submission and BCR codes (e.g., SUB-24/25-001)
- Soft and hard deletion with audit logic
- 14-phase workflow with logs and status tracking
- Internal dashboard for phase updates
- Reference data management (Impacted Areas)
- GOV.UK-styled views and UX
- Modular architecture for maintainability

---

## 3. Technology Stack

- **Backend:** Node.js (v18+), Express.js
- **Database:** PostgreSQL, Prisma ORM
- **Frontend:** Nunjucks templates, GOV.UK Frontend
- **Testing:** Jest, Supertest
- **Security:** Helmet, CSRF protection, input validation
- **Workflow:** Custom logic with history tracking

---

## 4. Folder Structure

Refer to [BCR_Folder_Structure_Requirements.md](./BCR_Folder_Structure_Requirements.md) for full layout.

Key folders:

- `/controllers`: Modular controllers per feature
- `/models`: Schema logic and structure
- `/routes`: RESTful routing per feature
- `/views`: GOV.UK compliant Nunjucks templates
- `/helpers`: Utility functions
- `/middleware`: CSRF and validation logic

---

## 5. Models

Each major domain (submission, BCR, impacted areas) has its own model. Models include `recordNumber`, `createdAt`, and `updatedAt` fields. Submissions and BCRs also use uniquely formatted codes.

- See: [BCR_Model_Requirements.md](./BCR_Model_Requirements.md)

---

## 6. Controllers

Controllers are organized by module and follow RESTful structure. They support actions like creating records, updating phases, deleting entries, and viewing logs.

- See: [BCR_Controller_Requirements.md](./BCR_Controller_Requirements.md)

---

## 7. Routes

Each feature exposes its own route group, integrated into `/routes/index.js`. Routes handle both display and data mutation (GET/POST).

- See: [BCR_Route_Requirements.md](./BCR_Route_Requirements.md)

---

## 8. Views

All views follow GOV.UK design standards and are separated by feature. Each feature includes `confirm.njk` and `warning.njk` for feedback.

- See: [BCR_View_Requirements.md](./BCR_View_Requirements.md)

---

## 9. Testing

Includes unit, integration, and view rendering tests using Jest and Supertest. Coverage is enforced for controllers, routes, and helpers.

- See: [BCR_Test_Requirements.md](./BCR_Test_Requirements.md)

---

## 10. Setup and Deployment

### Local Development

```bash
npm install
npx prisma migrate dev
npm run dev
```

### Environment Variables

Create a `.env` file with:

```
DATABASE_URL=postgres://...
SESSION_SECRET=...
```

### Deployment

Use platforms like Vercel or Heroku. Configure PostgreSQL and environment variables accordingly.

---

## 11. Code Standards

- All enums are stored centrally in `/config/constants.js`
- Soft deletes use `deletedAt` for submissions
- Logs use structured `workflowHistory`
- Timestamps and record numbers are automated

---

This guide gives developers and stakeholders a complete understanding of the BCR system's capabilities and structure.
