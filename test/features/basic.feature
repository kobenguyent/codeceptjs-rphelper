Feature: PR Plugin test with BDD
  As a user of RP agent for codeceptjs
  I want to be able to publish results to PR afterwards

  @pass
  Scenario: Pass tests
    Given I am Google homepage
    Then I dont see abc

  @fail
  Scenario: Fail tests
    Given I am Google homepage
    Then I see abc
