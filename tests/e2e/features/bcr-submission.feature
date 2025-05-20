Feature: BCR Submission Process
  As a user of the RRDM system
  I want to submit a Business Change Request (BCR)
  So that it can be reviewed and processed

  Background:
    Given I am logged in as a standard user
    And I am on the BCR submissions page

  Scenario: Submit a new BCR with valid data
    When I click on "Create New Submission"
    Then I should see the BCR submission form
    When I fill in the following fields:
      | Field                | Value                                  |
      | Full Name            | Test User                              |
      | Email Address        | test.user@education.gov.uk             |
      | Submission Source    | Internal                               |
      | Brief Description    | Update to apprenticeship funding bands |
      | Justification        | Current funding bands need updating    |
      | Urgency Level        | Medium                                 |
    And I check the declaration checkbox
    And I click the "Submit" button
    Then I should see a confirmation message
    And the message should contain the submission reference number

  Scenario: Attempt to submit a BCR with missing required fields
    When I click on "Create New Submission"
    Then I should see the BCR submission form
    When I fill in the following fields:
      | Field             | Value                      |
      | Full Name         | Test User                  |
      | Email Address     | test.user@education.gov.uk |
      | Submission Source | Internal                   |
      # Missing other required fields
    And I check the declaration checkbox
    And I click the "Submit" button
    Then I should see validation error messages
    And I should still be on the submission form

  Scenario: Submit a BCR with high urgency
    Given I am logged in as a standard user
    And I am on the BCR submissions page
    When I click on "Create New Submission"
    Then I should see the BCR submission form
    When I fill in the following fields:
      | Field                | Value                             |
      | Full Name            | Test User                         |
      | Email Address        | test.user@education.gov.uk        |
      | Submission Source    | Internal                          |
      | Brief Description    | Critical security update          |
      | Justification        | Security vulnerability identified |
      | Urgency Level        | High                              |
    And I check the declaration checkbox
    And I click the "Submit" button
    Then I should see a confirmation message
    And the message should contain the submission reference number

  Scenario: Review and approve a BCR submission
    Given there is an existing BCR submission
    When I navigate to the BCR submissions list
    And I click on the "Review" button for the submission
    Then I should see the submission details
    When I click the "Approve" button
    Then I should see a confirmation that a BCR has been created
    And the BCR number should be displayed

  Scenario: Review and reject a BCR submission
    Given there is an existing BCR submission
    When I navigate to the BCR submissions list
    And I click on the "Review" button for the submission
    Then I should see the submission details
    When I click the "Reject" button
    Then I should see a confirmation that the submission has been rejected

  Scenario: Review and reject a BCR submission with rejection reason
    Given there is an existing BCR submission
    When I navigate to the BCR submissions list
    And I click on the "Review" button for the submission
    Then I should see the submission details
    When I click the "Reject" button
    And I enter "Insufficient information provided" as the rejection reason
    And I click the "Confirm Rejection" button
    Then I should see a confirmation that the submission has been rejected
    And the rejection reason should be recorded

  Scenario: View BCR submission history
    When I navigate to the BCR submissions list
    Then I should see a list of all submissions
    And I should be able to filter by status
    When I filter by "Approved" status
    Then I should only see approved submissions
