# Reference Data Management System (RRDM)
# Release Notes Module Requirements - Gherkin Format

**Document Version:** 4.0  
**Date:** March 31, 2025  
**Author:** Cascade AI  

## Table of Contents
1. [Introduction](#1-introduction)
2. [REQ-001: Academic Year Navigation](#req-001-academic-year-navigation)
3. [REQ-002: View Type Navigation](#req-002-view-type-navigation)
4. [REQ-003: Reference Data Items List](#req-003-reference-data-items-list)
5. [REQ-004: Item Details Page](#req-004-item-details-page)
6. [REQ-005: Item History Page](#req-005-item-history-page)
7. [REQ-006: Release Notes Timeline View](#req-006-release-notes-timeline-view)
8. [REQ-007: Release Notes Summary View](#req-007-release-notes-summary-view)
9. [REQ-008: Non-Functional Requirements](#req-008-non-functional-requirements)
10. [REQ-009: Future Enhancements](#req-009-future-enhancements)

## 1. Introduction

### 1.1 Purpose
The Release Notes module provides a comprehensive view of changes to reference data items across academic years, enabling users to understand what has changed between releases and access detailed information about specific items.

### 1.2 Scope
This document covers the requirements for all Release Notes views and related functionality within the Reference Data Management System (RRDM).

## REQ-001: Academic Year Navigation

### Feature: Academic Year Navigation
**As a** user of the Release Notes module  
**I want** to navigate between different academic years  
**So that** I can view reference data changes specific to my selected academic year  

#### Background:
  Given the Release Notes module is accessible to authorized users
  And multiple academic years of reference data are available in the system

#### Scenario: 1.1 Viewing the academic year navigation tabs
  Given I am on any Release Notes page
  Then I should see a horizontal tab navigation bar at the top of the page
  And each tab should represent a different academic year (e.g., 2023/24, 2024/25, 2025/26)
  And tabs should be arranged in chronological order, with the most recent academic year on the right
  And an "All" tab option should be available

#### Scenario: 1.2 Selecting a different academic year
  Given I am on any Release Notes page
  When I click on a different academic year tab
  Then the page should update to show data for the selected academic year
  And the URL parameter "year" should update to reflect my selection (e.g., year=2025/2026)
  And the selected tab should be visually highlighted
  And the current view type should be maintained

#### Scenario: 1.3 Selecting the "All" academic years option
  Given I am on any Release Notes page
  When I click on the "All" tab
  Then the page should update to show data across all academic years
  And the URL parameter should update to "year=all"
  And items from different academic years should have clear indicators showing which year they belong to

#### Scenario: 1.4 Using keyboard navigation for academic year tabs
  Given I am on any Release Notes page
  When I use the Tab key to focus on the academic year navigation
  Then I should be able to navigate between tabs using arrow keys
  And I should be able to select a tab using the Enter key
  And screen readers should announce the tab labels and selected state

## REQ-002: View Type Navigation

### Feature: View Type Navigation
**As a** user of the Release Notes module  
**I want** to switch between different visualization types (List, Timeline, Summary)  
**So that** I can analyze reference data changes in the format most suitable for my current needs  

#### Background:
  Given the Release Notes module is accessible to authorized users
  And I have selected an academic year to view

#### Scenario: 2.1 Viewing the view type navigation tabs
  Given I am on any Release Notes page
  Then I should see a horizontal tab navigation bar for view types below the academic year navigation
  And there should be tabs for three distinct view types: "List", "Timeline", and "Summary"
  And the currently active view type should be visually highlighted

#### Scenario: 2.2 Switching between view types
  Given I am on any Release Notes page
  When I click on a different view type tab
  Then the page should update to show the selected view type
  And the URL parameter "view" should update to reflect my selection (e.g., view=list, view=timeline, view=summary)
  And the selected tab should be visually highlighted
  And the current academic year selection should be maintained

#### Scenario: 2.3 Default view type
  Given I access the Release Notes page without specifying a view type
  Then the system should default to the "list" view
  And the "List" tab should be visually highlighted

#### Scenario: 2.4 Using keyboard navigation for view type tabs
  Given I am on any Release Notes page
  When I use the Tab key to focus on the view type navigation
  Then I should be able to navigate between tabs using arrow keys
  And I should be able to select a tab using the Enter key
  And screen readers should announce the tab labels and selected state

## REQ-003: Reference Data Items List

### Feature: Reference Data Items List
**As a** user of the Release Notes module  
**I want** to see a comprehensive list of reference data items organized by change type  
**So that** I can quickly identify what has changed and access detailed information  

#### Background:
  Given the Release Notes module is accessible to authorized users
  And I have selected an academic year to view
  And I am on the List view

#### Scenario: 3.1 Viewing reference data items grouped by change type
  Given I am on the List view for a specific academic year
  Then I should see reference data items grouped by change type
  And there should be clear headings for each group: "New Items", "Updated Items", and "Unchanged Items"
  And groups should be displayed in the following order: New Items, Updated Items, Unchanged Items
  And empty groups should not be displayed

#### Scenario: 3.2 Navigating to item details
  Given I am on the List view for a specific academic year
  When I click on an item name
  Then I should be navigated to the item details page for that specific item
  And the URL should follow the format "/items/{item-id}/values?academic-year={year-id}"
  And the academic year context should be maintained

#### Scenario: 3.3 Visual indicators for change types
  Given I am on the List view for a specific academic year
  Then each item should include a visual indicator of its change type
  And new items should be indicated with a green tag or icon labeled "New"
  And updated items should be indicated with an amber/orange tag or icon labeled "Updated"
  And unchanged items should have a neutral styling without additional indicators

#### Scenario: 3.4 Empty state for no items
  Given I am on the List view for an academic year with no reference data items
  Then I should see an appropriate message indicating that no items are available
  And the message should suggest next actions (e.g., selecting a different academic year)

## REQ-004: Item Details Page

### Feature: Item Details Page
**As a** user of the Release Notes module  
**I want** to view comprehensive information about a specific reference data item  
**So that** I can understand its properties, data type, format, validation rules, and associated values  

#### Background:
  Given the Release Notes module is accessible to authorized users
  And I have navigated to the Item Details page for a specific item

#### Scenario: 4.1 Viewing item information sections
  Given I am on the Item Details page
  Then I should see sections displaying:
    | Section                  | Information Displayed                                                                |
    |--------------------------|--------------------------------------------------------------------------------------|
    | General Properties       | Name, academic year, status, description, change type, last updated date             |
    | Data Type and Format     | Data type, format, CSV name, API name, HESA name/code                               |
    | Validation Rules         | Required status, minimum/maximum length, validation pattern, validation notes        |
    | Storage and Security     | Database column name                                                                |
  And information should be organized in a clear, logical manner
  And status and change type indicators should be visually distinct

#### Scenario: 4.2 Viewing associated values
  Given I am on the Item Details page
  Then I should see a table displaying all values associated with the item for the selected academic year
  And the table should include columns for Value ID, Value name, Description, Status, Change type, and Last updated date
  And I should be able to sort the table by different columns
  And if no values are available, I should see an appropriate message

#### Scenario: 4.3 Accessing item history
  Given I am on the Item Details page
  Then I should see links to view the history of the item across academic years
  When I click on a history link
  Then I should be navigated to the Item History page for that item

#### Scenario: 4.4 Navigating back to the list view
  Given I am on the Item Details page
  Then I should see a back link to return to the reference data items list
  When I click on the back link
  Then I should be navigated back to the List view for the same academic year

## REQ-005: Item History Page

### Feature: Item History Page
**As a** user of the Release Notes module  
**I want** to view the history of changes to a specific reference data item  
**So that** I can understand how it has evolved over time  

#### Background:
  Given the Release Notes module is accessible to authorized users
  And I have navigated to the Item History page for a specific item

#### Scenario: 5.1 Viewing basic item information
  Given I am on the Item History page
  Then I should see basic information about the item (name, current status, current description)
  And this information should be clearly separated from the history timeline

#### Scenario: 5.2 Viewing the history timeline
  Given I am on the Item History page
  Then I should see a chronological timeline of changes to the item
  And timeline entries should be ordered from newest to oldest
  And each entry should show academic year, status, change type, change summary, and last updated date
  And different academic years should be visually distinct

#### Scenario: 5.3 Navigating back to item details
  Given I am on the Item History page
  Then I should see a back link to return to the item details page
  When I click on the back link
  Then I should be navigated back to the Item Details page for the same item

## REQ-006: Release Notes Timeline View

### Feature: Release Notes Timeline View
**As a** user of the Release Notes module  
**I want** to see a chronological visualization of changes  
**So that** I can understand when changes were made and their sequence  

#### Background:
  Given the Release Notes module is accessible to authorized users
  And I have selected an academic year to view
  And I am on the Timeline view

#### Scenario: 6.1 Viewing the chronological timeline
  Given I am on the Timeline view for a specific academic year
  Then I should see a chronological timeline of changes
  And changes should be grouped by month or quarter with clear visual separation
  And each timeline entry should include date/time period, number of items changed, types of changes, and a brief summary

#### Scenario: 6.2 Expanding timeline entries
  Given I am on the Timeline view for a specific academic year
  When I click to expand a timeline entry
  Then I should see more detailed information about the changes in that time period
  And I should be able to collapse the entry again to return to the summary view

#### Scenario: 6.3 Visual representation of the timeline
  Given I am on the Timeline view for a specific academic year
  Then I should see a vertical timeline layout with appropriate visual indicators
  And the timeline should be easy to scan and understand
  And different types of changes should have distinct visual indicators

## REQ-007: Release Notes Summary View

### Feature: Release Notes Summary View
**As a** user of the Release Notes module  
**I want** to see summary statistics and high-level information about changes  
**So that** I can quickly understand the scope and impact of changes  

#### Background:
  Given the Release Notes module is accessible to authorized users
  And I have selected an academic year to view
  And I am on the Summary view

#### Scenario: 7.1 Viewing summary statistics
  Given I am on the Summary view for a specific academic year
  Then I should see summary statistics including:
    | Statistic               | Description                                      |
    |-------------------------|--------------------------------------------------|
    | Total Items             | Total number of reference data items             |
    | New Items               | Number of new items                              |
    | Updated Items           | Number of updated items                          |
    | Unchanged Items         | Number of unchanged items                        |
    | Removed Items           | Number of removed items                          |
  And I should see visual representations (percentages or charts) showing the distribution of changes

#### Scenario: 7.2 Viewing change type summaries
  Given I am on the Summary view for a specific academic year
  Then I should see summary sections for each change type (new, updated, removed)
  And each section should include item counts and brief descriptions of significant changes
  And each section should include links to view all items of that change type

#### Scenario: 7.3 Navigating to detailed views
  Given I am on the Summary view for a specific academic year
  When I click on a link to view all items of a specific change type
  Then I should be navigated to the List view filtered to show only items of that change type

## REQ-008: Non-Functional Requirements

### Feature: Performance Requirements
**As a** user of the Release Notes module  
**I want** the system to be fast and responsive  
**So that** I can access information without delays  

#### Scenario: 8.1 Page loading performance
  Given I am accessing any page in the Release Notes module
  Then the page should load within 2 seconds under normal network conditions
  And critical UI elements should load first to allow early interaction

#### Scenario: 8.2 UI interaction responsiveness
  Given I am using any interactive element in the Release Notes module
  When I interact with the element (e.g., clicking a button, sorting a table)
  Then the system should respond within 300ms

#### Scenario: 8.3 Concurrent user performance
  Given multiple users are accessing the Release Notes module simultaneously
  When up to 100 concurrent users are active
  Then the system should maintain performance without significant degradation

### Feature: Accessibility Requirements
**As a** user with disabilities  
**I want** the Release Notes module to be accessible  
**So that** I can use it effectively with assistive technologies  

#### Scenario: 8.4 WCAG compliance
  Given I am using the Release Notes module
  Then all pages should comply with WCAG 2.1 AA standards
  And automated accessibility testing tools should report no violations

#### Scenario: 8.5 Keyboard navigation
  Given I am using the Release Notes module with only a keyboard
  Then I should be able to access and operate all functionality
  And focus states should be clearly visible
  And there should be no keyboard traps

#### Scenario: 8.6 Screen reader compatibility
  Given I am using the Release Notes module with a screen reader
  Then all content should be properly announced
  And proper heading hierarchy should be maintained
  And ARIA attributes should be used appropriately

### Feature: Browser Compatibility
**As a** user with different devices and browsers  
**I want** the Release Notes module to work consistently  
**So that** I can access it from my preferred platform  

#### Scenario: 8.7 Desktop browser compatibility
  Given I am using one of the supported browsers (Chrome, Firefox, Edge, Safari)
  When I access the Release Notes module
  Then all functionality should work correctly
  And the interface should display correctly

#### Scenario: 8.8 Mobile device compatibility
  Given I am using a mobile device with a screen width between 320px and 768px
  When I access the Release Notes module
  Then the interface should adapt to the screen size
  And all functionality should remain accessible
  And touch targets should be appropriately sized (at least 44x44px)

### Feature: Security Requirements
**As a** user of the Release Notes module  
**I want** the system to be secure  
**So that** my data and interactions are protected  

#### Scenario: 8.9 Secure communication
  Given I am accessing the Release Notes module
  Then all pages should be served over HTTPS with valid certificates

#### Scenario: 8.10 Authentication and authorization
  Given I am attempting to access the Release Notes module
  Then I should be authenticated before gaining access
  And I should only see data that I am authorized to view

#### Scenario: 8.11 Protection against vulnerabilities
  Given I am using the Release Notes module
  Then the system should implement protections against common web vulnerabilities
  And security scanning tools should report no critical or high vulnerabilities

## REQ-009: Future Enhancements

### Feature: Search Functionality
**As a** user of the Release Notes module  
**I want** to search for specific reference data items or values  
**So that** I can quickly find the information I'm looking for  

#### Scenario: 9.1 Basic search functionality
  Given I am on any Release Notes page
  When I enter a search term in the search field
  Then the system should display results matching my search term
  And results should be sorted by relevance

#### Scenario: 9.2 Advanced search options
  Given I am on the search interface
  Then I should see options for advanced search
  When I use these options to refine my search
  Then the results should be filtered according to my criteria

### Feature: Export Functionality
**As a** user of the Release Notes module  
**I want** to export release notes in various formats  
**So that** I can use the information in other systems or reports  

#### Scenario: 9.3 Exporting in different formats
  Given I am viewing release notes for a specific academic year
  When I select the export option
  Then I should be able to choose from multiple formats (PDF, CSV, JSON)
  And the exported file should contain complete and properly formatted data

#### Scenario: 9.4 API access to release notes data
  Given I am a developer integrating with the system
  When I make a request to the release notes API endpoints
  Then I should receive data in the expected format and structure

### Feature: Comparison View
**As a** user of the Release Notes module  
**I want** to compare reference data items across academic years  
**So that** I can easily identify differences  

#### Scenario: 9.5 Side-by-side comparison
  Given I am viewing a reference data item
  When I select the option to compare across academic years
  Then I should see a side-by-side view of the item across selected years
  And differences should be clearly highlighted

### Feature: Notification System
**As a** user of the Release Notes module  
**I want** to receive notifications about changes to specific reference data items  
**So that** I'm always aware of updates  

#### Scenario: 9.6 Setting up notifications
  Given I am viewing a reference data item
  When I select the option to subscribe to notifications
  Then I should be able to specify my notification preferences
  And these preferences should be saved to my user profile

#### Scenario: 9.7 Receiving notifications
  Given I have subscribed to notifications for specific items
  When changes are made to those items
  Then I should receive timely notifications through my preferred channels
  And notifications should contain useful, actionable information
