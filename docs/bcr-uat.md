# Business Change Request (BCR) Module - User Acceptance Testing

## Overview

This document outlines the User Acceptance Testing (UAT) procedures for the Business Change Request (BCR) module in the RRDM application. The tests cover all CRUD operations, workflows, and user interface elements to ensure the module functions correctly and meets business requirements.

## Prerequisites

- RRDM application running on http://localhost:4000
- Database seeded with BCR data
- Admin user account available (prod@email.com / password1254)
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Test Environment

- **Application URL**: http://localhost:4000
- **Database**: Neon PostgreSQL
- **Test Date**: May 8, 2025
- **Tester**: [Tester Name]

## Test Scenarios

### 1. Authentication and Access Control

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 1.1 | Access BCR module without authentication | 1. Open browser<br>2. Navigate to http://localhost:4000/bcr | User is redirected to login page | | |
| 1.2 | Login with valid credentials | 1. Enter email: prod@email.com<br>2. Enter password: password1254<br>3. Click Login | User is logged in and redirected to dashboard | | |
| 1.3 | Access BCR module after authentication | 1. Login<br>2. Navigate to http://localhost:4000/bcr | BCR module main page is displayed | | |

### 2. BCR List View

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 2.1 | View BCR list | 1. Navigate to http://localhost:4000/bcr | List of BCRs is displayed in a table with columns for BCR number, title, status, priority, etc. | | |
| 2.2 | Sort BCRs by column | 1. Click on column headers (e.g., BCR Number, Title, Status) | BCRs are sorted by the selected column | | |
| 2.3 | Filter BCRs by status | 1. Use status filter dropdown<br>2. Select a status (e.g., Draft) | Only BCRs with the selected status are displayed | | |
| 2.4 | Filter BCRs by priority | 1. Use priority filter dropdown<br>2. Select a priority (e.g., High) | Only BCRs with the selected priority are displayed | | |
| 2.5 | Search BCRs by title/description | 1. Enter search term in search box<br>2. Press Enter or click Search | Only BCRs matching the search term are displayed | | |
| 2.6 | Pagination | 1. Navigate to BCR list with more than 10 BCRs<br>2. Click on pagination controls | Different pages of BCRs are displayed | | |

### 3. BCR Creation

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 3.1 | Access BCR creation form | 1. Navigate to BCR list<br>2. Click "Create New BCR" button | BCR creation form is displayed | | |
| 3.2 | Submit form without required fields | 1. Leave title field empty<br>2. Click Submit | Form validation error is displayed for the title field | | |
| 3.3 | Create BCR with minimum required fields | 1. Enter title: "Test BCR"<br>2. Select priority: Medium<br>3. Click Submit | BCR is created successfully<br>User is redirected to BCR detail view<br>Success message is displayed | | |
| 3.4 | Create BCR with all fields | 1. Enter title: "Complete Test BCR"<br>2. Enter description: "This is a test BCR with all fields filled"<br>3. Select priority: High<br>4. Select impact areas: Security, Infrastructure<br>5. Enter notes: "Initial test notes"<br>6. Select target date: [future date]<br>7. Click Submit | BCR is created successfully with all provided information<br>User is redirected to BCR detail view<br>Success message is displayed | | |
| 3.5 | Verify BCR number generation | 1. Create a new BCR<br>2. View the created BCR | BCR has a unique number in the format BCR-YYYY-NNNN | | |

### 4. BCR Detail View

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 4.1 | View BCR details | 1. From BCR list, click on a BCR title or number | BCR detail view is displayed with all BCR information | | |
| 4.2 | Verify all fields are displayed | 1. View a BCR with all fields populated | All fields are displayed correctly:<br>- BCR number and title<br>- Description<br>- Status and priority<br>- Impact areas<br>- Requested by and assigned to<br>- Target and implementation dates<br>- Notes and history | | |
| 4.3 | Navigate back to list | 1. From BCR detail view<br>2. Click "Back to List" button | User is redirected to the BCR list view | | |

### 5. BCR Editing

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 5.1 | Access BCR edit form | 1. From BCR detail view<br>2. Click "Edit" button | BCR edit form is displayed with pre-populated fields | | |
| 5.2 | Submit edit form without required fields | 1. Clear the title field<br>2. Click Submit | Form validation error is displayed for the title field | | |
| 5.3 | Update BCR basic information | 1. Modify title: add "(Updated)" suffix<br>2. Modify description: add additional text<br>3. Click Submit | BCR is updated successfully<br>User is redirected to BCR detail view<br>Success message is displayed<br>Changes are reflected in the detail view | | |
| 5.4 | Update BCR status | 1. From edit form<br>2. Change status (e.g., from Draft to Submitted)<br>3. Click Submit | BCR status is updated successfully<br>Status change is reflected in the detail view | | |
| 5.5 | Update BCR assignee | 1. From edit form<br>2. Select a different assignee<br>3. Click Submit | BCR assignee is updated successfully<br>New assignee is reflected in the detail view | | |
| 5.6 | Add notes to BCR | 1. From edit form<br>2. Add new notes<br>3. Click Submit | Notes are added to the BCR<br>New notes are displayed in the detail view | | |

### 6. BCR Status Workflow

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 6.1 | Status transition: Draft to Submitted | 1. Edit a BCR with Draft status<br>2. Change status to Submitted<br>3. Click Submit | Status is updated to Submitted<br>Status history is updated | | |
| 6.2 | Status transition: Submitted to Under Review | 1. Edit a BCR with Submitted status<br>2. Change status to Under Review<br>3. Click Submit | Status is updated to Under Review<br>Status history is updated | | |
| 6.3 | Status transition: Under Review to Approved | 1. Edit a BCR with Under Review status<br>2. Change status to Approved<br>3. Click Submit | Status is updated to Approved<br>Status history is updated | | |
| 6.4 | Status transition: Approved to Implemented | 1. Edit a BCR with Approved status<br>2. Change status to Implemented<br>3. Enter implementation date<br>4. Click Submit | Status is updated to Implemented<br>Implementation date is saved<br>Status history is updated | | |
| 6.5 | Status transition: Under Review to Rejected | 1. Edit a BCR with Under Review status<br>2. Change status to Rejected<br>3. Add rejection reason in notes<br>4. Click Submit | Status is updated to Rejected<br>Rejection notes are saved<br>Status history is updated | | |

### 7. BCR Deletion (if applicable)

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 7.1 | Delete BCR | 1. From BCR detail view<br>2. Click "Delete" button<br>3. Confirm deletion | BCR is deleted successfully<br>User is redirected to BCR list<br>Success message is displayed<br>Deleted BCR no longer appears in the list | | |
| 7.2 | Cancel BCR deletion | 1. From BCR detail view<br>2. Click "Delete" button<br>3. Cancel deletion | BCR is not deleted<br>User remains on the BCR detail view | | |

### 8. BCR Configuration Management

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 8.1 | View status configurations | 1. Navigate to BCR workflow management<br>2. View status configurations | List of status configurations is displayed | | |
| 8.2 | View impact area configurations | 1. Navigate to BCR workflow management<br>2. View impact area configurations | List of impact area configurations is displayed | | |

### 9. Mobile Responsiveness

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 9.1 | View BCR list on mobile device | 1. Access BCR list on mobile device or using responsive design mode | BCR list is displayed correctly and is usable on small screens | | |
| 9.2 | Create BCR on mobile device | 1. Access BCR creation form on mobile device<br>2. Complete and submit the form | Form is usable on small screens<br>BCR is created successfully | | |
| 9.3 | View and edit BCR on mobile device | 1. Access BCR detail and edit views on mobile device | Views are displayed correctly and are usable on small screens | | |

### 10. Edge Cases and Error Handling

| ID | Test Case | Steps | Expected Result | Status | Notes |
|----|-----------|-------|-----------------|--------|-------|
| 10.1 | Access non-existent BCR | 1. Navigate to http://localhost:4000/bcr/non-existent-id | 404 Not Found page is displayed with appropriate error message | | |
| 10.2 | Create BCR with very long title | 1. Create BCR with title exceeding 255 characters | Form validation error is displayed for the title field | | |
| 10.3 | Create BCR with special characters | 1. Create BCR with title containing special characters | BCR is created successfully<br>Special characters are handled correctly | | |
| 10.4 | Session timeout | 1. Login<br>2. Wait for session to timeout<br>3. Try to create or edit a BCR | User is redirected to login page<br>After login, user can continue with the operation | | |

## Test Execution

### Test Results Summary

| Category | Total Tests | Passed | Failed | Not Tested |
|----------|-------------|--------|--------|------------|
| Authentication and Access Control | 3 | | | |
| BCR List View | 6 | | | |
| BCR Creation | 5 | | | |
| BCR Detail View | 3 | | | |
| BCR Editing | 6 | | | |
| BCR Status Workflow | 5 | | | |
| BCR Deletion | 2 | | | |
| BCR Configuration Management | 2 | | | |
| Mobile Responsiveness | 3 | | | |
| Edge Cases and Error Handling | 4 | | | |
| **Total** | **39** | | | |

### Failed Tests

| ID | Test Case | Issue Description | Severity | Recommended Fix |
|----|-----------|-------------------|----------|-----------------|
| | | | | |

## Conclusion

[To be filled after testing is complete]

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Product Owner | | | |
| Developer | | | |
