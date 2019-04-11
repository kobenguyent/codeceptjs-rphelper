# codeceptjs-rphelper
CodeceptJS Reportportal helper to integrate the ReportPortal

codeceptjs-rphelper is [CodeceptJS](https://codecept.io/) helper which is to publish tests results on [ReportPortal](https://reportportal.io/) after execution.

NPM package: https://www.npmjs.com/package/codeceptjs-rphelper

### Installation
`npm install reportportal-client`
`npm install codeceptjs-rphelper`

### Configuration

This helper should be added in codecept.json/codecept.conf.js

Example:

```json
{
   helpers: {
    ReportPortalHelper: {
      require: 'codeceptjs-rphelper',
      token: 'YOUR_TOKEN',
      endpoint: 'http://localhost:8080/api/v1',
      projectName: 'YOUR_PROJECT',
      debug: false
    }
    }
   }
}
```

To use this helper you need to provide the following info:
- token: which can be found by navigating to the user profile page, clicking the username drop-down in the right header and selecting the "Profile" option > "UUID" – is a unique user identifier. UUID is used in automated test configuration files for a user authentication instead of a password. It will allow you to post data, without logging it in the UI.
- endpoint: your reportportal host + `api/v1` for instance: `http://localhost:8080/api/v1`
- projectName: the project that you created in the reportportal UI.
- debug: to turn on the debug for reportportal.

Example:
when debug is `true`

```
Happy Path - Smokecheck --
Start launch 65ndx5jucolqsp
Start test item 65ndx5jucoltbj
Success start item 65ndx5jucoltbj
Save log 65ndx5jucolwu6
Successfully save log 65ndx5jucolwu6
Save log 65ndx5jucolz6k
Successfully save log 65ndx5jucolz6k
Save log 65ndx5jucom2d6
Save log 65ndx5jucom2de
Successfully save log 65ndx5jucom2de
Successfully save log 65ndx5jucom2d6
Save log 65ndx5jucom4q3
Successfully save log 65ndx5jucom4q3
Save log 65ndx5jucomcfx
Save log 65ndx5jucomcg7
Successfully save log 65ndx5jucomcfx
Successfully save log 65ndx5jucomcg7
Save log 65ndx5jucomgbd
Successfully save log 65ndx5jucomgbd
Save log 65ndx5jucomhd8
  ✖ Search a restaurant on restaurant list @test in 6384ms

-- FAILURES:

  1) Happy Path - Smokecheck
       Search a restaurant on restaurant list @test:
     Evaluation failed: DOMException: Failed to execute 'querySelectorAll' on 'Element': '(//input[@id="search-query"])[2]' is not a valid selector.
    at __puppeteer_evaluation_script__:1:33
  
  Scenario Steps:
  
  - I.fillField("(//input[@id="search-query"])[2]", "Web") at Object.searchRestaurant (test/codeceptjs/pages/RestaurantList.js:56:11)
  - I.wait(5) at Object.searchRestaurant (test/codeceptjs/pages/RestaurantList.js:55:11)
  - I.grabTextFrom("span[class="user-address-summary__details__text"]") at Test.Scenario (test/codeceptjs/tests/smokeCheck/happyPath.js:17:37)
  
  
  
  Run with --verbose flag to see NodeJS stacktrace


  FAIL  | 0 passed, 1 failed   // 34s
Successfully save log 65ndx5jucomhd8
Finish test item 65ndx5jucoltbj
Success finish item 65ndx5jucoltbj
Finish launch 65ndx5jucolqsp
Success finish launch 65ndx5jucolqsp
```