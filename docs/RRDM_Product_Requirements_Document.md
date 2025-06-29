# Reference Data Management System (RRDM)
# Product Requirements Document

**Version 1.0**  
**Date: June 26, 2025**

## 1. Introduction

### 1.1 Purpose
The Reference Data Management System (RRDM) is a comprehensive web application designed to manage reference data using the GOV.UK Frontend Design System. It provides a robust platform for handling Business Change Requests (BCRs), managing reference data, and coordinating releases across academic years.

### 1.2 Scope
This document outlines the functional and non-functional requirements for the RRDM application, including its core modules, user roles, workflows, and technical specifications.

### 1.3 Intended Audience
- Development team
- Product managers
- Stakeholders
- Quality assurance team
- Support staff

## 2. Product Overview

### 2.1 Product Perspective
RRDM is a standalone web application that integrates with MongoDB for data storage and follows the GOV.UK Design System for its user interface. It serves as a central system for managing reference data across academic years, handling change requests, and coordinating releases.

### 2.2 Product Features
- Dashboard for managing reference data items
- Reference Data Items View (list of all items)
- Reference Data Values View (values associated with an item)
- Business Change Request (BCR) management
- History Tracking (view changes across academic years)
- Active Data Overview (filtered by academic year)
- Release Notes Page (summarizing all changes)
- Navigation Component with Search
- Sorting, filtering, and export options

### 2.3 User Classes and Characteristics
1. **Administrators**: Full access to all system features
2. **Data Managers**: Manage reference data and approve changes
3. **Submitters**: Create and submit change requests
4. **Reviewers**: Review and process change requests
5. **Viewers**: View-only access to reference data

## 3. System Requirements

### 3.1 Functional Requirements

#### 3.1.1 User Authentication and Authorization
- FR-1.1: The system shall provide secure login functionality
- FR-1.2: The system shall support role-based access control
- FR-1.3: The system shall maintain user sessions securely
- FR-1.4: The system shall allow administrators to manage user roles

#### 3.1.2 Dashboard Module
- FR-2.1: The system shall provide a dashboard showing key metrics
- FR-2.2: The dashboard shall display pending BCRs requiring attention
- FR-2.3: The dashboard shall show recent activity and changes
- FR-2.4: The dashboard shall provide quick links to common actions

#### 3.1.3 Reference Data Management
- FR-3.1: The system shall allow viewing all reference data items
- FR-3.2: The system shall allow filtering reference data by category
- FR-3.3: The system shall support viewing historical values of reference data
- FR-3.4: The system shall allow exporting reference data in various formats

#### 3.1.4 Business Change Request (BCR) Module
- FR-4.1: The system shall allow users to submit new BCRs
- FR-4.2: The system shall support a multi-stage workflow for BCR processing
- FR-4.3: The system shall track BCR status throughout its lifecycle
- FR-4.4: The system shall notify relevant users of BCR status changes
- FR-4.5: The system shall allow reviewers to approve or reject BCRs
- FR-4.6: The system shall maintain a complete history of BCR changes

#### 3.1.5 Academic Year Management
- FR-5.1: The system shall support managing reference data by academic year
- FR-5.2: The system shall allow creating and configuring new academic years
- FR-5.3: The system shall support copying reference data between academic years

#### 3.1.6 Release Management
- FR-6.1: The system shall support creating and managing releases
- FR-6.2: The system shall allow associating BCRs with specific releases
- FR-6.3: The system shall generate release notes automatically
- FR-6.4: The system shall track release status and history

#### 3.1.7 Funding Module
- FR-7.1: The system shall support managing funding data
- FR-7.2: The system shall allow configuring funding routes by academic year
- FR-7.3: The system shall support viewing funding history

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance
- NFR-1.1: The system shall load pages within 2 seconds under normal load
- NFR-1.2: The system shall support at least 100 concurrent users
- NFR-1.3: The system shall handle database operations efficiently with timeouts

#### 3.2.2 Security
- NFR-2.1: The system shall use CSRF protection for all forms
- NFR-2.2: The system shall encrypt sensitive data in transit and at rest
- NFR-2.3: The system shall implement rate limiting to prevent abuse
- NFR-2.4: The system shall maintain audit logs of all significant actions

#### 3.2.3 Reliability
- NFR-3.1: The system shall gracefully handle database connection issues
- NFR-3.2: The system shall provide appropriate error messages for system failures
- NFR-3.3: The system shall implement retry mechanisms for transient failures

#### 3.2.4 Usability
- NFR-4.1: The system shall follow GOV.UK Design System guidelines
- NFR-4.2: The system shall be fully accessible (WCAG 2.1 AA compliant)
- NFR-4.3: The system shall be responsive and work on mobile devices
- NFR-4.4: The system shall provide clear feedback for user actions

#### 3.2.5 Maintainability
- NFR-5.1: The system shall follow a modular architecture
- NFR-5.2: The system shall include comprehensive logging
- NFR-5.3: The system shall support different environments (development, staging, production)

## 4. System Architecture

### 4.1 Technology Stack
- Frontend: GOV.UK Frontend (HTML, Nunjucks)
- Templating Engine: Nunjucks
- Database: MongoDB
- Server: Express.js (Node.js)
- Styling: GOV.UK Design System
- Deployment: Heroku/Cloud Run

### 4.2 System Components
1. **Web Server**: Express.js application handling HTTP requests
2. **Database**: MongoDB storing all application data
3. **Authentication System**: Passport.js for user authentication
4. **Template Engine**: Nunjucks for server-side rendering
5. **Session Management**: Express-session with MongoDB store
6. **Logging System**: Winston for application logging

### 4.3 Data Model
The system uses MongoDB with the following key collections:
- Users: User accounts and permissions
- AcademicYears: Academic year configurations
- ReferenceData: Core reference data items
- BCRs: Business change requests
- Submissions: BCR submissions
- Releases: Release information
- Phases: Workflow phases
- Status: Status configurations
- Funding: Funding data

## 5. User Interface

### 5.1 Design Guidelines
- Follow GOV.UK Design System for all UI components
- Maintain consistent navigation across all pages
- Provide clear feedback for user actions
- Ensure accessibility compliance

### 5.2 Key Screens
1. **Login Screen**: User authentication
2. **Dashboard**: Overview of system status and pending actions
3. **Reference Data List**: View and manage reference data items
4. **BCR Submission Form**: Create new change requests
5. **BCR Review Screen**: Review and process change requests
6. **Release Management**: Create and manage releases
7. **Academic Year Configuration**: Manage academic years

## 6. Business Workflows

### 6.1 BCR Workflow
1. User submits a new BCR
2. BCR enters the review phase
3. Reviewer evaluates the BCR
4. BCR is approved, rejected, or sent back for revision
5. Approved BCRs are assigned to a release
6. BCR status is updated throughout the process

### 6.2 Release Management Workflow
1. Create a new release
2. Associate approved BCRs with the release
3. Set release dates and details
4. Generate release notes
5. Publish the release
6. Archive the release when superseded

### 6.3 Academic Year Rollover
1. Create a new academic year
2. Copy reference data from previous year
3. Apply approved changes for the new year
4. Validate the new year's data
5. Activate the new academic year

## 7. Error Handling and Recovery

### 7.1 Database Connection Issues
- The system shall detect database connection failures
- The system shall attempt to reconnect automatically
- The system shall provide appropriate user feedback during connection issues
- The system shall queue operations when possible during outages

### 7.2 Form Validation Errors
- The system shall validate all form inputs
- The system shall provide clear error messages for invalid inputs
- The system shall preserve user input when validation fails

### 7.3 System Errors
- The system shall log all errors with appropriate context
- The system shall display user-friendly error messages
- The system shall prevent data loss during system errors

## 8. Deployment and Operations

### 8.1 Deployment Strategy
- Three-branch strategy: main (development), staging, production
- Automated testing via GitHub Actions
- Deployment via Heroku Pipelines

### 8.2 Environment Configuration
- Environment-specific configuration files (.env.development, .env.staging, .env.production)
- Feature flags for controlled rollout
- Logging levels configurable by environment

### 8.3 Monitoring and Maintenance
- Application health monitoring
- Database performance monitoring
- Regular backup procedures
- Scheduled maintenance windows

## 9. Future Enhancements

### 9.1 Planned Features
- Enhanced reporting capabilities
- API for external system integration
- Bulk import/export functionality
- Advanced search capabilities
- Workflow customization

### 9.2 Technical Improvements
- Performance optimization for large datasets
- Enhanced caching mechanisms
- Improved error recovery
- Additional authentication methods

## 10. Appendices

### 10.1 Glossary
- **BCR**: Business Change Request
- **RRDM**: Reference Data Management System
- **Academic Year**: The period for which reference data is valid
- **Release**: A collection of changes deployed together

### 10.2 Related Documents
- System Architecture Document
- User Guide
- API Documentation
- Testing Strategy
