# BCR Module UAT Test Scenarios

This document outlines User Acceptance Testing (UAT) scenarios for the Business Change Request (BCR) module, covering all CRUD (Create, Read, Update, Delete) operations and related functionality.

## Prerequisites

- RRDM application is running
- Test user accounts are available:
  - Regular user: `user@example.com` / `password123`
  - Admin user: `admin@example.com` / `password123`
  - Production admin: `prod@email.com` / `password1254`

## Test Scenarios

### 1. Authentication & Access Control

#### Scenario 1.1: Login Access
1. Navigate to the login page
2. Enter valid credentials
3. Verify successful login and redirection to dashboard
4. **Expected Result**: User is logged in and can access the dashboard

#### Scenario 1.2: BCR Module Access
1. Login as a regular user
2. Navigate to the BCR module
3. **Expected Result**: BCR module is accessible and displays the main BCR management page

### 2. Create BCR (C in CRUD)

#### Scenario 2.1: Access BCR Submission Form
1. Login as a regular user
2. Navigate to BCR module
3. Click "Submit New BCR" button
4. **Expected Result**: BCR submission form is displayed

#### Scenario 2.2: Submit BCR with Valid Data
1. Access the BCR submission form
2. Fill in all required fields:
   - Title: "Test BCR Creation"
   - Description: "This is a test BCR for UAT"
   - Priority: "Medium"
   - Impact Areas: Select at least one impact area
3. Click "Submit" button
4. **Expected Result**: 
   - BCR is created successfully
   - User is redirected to confirmation page
   - New BCR appears in the BCR list with status "draft"

#### Scenario 2.3: Submit BCR with Missing Required Fields
1. Access the BCR submission form
2. Leave the Title field empty
3. Fill in other fields
4. Click "Submit" button
5. **Expected Result**: 
   - Form submission fails
   - Error message indicates title is required
   - Form data is preserved

### 3. Read BCR (R in CRUD)

#### Scenario 3.1: View BCR List
1. Login as a regular user
2. Navigate to BCR module > Submissions
3. **Expected Result**: 
   - List of BCRs is displayed
   - List includes BCR number, title, status, and submission date

#### Scenario 3.2: Filter BCR List
1. Navigate to BCR submissions list
2. Use filter controls to filter by:
   - Status: "draft"
   - Impact Area: Select an available impact area
   - Date Range: Set a date range that includes recent submissions
3. Click "Apply Filters" button
4. **Expected Result**: List displays only BCRs matching the filter criteria

#### Scenario 3.3: View BCR Details
1. Navigate to BCR submissions list
2. Click on a BCR title or "View" button
3. **Expected Result**: 
   - BCR details page displays
   - All BCR information is correctly shown
   - No "prisma is not defined" or other errors appear

### 4. Update BCR (U in CRUD)

#### Scenario 4.1: Access BCR Edit Form
1. Navigate to a BCR details page
2. Click "Edit" button
3. **Expected Result**: Edit form loads with current BCR data pre-populated

#### Scenario 4.2: Update BCR with Valid Data
1. Access the BCR edit form for an existing BCR
2. Modify the following fields:
   - Title: Add "- Updated" to the existing title
   - Description: Modify the description text
   - Priority: Change to a different priority
   - Impact Areas: Add or remove an impact area
3. Click "Save Changes" button
4. **Expected Result**: 
   - BCR is updated successfully
   - User is redirected to confirmation page
   - BCR details page shows the updated information

#### Scenario 4.3: Update BCR Status
1. Navigate to a BCR details page
2. Select a new status from the status dropdown
3. Add a comment explaining the status change
4. Click "Update Status" button
5. **Expected Result**: 
   - BCR status is updated
   - Comment is added to the BCR notes
   - Status history is updated

### 5. Delete BCR (D in CRUD)

#### Scenario 5.1: Delete BCR (Admin Only)
1. Login as an admin user
2. Navigate to a BCR details page
3. Click "Delete" button
4. Confirm deletion in the confirmation dialog
5. **Expected Result**: 
   - BCR is deleted
   - User is redirected to BCR list
   - Deleted BCR no longer appears in the list

### 6. BCR Workflow

#### Scenario 6.1: BCR Lifecycle
1. Create a new BCR (status: draft)
2. Update status to "submitted"
3. Update status to "in-progress"
4. Update status to "approved"
5. Update status to "completed"
6. **Expected Result**: BCR progresses through each status correctly with appropriate timestamps and user information

#### Scenario 6.2: BCR Assignment
1. Navigate to a BCR details page
2. Assign the BCR to another user
3. Add a comment about the assignment
4. **Expected Result**: 
   - BCR is assigned to the selected user
   - Assignment is recorded in the BCR notes
   - Assigned user can see the BCR in their assigned items

### 7. Edge Cases and Error Handling

#### Scenario 7.1: Concurrent Editing
1. Open the same BCR for editing in two different browser tabs
2. Make different changes in each tab
3. Submit changes from both tabs (one after another)
4. **Expected Result**: 
   - The second submission should not overwrite all changes from the first
   - No database errors should occur

#### Scenario 7.2: Large Data Handling
1. Create a BCR with a very long description (5000+ characters)
2. Submit the BCR
3. View the BCR details
4. **Expected Result**: 
   - BCR is created successfully
   - Long description is stored and displayed correctly
   - No truncation or display issues occur

#### Scenario 7.3: Special Characters
1. Create a BCR with special characters in the title and description (e.g., ñ, é, ü, ß, 你好, &#x1F600;)
2. Submit the BCR
3. View the BCR details
4. **Expected Result**: 
   - BCR is created successfully
   - Special characters are stored and displayed correctly

### 8. Performance and Usability

#### Scenario 8.1: BCR List Performance
1. Navigate to the BCR list with 50+ BCRs
2. Apply various filters
3. **Expected Result**: 
   - List loads within 3 seconds
   - Filtering operations complete within 2 seconds
   - No UI freezing or lag

#### Scenario 8.2: Mobile Responsiveness
1. Access the BCR module on a mobile device or using browser device emulation
2. Navigate through the BCR list, details, and forms
3. **Expected Result**: 
   - All pages display correctly on mobile
   - Forms are usable on small screens
   - No horizontal scrolling is required for main content

## Test Results Template

For each scenario, record the results using the following template:

```
Scenario ID: [e.g., 2.1]
Tester: [Name]
Date: [YYYY-MM-DD]
Environment: [Local/Dev/Staging/Production]
Result: [Pass/Fail]
Notes: [Any observations, issues, or comments]
```

## Regression Testing

After fixing any issues identified during UAT, repeat the failed test scenarios to ensure the fixes work correctly and do not introduce new issues.

## Sign-off Criteria

The BCR module is considered ready for production when:
1. All critical and high-priority test scenarios pass
2. Any failed low-priority scenarios have documented workarounds
3. No new issues are found during regression testing
4. Performance meets the defined expectations
