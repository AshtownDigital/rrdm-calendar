# BCR Module View Testing Plan

This document outlines a comprehensive test plan for the BCR (Business Change Request) module views in the RRDM application.

## Prerequisites
- RRDM application running on http://localhost:4000
- Database seeded with BCR data
- Admin user account available (prod@email.com / password1254)

## Test Cases

### 1. BCR List View (`/bcr`)

#### Test 1.1: Access BCR List
- **Steps**:
  1. Log in as admin user
  2. Navigate to BCR module
- **Expected Result**: 
  - BCR list page loads successfully
  - Seeded BCRs are displayed in a table format
  - Table includes columns for BCR number, title, status, priority, etc.

#### Test 1.2: Sorting and Filtering
- **Steps**:
  1. Click on column headers to sort
  2. Use filter controls if available
- **Expected Result**:
  - BCRs are sorted correctly when clicking column headers
  - Filtering narrows down the displayed BCRs appropriately

#### Test 1.3: Pagination
- **Steps**:
  1. Navigate through pages if there are multiple pages of BCRs
- **Expected Result**:
  - Pagination controls work correctly
  - Different BCRs are displayed on different pages

### 2. BCR Detail View (`/bcr/:id`)

#### Test 2.1: View BCR Details
- **Steps**:
  1. From the BCR list, click on a BCR to view details
- **Expected Result**:
  - BCR detail page loads successfully
  - All BCR fields are displayed correctly (number, title, description, status, priority, impact, dates, notes, etc.)

#### Test 2.2: Navigate Back to List
- **Steps**:
  1. Click on "Back to List" or similar button
- **Expected Result**:
  - User is redirected back to the BCR list view

### 3. BCR Creation Form (`/bcr/submit`)

#### Test 3.1: Access Creation Form
- **Steps**:
  1. From the BCR list, click on "Create New BCR" or similar button
- **Expected Result**:
  - BCR creation form loads successfully
  - All required fields are present (title, description, priority, impact areas, etc.)

#### Test 3.2: Form Validation
- **Steps**:
  1. Submit the form without filling required fields
- **Expected Result**:
  - Form validation errors are displayed
  - Form is not submitted

#### Test 3.3: Create New BCR
- **Steps**:
  1. Fill in all required fields
  2. Submit the form
- **Expected Result**:
  - New BCR is created successfully
  - User is redirected to the BCR detail view or list view
  - Success message is displayed

### 4. BCR Edit Form (`/bcr/edit/:id`)

#### Test 4.1: Access Edit Form
- **Steps**:
  1. From the BCR detail view, click on "Edit" or similar button
- **Expected Result**:
  - BCR edit form loads successfully
  - Form is pre-populated with the BCR's current values

#### Test 4.2: Form Validation
- **Steps**:
  1. Clear required fields
  2. Submit the form
- **Expected Result**:
  - Form validation errors are displayed
  - Form is not submitted

#### Test 4.3: Update BCR
- **Steps**:
  1. Modify some fields
  2. Submit the form
- **Expected Result**:
  - BCR is updated successfully
  - User is redirected to the BCR detail view or list view
  - Success message is displayed
  - Changes are reflected in the BCR detail view

### 5. BCR Status Update

#### Test 5.1: Change BCR Status
- **Steps**:
  1. From the BCR detail view, use status change controls if available
  2. Change the status (e.g., from "Draft" to "Submitted")
- **Expected Result**:
  - Status is updated successfully
  - Status change is reflected in the UI
  - Status history is updated if applicable

## Test Execution Checklist

- [ ] Test 1.1: Access BCR List
- [ ] Test 1.2: Sorting and Filtering
- [ ] Test 1.3: Pagination
- [ ] Test 2.1: View BCR Details
- [ ] Test 2.2: Navigate Back to List
- [ ] Test 3.1: Access Creation Form
- [ ] Test 3.2: Form Validation
- [ ] Test 3.3: Create New BCR
- [ ] Test 4.1: Access Edit Form
- [ ] Test 4.2: Form Validation
- [ ] Test 4.3: Update BCR
- [ ] Test 5.1: Change BCR Status

## Issues and Observations

| Test ID | Status | Issue Description | Severity |
|---------|--------|-------------------|----------|
|         |        |                   |          |
|         |        |                   |          |
|         |        |                   |          |

## Conclusion

[To be filled after testing is complete]
