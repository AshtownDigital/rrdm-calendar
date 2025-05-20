Feature: Authentication
  As a user
  I want to be able to log in to the system
  So that I can access protected resources

  Scenario: Successful login
    Given I navigate to the login page
    When I enter valid credentials
    And I submit the login form
    Then I should be logged in successfully
