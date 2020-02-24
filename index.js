const RPClient = require('reportportal-client');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { event, output } = require('codeceptjs');
const Container = require('codeceptjs').container;

output.level(3);
const helpers = Container.helpers();
let helper;

const supportedHelpers = [
  'Mochawesome',
  'WebDriver',
  'Protractor',
  'Appium',
  'Nightmare',
  'Puppeteer',
  'TestCafe',
  'Playwright',
];

for (const helperName of supportedHelpers) {
  if (Object.keys(helpers).indexOf(helperName) > -1) {
    helper = helpers[helperName];
  }
}

const defaultConfig = {
  token: '',
  endpoint: '',
  project: '',
  launchDescription: '',
  attributes: [],
  debug: false,
  rerun: undefined,
  enabled: false,
};

module.exports = (config) => {
  config = Object.assign(defaultConfig, config);

  let launchObj;
  let suiteObj;
  let testObj;
  let fileName;
  let stepInfo;
  let stepObj;
  let rpClient;
  let logFile;
  let beforeSuiteStatus = 'FAILED';
  let launchStatus = 'PASSED';
  let currentTest;
  let currentStep;

  event.dispatcher.on(event.all.before, () => {
    launchObj = _startLaunch();
    output.log(`${launchObj.tempId}: The launchId is started.`);
  });

  event.dispatcher.on(event.suite.before, (suite) => {
    suiteObj = _startTestItem(launchObj, suite.title, 'SUITE');
    output.log(`${suiteObj.tempId}: The suiteId is started.`);
    beforeSuiteStatus = 'PASSED';
  });

  event.dispatcher.on(event.all.result, () => {
    if (stepInfo) {
      rpClient.finishTestItem(suiteObj.tempId, {
        endTime: stepInfo.endTime,
        status: beforeSuiteStatus,
      });
    } else {
      suiteObj.promise.then(() => {
        rpClient.finishTestItem(suiteObj.tempId, {
          status: 'PASSED',
        });
      });
    }
    _finishLaunch(launchObj);
  });

  event.dispatcher.on(event.test.before, (test) => {
    currentTest = test;
    currentStep = null;
    testObj = _startTestItem(launchObj, test.title, 'TEST', suiteObj.tempId, false);
    output.log(`${testObj.tempId}: The testId is started.`);
  });

  event.dispatcher.on(event.test.started, (test) => {
    currentTest = test;
  });

  event.dispatcher.on(event.step.started, (step) => {
    if (currentStep !== step) {
      stepObj = _startTestItem(launchObj, step.toString(), 'STEP', testObj.tempId, false);
      currentStep = step;
      output.log(`${stepObj.tempId}: The stepId is started.`);
    }
  });

  event.dispatcher.on(event.step.passed, (step) => {
    if (currentStep === step) {
      currentStep = null;
      _finishTestItem(launchObj, stepObj, step, step.status);
      output.log(`${stepObj.tempId}: The ${step.status} stepId is updated.`);
    }
  });

  event.dispatcher.on(event.step.failed, (step) => {
    if (currentStep === step) {
      this.step = step;
      launchStatus = 'FAILED';
      currentStep = null;
      if (helper) {
        fileName = `${rpClient.helpers.now()}_failed.png`;
        logFile = `${rpClient.helpers.now()}_browser.logs.txt`;
        helper.saveScreenshot(fileName).then(() => {
          _attachScreenshot(stepObj, this.step, fileName);
          _finishTestItem(launchObj, stepObj, step, step.status);
          output.log(`${stepObj.tempId}: The ${step.status} stepId is updated.`);
        });
      }
    }
  });

  event.dispatcher.on(event.test.passed, () => {
    launchStatus = 'PASSED';
    _finishTestItem(launchObj, testObj, undefined, 'PASSED');
  });

  event.dispatcher.on(event.test.failed, (test, err) => {
    launchStatus = 'FAILED';
    this.step.err = err;
  });

  event.dispatcher.on(event.test.finished, (test) => {
    _finishTestItem(launchObj, testObj, undefined, test.state);
  });

  function _startLaunch(suiteTitle) {
    rpClient = new RPClient({
      token: config.token,
      endpoint: config.endpoint,
      project: config.projectName,
      debug: config.debug,
    });

    return rpClient.startLaunch({
      name: config.launchName || suiteTitle,
      description: config.launchDescription,
      attributes: config.launchAttributes,
      rerun: config.rerun,
      rerunOf: config.rerunOf,
    });
  }

  function _startTestItem(launchObj, testTitle, method, suiteId = null, hasStats = true) {
    try {
      return rpClient.startTestItem({
        description: testTitle,
        name: testTitle,
        type: method,
        hasStats,
      }, launchObj.tempId, suiteId);
    } catch (error) {
      output.err(error);
    }
  }

  function _finishTestItem(launchObj, itemObject, step, status) {
    if (status === 'success') {
      status = 'PASSED';
    }

    if (step) {
      rpClient.finishTestItem(itemObject.tempId, {
        endTime: step.endTime || rpClient.helpers.now(),
        status,
      });
    } else {
      try {
        rpClient.finishTestItem(itemObject.tempId, {
          status,
        });
      } catch (error) {
        output.err(error);
      }
    }
  }

  function _finishLaunch(launchObject) {
    try {
      rpClient.finishLaunch(launchObject.tempId, {
        status: launchStatus,
      });
    } catch (error) {
      output.err(error);
    }
  }

  function _attachScreenshot(itemObject, step, fileName) {
    try {
      rpClient.sendLog(itemObject.tempId, {
        level: 'error',
        message: `[FAILED STEP] ${step.toString()} due to ${step.err}`,
        time: step.startTime,
      }, {
        name: fileName,
        type: 'image/png',
        content: fs.readFileSync(path.join(global.output_dir, fileName)),
      });

      fs.unlinkSync(path.join(global.output_dir, fileName));
      output.log('Screenshot is attached to failed step');
    } catch (error) {
      output.error(error);
    }
  }

  function _attachLogs(itemObject, step, logFile) {
    try {
      fs.writeFileSync(path.join(global.output_dir, logFile), util.inspect(browserLogs));

      rpClient.sendLog(itemObject.tempId, {
        level: 'trace',
        message: `[BROWSER LOGS FOR FAILED STEP] ${step.toString()} due to ${step.err}`,
        time: step.startTime,
      }, {
        name: logFile,
        type: 'text/plain',
        content: fs.readFileSync(path.join(global.output_dir, logFile)),
      });

      fs.unlinkSync(path.join(global.output_dir, logFile));
      output.log('Browser logs are attached to failed step');
    } catch (error) {
      output.error(error);
    }
  }
  return this;
};
