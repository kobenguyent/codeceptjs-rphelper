exports.config = {
  output: './output',
  helpers: {
    Playwright: {
      url: 'https://www.google.de/',
      show: false,
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
      launchName: 'This is demo launch',
      launchDescription: 'This is a description of your launch',
      launchAttributes: [{
        key: 'yourKey',
        value: 'yourValue',
      }],
      projectName: 'default_personal',
      rerun: false,
      debug: true,
      enabled: true,
    },
  },
  tests: './*_test.js',
  timeout: 10000,
  name: 'codeceptjs-rphelper',
};
