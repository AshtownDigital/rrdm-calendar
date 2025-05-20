
# Step-by-Step Implementation Guide for BCR Management Application

This document provides a complete step-by-step guide for implementing the BCR Management Application using GOV.UK Frontend and Trello integration.

---

## Prerequisites

- Node.js (v16+)
- Express.js framework
- GOV.UK Frontend (via Nunjucks or HTML templates)
- MongoDB or PostgreSQL for data storage
- Puppeteer (for PDF generation)
- Trello API Key and Token
- GOV.UK Design System styles

---

## Step 1: Set Up Project Structure

```bash
mkdir bcr-management
cd bcr-management
npm init -y
npm install express nunjucks dotenv body-parser mongoose puppeteer axios
```

Set up folders:

```bash
mkdir routes views public controllers models config services
```

---

## Step 2: Configure GOV.UK Frontend

Install frontend assets:

```bash
npm install govuk-frontend
```

In `app.js`, configure Nunjucks and GOV.UK frontend:

```js
const express = require('express');
const app = express();
const nunjucks = require('nunjucks');
const path = require('path');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

app.set('view engine', 'njk');
```

---

## Step 3: Create BCR Submission Form

Use GOV.UK components:

- `govukInput` for title and contact details
- `govukTextarea` for justification and description
- `govukCheckboxes` for impact areas
- `govukRadios` for urgency and policy/funding linkage
- `govukFileUpload` for attachments

Create the form in `views/bcr/submit.njk`.

---

## Step 4: Save Submission to Database

Define a BCR schema using Mongoose (`models/Bcr.js`):

```js
const mongoose = require('mongoose');
const BcrSchema = new mongoose.Schema({
  referenceId: String,
  title: String,
  description: String,
  justification: String,
  submitter: String,
  urgency: String,
  impactAreas: [String],
  status: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Bcr', BcrSchema);
```

---

## Step 5: Generate BCR Reference ID

In the POST handler:

```js
const count = await Bcr.countDocuments();
const referenceId = `BCR-2025-${String(count + 1).padStart(4, '0')}`;
```

---

## Step 6: Create Trello Card

Use Axios to POST to Trello API in `services/trelloService.js`:

```js
const axios = require('axios');

async function createCard(title, description) {
  const res = await axios.post('https://api.trello.com/1/cards', {
    name: title,
    desc: description,
    idList: process.env.TRELLO_LIST_ID,
    key: process.env.TRELLO_KEY,
    token: process.env.TRELLO_TOKEN
  });
  return res.data;
}
```

Call this after saving the BCR submission.

---

## Step 7: Build Submission List View

In `views/bcr/list.njk`, use:

- `govukTable` to list BCRs
- `govukTag` to show status
- Search field and filters using `govukInput` and `govukRadios`

Load data via controller and pass to template.

---

## Step 8: Create BCR Detail Page

- Use `govukSummaryList` to show submission details
- Use `govukTabs` or `govukTimeline` to show phase history
- Use `govukTextarea` for reviewer notes
- Add action buttons (`govukButton`) to transition phases

---

## Step 9: Enable Phase Transitions

Create a route to handle status updates (`/bcr/:id/update-phase`).

Each transition should:
- Update BCR status
- Update Trello card list (move via Trello API)
- Add optional comments

---

## Step 10: Generate PDF with Puppeteer

Install Puppeteer and create a function in `services/pdfService.js`:

```js
const puppeteer = require('puppeteer');

async function generatePdf(url, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outputPath, format: 'A4' });
  await browser.close();
}
```

Call this from the BCR detail page.

---

## Step 11: Add Reviewer SLA Timer

Track the time between:
- Submission → Reviewer Assignment
- Assignment → Decision

Display SLA status with colours:
- ✅ Green = Under SLA
- ⚠️ Amber = Near deadline
- ❌ Red = Overdue

Use `govukTag` with custom styles.

---

## Step 12: Reporting & Exports

- Implement CSV export using `json2csv`
- Show SLA dashboards with counts per status
- Include post-implementation feedback analytics

---

## Step 13: Testing & Deployment

- Test form submission, validations, and Trello sync
- Validate PDF output for completeness
- Ensure GOV.UK accessibility rules (WCAG 2.1 AA)
- Deploy using Heroku, Render, or GOV.UK PaaS

---

## Optional Enhancements

- Slack integration for phase updates
- Markdown support in BCR descriptions
- Auto-archive closed BCRs

---

## Summary

You now have a fully GOV.UK-compliant, Trello-integrated BCR workflow management application with:

- Full audit trail
- Phase-by-phase tracking
- SLA monitoring
- PDF exports for governance and compliance
