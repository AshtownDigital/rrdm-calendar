# RRDM BCR Submissions Postman Tests

This directory contains Postman tests for the BCR submission functionality in the RRDM application.

## Getting Started

1. Import the `bcr-submissions.postman_collection.json` file into Postman
2. Create an environment in Postman with the following variables:
   - `session_id`: A valid session ID from the RRDM application
   - `bcr_id`: This will be automatically populated when you run the tests

## Test Scenarios

The collection includes the following test scenarios:

1. **Create BCR Submission**
   - Creates a new BCR with medium priority
   - Verifies that the submission is successful
   - Extracts and saves the BCR ID for subsequent tests

2. **Get BCR Submission by ID**
   - Retrieves a BCR by its ID
   - Verifies that the response contains the expected BCR details
   - Checks for GOV.UK Design System tag colors based on status and priority

3. **Delete BCR Submission**
   - Deletes a BCR by its ID
   - Verifies that the deletion is successful
   - Confirms that the deleted BCR can no longer be accessed

4. **Create Critical Priority BCR**
   - Creates a new BCR with critical priority
   - Verifies that the submission is successful
   - Checks that the BCR has the correct red tag for critical priority

## Test Scripts

The `bcr-submissions-tests.js` file contains detailed test scripts that can be added to the "Tests" tab in Postman for each request. These scripts include:

- Assertions for response status codes
- Validation of redirect locations
- Extraction and storage of BCR IDs
- Verification of GOV.UK Design System tag colors
- Checks for BCR code format (BCR-YY/YY-XXXX)

## Running the Tests

1. Start the RRDM application locally on port 3000
2. Obtain a valid session ID by logging into the application
3. Set the `session_id` variable in your Postman environment
4. Run the collection in sequence

## Notes

- The tests assume that the RRDM application is running on `http://localhost:3000`
- The tests follow the GOV.UK Design System color standards for tags:
  - Blue tags for new/pending states
  - Grey tags for inactive/neutral states
  - Green tags for success/completed states
  - Red tags for rejected/urgent states
  - Yellow tags for medium priority
  - Orange tags for high priority
- The BCR code format follows the pattern BCR-YY/YY-XXXX where YY/YY represents the fiscal year
