[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/peternguyew)

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6e6495428bbd41f0807e4239c42403eb)](https://www.codacy.com/manual/PeterNgTr/codeceptjs-rphelper?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=PeterNgTr/codeceptjs-rphelper&amp;utm_campaign=Badge_Grade) [![Greenkeeper badge](https://badges.greenkeeper.io/PeterNgTr/codeceptjs-rphelper.svg)](https://greenkeeper.io/) ![npm](https://img.shields.io/npm/v/codeceptjs-rphelper?color=light%20green)

# codeceptjs-rphelper

This helps you publish the CodeceptJS test results to ReportPortal

`codeceptjs-rphelper` is a [CodeceptJS](https://codecept.io/) helper which can publish tests results on [ReportPortal](https://reportportal.io/) after execution.

## Installation

```sh
npm i codeceptjs-rphelper --save
```

## Configuration

This plugin should be added in `codecept.conf.(js|ts)`

Example:

```js
{
  ...
   plugins: {
    reportportal: {
      require: 'codeceptjs-rphelper',
      token: 'YOUR_TOKEN',
      endpoint: 'http://localhost:8080/api/v1',
      launchName: 'This is awesome',
      launchDescription: 'This is a description of your launch',
      launchAttributes: [{ key: 'yourKey', value: 'yourValue' }],
      projectName: 'YOUR_PROJECT',
      rerun: false,
      debug: false,
      enabled: true
    }
  ...
}
```

To use this plugin you need to provide the following info:

```sh
- `token`: which can be found by navigating to the user profile page, clicking the username drop-down in the right header and selecting the "Profile" > "UUID" – is a unique user identifier. UUID is used in automated test configuration files for a user authentication instead of a password. It will allow you to post data, without logging it in the UI.
- `endpoint`: your reportportal host + `api/v1` for instance: `http://localhost:8080/api/v1`
- `launchName`: the launch name you want, if not provided, the suite title will be used
- `launchDescription`: the description of your launch, if not provided, the description will be empty
- `launchAttributes`: the attributes of your launch, if not provided, the attributes will be empty
- `projectName`: the project that you created in the reportportal UI
- `debug`: to turn on the debug for reportportal
- `rerun`: to enable rerun
- `rerunOf`: UUID of launch you want to rerun. If not specified, report portal will update the latest launch with the same name
```

To show more logs: set `debug: true` in the configuration.

```js
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

## Video

https://github.com/kobenguyent/codeceptjs-rphelper/assets/7845001/c006723c-044b-4a5a-ad82-ddf9a08a5787
