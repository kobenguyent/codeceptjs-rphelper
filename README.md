[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/peternguyew)

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6e6495428bbd41f0807e4239c42403eb)](https://www.codacy.com/manual/PeterNgTr/codeceptjs-rphelper?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=PeterNgTr/codeceptjs-rphelper&amp;utm_campaign=Badge_Grade)
[![GitHub tag](https://img.shields.io/github/tag/kobenguyent/codeceptjs-rphelper?include_prereleases=&sort=semver&color=blue)](https://github.com/kobenguyent/codeceptjs-rphelper/releases/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)


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
  FAIL  | 0 passed, 1 failed   // 2s
📋 Writing results to ReportPortal: default_personal > https://demo.reportportal.io/api/v1
Option 'token' is deprecated. Use 'apiKey' instead.
Start launch with tempId ai1m1nxblq7zmyvb {
  name: 'E2E Test Automation',
  description: '',
  attributes: undefined,
  rerun: undefined,
  rerunOf: undefined
}
Success start launch with tempId ai1m1nxblq7zmyvb { id: '1b46ed37-a5ee-46f8-8485-a981730350d5', number: 99 }
📋 ReportPortal Launch Link: https://demo.reportportal.io/ui/#default_personal/launches/all/805
Start test item with tempId ai1m1nxblq7zmz6s {
  startTime: 1702726908580,
  name: 'My',
  type: 'SUITE',
  hasStats: true,
  launchUuid: '1b46ed37-a5ee-46f8-8485-a981730350d5'
}
Finish all children for test item with tempId ai1m1nxblq7zmz6s 
Finish test item with tempId ai1m1nxblq7zmz6s { endTime: 1702726908580, status: 'PASSED' }
Finish all children for test item with tempId ai1m1nxblq7zmz6t 
Finish test item with tempId ai1m1nxblq7zmz6t { endTime: 1702726908581, status: 'FAILED' }
Finish all children for test item with tempId ai1m1nxblq7zmz6u 
Finish test item with tempId ai1m1nxblq7zmz6u { endTime: 1702726908581, status: 'FAILED' }
Success start item with tempId ai1m1nxblq7zmz6s {
  id: 'ae0a4705-7b2e-4508-840a-a0ad0df2314e',
  uniqueId: 'auto:c8fc95413ca778fddfdb4025b395dff5'
}
Finish test item with tempId ai1m1nxblq7zmz6s {
  promiseStart: Promise {
    {
      id: 'ae0a4705-7b2e-4508-840a-a0ad0df2314e',
      uniqueId: 'auto:c8fc95413ca778fddfdb4025b395dff5'
    }
  },
  realId: 'ae0a4705-7b2e-4508-840a-a0ad0df2314e',
  children: [ 'ai1m1nxblq7zmz6t' ],
  finishSend: true,
  promiseFinish: Promise { <pending> },
  resolveFinish: [Function (anonymous)],
  rejectFinish: [Function (anonymous)]
}
Start test item with tempId ai1m1nxblq7zmz6t {
  startTime: 1702726908580,
  name: 'DEMO @C1',
  type: 'TEST',
  hasStats: true,
  launchUuid: '1b46ed37-a5ee-46f8-8485-a981730350d5'
}
Success start item with tempId ai1m1nxblq7zmz6t {
  id: '7292910c-7117-447a-bf27-3286a5e2451d',
  uniqueId: 'auto:74b464dd31ca3149876fc6c90af368d5'
}
Finish test item with tempId ai1m1nxblq7zmz6t {
  promiseStart: Promise {
    {
      id: '7292910c-7117-447a-bf27-3286a5e2451d',
      uniqueId: 'auto:74b464dd31ca3149876fc6c90af368d5'
    }
  },
  realId: '7292910c-7117-447a-bf27-3286a5e2451d',
  children: [ 'ai1m1nxblq7zmz6u' ],
  finishSend: true,
  promiseFinish: Promise { <pending> },
  resolveFinish: [Function (anonymous)],
  rejectFinish: [Function (anonymous)]
}
Start test item with tempId ai1m1nxblq7zmz6u {
  startTime: 1702726908581,
  name: '[STEP] - I seeAttributesOnElements .container [object Object]',
  type: 'STEP',
  hasStats: false,
  launchUuid: '1b46ed37-a5ee-46f8-8485-a981730350d5'
}
Success finish item with tempId ai1m1nxblq7zmz6s {
  message: "TestItem with ID = 'ae0a4705-7b2e-4508-840a-a0ad0df2314e' successfully finished."
}
Success start item with tempId ai1m1nxblq7zmz6u {
  id: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
  uniqueId: 'auto:1df56aad8a88374cd2386f62fd425e5b'
}
Finish test item with tempId ai1m1nxblq7zmz6u {
  promiseStart: Promise {
    {
      id: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
      uniqueId: 'auto:1df56aad8a88374cd2386f62fd425e5b'
    }
  },
  realId: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
  children: [ 'ai1m1nxblq7zmz6v' ],
  finishSend: true,
  promiseFinish: Promise { <pending> },
  resolveFinish: [Function (anonymous)],
  rejectFinish: [Function (anonymous)]
}
Save log with tempId ai1m1nxblq7zmz6v {
  promiseStart: Promise {
    {
      id: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
      uniqueId: 'auto:1df56aad8a88374cd2386f62fd425e5b'
    }
  },
  realId: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
  children: [ 'ai1m1nxblq7zmz6v' ],
  finishSend: true,
  promiseFinish: Promise { <pending> },
  resolveFinish: [Function (anonymous)],
  rejectFinish: [Function (anonymous)]
}
Success finish item with tempId ai1m1nxblq7zmz6t {
  message: "TestItem with ID = '7292910c-7117-447a-bf27-3286a5e2451d' successfully finished."
}
Successfully save log with tempId ai1m1nxblq7zmz6v { id: '4497a6ec-2825-4e42-8989-5720036223d1' }
Save log with tempId ai1m1nxblq7zmzi5 {
  promiseStart: Promise {
    {
      id: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
      uniqueId: 'auto:1df56aad8a88374cd2386f62fd425e5b'
    }
  },
  realId: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
  children: [ 'ai1m1nxblq7zmz6v', 'ai1m1nxblq7zmzi5' ],
  finishSend: true,
  promiseFinish: Promise { <pending> },
  resolveFinish: [Function (anonymous)],
  rejectFinish: [Function (anonymous)]
}
Save log with file: DEMO_@C1.failed.png {
  time: 1702726908989,
  message: 'Last seen screenshot',
  level: 'debug',
  launchUuid: '1b46ed37-a5ee-46f8-8485-a981730350d5',
  itemUuid: 'dab8fa77-4a24-4858-a393-3c9d6b3f6344',
  file: { name: 'DEMO_@C1.failed.png' }
}
Success finish item with tempId ai1m1nxblq7zmz6u {
  message: "TestItem with ID = 'dab8fa77-4a24-4858-a393-3c9d6b3f6344' successfully finished."
}
Success save log with file: DEMO_@C1.failed.png { responses: [ { id: '08be27b0-c64f-4818-8a18-b2338162823b' } ] }
Successfully save log with tempId ai1m1nxblq7zmzi5 { responses: [ { id: '08be27b0-c64f-4818-8a18-b2338162823b' } ] }
Start test item with tempId ai1m1nxblq7zmzor {
  startTime: 1702726909227,
  name: '[STEP] - I amOnPage https://kobenguyent.github.io/qa-utils/#/',
  type: 'STEP',
  hasStats: false,
  launchUuid: '1b46ed37-a5ee-46f8-8485-a981730350d5'
}
Finish all children for test item with tempId ai1m1nxblq7zmzor 
Finish test item with tempId ai1m1nxblq7zmzor { endTime: 1702726909228, status: 'PASSED' }
Finish launch with tempId ai1m1nxblq7zmyvb { endTime: 1702726909228, status: 'PASSED' }
Success finish launch with tempId ai1m1nxblq7zmyvb {
  id: '1b46ed37-a5ee-46f8-8485-a981730350d5',
  number: 99,
  link: 'https://demo.reportportal.io/ui/#default_personal/launches/all/805'
}
Success start item with tempId ai1m1nxblq7zmzor {
  id: '222e0c4f-b814-4f44-be01-d9e014261a28',
  uniqueId: 'auto:5704ef84f1c5840d8a8dc103ff52868d'
}
Finish test item with tempId ai1m1nxblq7zmzor {
  promiseStart: Promise {
    {
      id: '222e0c4f-b814-4f44-be01-d9e014261a28',
      uniqueId: 'auto:5704ef84f1c5840d8a8dc103ff52868d'
    }
  },
  realId: '222e0c4f-b814-4f44-be01-d9e014261a28',
  children: [],
  finishSend: true,
  promiseFinish: Promise { <pending> },
  resolveFinish: [Function (anonymous)],
  rejectFinish: [Function (anonymous)]
}
Success finish item with tempId ai1m1nxblq7zmzor {
  message: "TestItem with ID = '222e0c4f-b814-4f44-be01-d9e014261a28' successfully finished."
}
```

## Video

https://github.com/kobenguyent/codeceptjs-rphelper/assets/7845001/c006723c-044b-4a5a-ad82-ddf9a08a5787
