exports.config = {
  output: './output',
  helpers: {
    Puppeteer: {
      url: 'https://www.google.de/',
      show: false
    }
  },
  include: {},
  mocha: {},
  bootstrap: null,
  teardown: null,
  hooks: [],
  gherkin: {
    features: './features/*.feature',
    steps: ['./step_definitions/steps.js']
  },
  plugins: {
    screenshotOnFail: {
      enabled: true
    },
    retryFailedStep: {
      enabled: false
    },
    reportportal: {
      require: '../index',
      token: '0e1c3b00-b84b-48a7-8271-350aaf5089dc',
      endpoint: 'https://web.demo.reportportal.io/api/v1',
      launchName: 'This is demo launch',
      launchDescription: 'This is a description of your launch',
      launchAttributes: [{
        key: 'yourKey',
        value: 'yourValue'
      }],
      projectName: 'peterngtr_personal',
      rerun: false,
      debug: false,
      enabled: true
    }
  },
  tests: './*_test.js',
  timeout: 10000,
  name: 'codeceptjs-rphelper'
}