exports.config = {
  output: './output',
  helpers: {
    Playwright: {
      url: 'https://www.google.de/',
      show: false,
    },
    JSONResponse: {},
    REST: {
      endpoint: 'https://reqres.in',
      timeout: 30_000
    },
  },
  include: {},
  mocha: {},
  bootstrap: null,
  teardown: null,
  hooks: [],
  gherkin: {
    features: './features/*.feature',
    steps: ['./step_definitions/steps.js'],
  },
  plugins: {
    screenshotOnFail: {
      enabled: true,
    },
    retryFailedStep: {
      enabled: false,
    },
    reportportal: {
      require: '../index',
      token: process.env.RP_TOKEN,
      endpoint: 'https://demo.reportportal.io/api/v1',
      launchName: `This is demo launch runs on ${Date.now()}`,
      launchDescription: `This is launch description: ${Date.now()}`,
      launchAttributes: [{
        key: 'yourKey',
        value: 'yourValue',
      }],
      projectName: 'default_personal',
      rerun: false,
      debug: true,
      enabled: true,
      issue: {
        issueType: 'pb001',
        comment: 'found by automated tests',
      }
    },
  },
  tests: './*_test.js',
  timeout: 10000,
  name: 'codeceptjs-rphelper',
};
