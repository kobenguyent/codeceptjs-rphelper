const RPClient = require('reportportal-client');
const fs = require('fs');
const path = require('path');
const util = require('util');
const event = require('codeceptjs').event;
const Container = require('codeceptjs').container;
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
  'Playwright'
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
  enabled: false
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
  let beforeSuiteStatus = 'failed';
  let launchStatus = 'PASSED';

  event.dispatcher.on(event.all.before, () => {
    launchObj = _startLaunch();
  });

  event.dispatcher.on(event.suite.before, (suite) => {
    suiteObj = _startTestItem(launchObj, suite.title, 'SUITE');
    beforeSuiteStatus = 'PASSED';
  });

  event.dispatcher.on(event.all.after, () => {
    if (stepInfo) {
      rpClient.finishTestItem(suiteObj.tempId, {
        endTime: stepInfo.endTime,
        status: beforeSuiteStatus,
      });
    } else {
      rpClient.finishTestItem(suiteObj.tempId, {
        status: 'PASSED',
      });
    }
  });

  event.dispatcher.on(event.test.before, (test) => {
    testObj = _startTestItem(launchObj, test.title, 'TEST', suiteObj.tempId);
  });

  event.dispatcher.on(event.step.started, (step) => {
    stepObj = _startTestItem(launchObj, step.toString(), 'STEP', testObj.tempId);
  });

  event.dispatcher.on(event.step.finished, (step) => {
    console.log(step);
    _finishTestItem(launchObj, stepObj, undefined, 'PASSED');
  });

  event.dispatcher.on(event.test.finished, (test) => {
    _finishTestItem(launchObj, testObj, undefined, 'PASSED');
  });

  event.dispatcher.on(event.test.passed, (test) => {
    _updateStep(stepInfo, 'PASSED');
  });

  event.dispatcher.on(event.test.failed, (test, err) => {
    launchStatus = 'failed';
    this.errMsg = err.message;
    _updateStep(stepInfo, 'failed');
  });

  event.dispatcher.on(event.all.after, () => {
    _finishLaunch(launchObj);
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

  function _startTestItem(launchObject, testTitle, method, suiteId = null) {
    try {
      return rpClient.startTestItem({
        description: testTitle,
        name: testTitle,
        type: method,
      }, launchObject.tempId, suiteId);
    } catch (error) {
      console.log(error);
    }

  }

  function _finishTestItem(launchObject, itemObject, step, status) {
    if (step) {
      if (status === 'failed') {
        if (helper) {
          fileName = `${rpClient.helpers.now()}_failed.png`;
          logFile = `${rpClient.helpers.now()}_browser.logs.txt`;
          helper.saveScreenshot(fileName).then(() => {
            rpClient.sendLog(itemObject.tempId, {
              level: 'error',
              message: `[FAILED STEP] ${stepInfo.actor} ${stepInfo.name} , ${stepInfo.args.join(',')} due to ${this.errMsg}`,
              time: stepInfo.startTime,
            }, {
              name: fileName,
              type: 'image/png',
              content: fs.readFileSync(path.join(global.output_dir, fileName)),
            });

            fs.unlinkSync(path.join(global.output_dir, fileName));
          });

          helper.grabBrowserLogs().then((browserLogs) => {
            fs.writeFileSync(path.join(global.output_dir, logFile), util.inspect(browserLogs));

            rpClient.sendLog(itemObject.tempId, {
              level: 'trace',
              message: `[BROWSER LOGS FOR FAILED STEP] ${stepInfo.actor} ${stepInfo.name} , ${stepInfo.args.join(',')} due to ${this.errMsg}`,
              time: stepInfo.startTime,
            }, {
              name: logFile,
              type: 'text/plain',
              content: fs.readFileSync(path.join(global.output_dir, logFile)),
            });

            fs.unlinkSync(path.join(global.output_dir, logFile));
          });
        }


        rpClient.sendLog(itemObject.tempId, {
          level: 'error',
          message: `This step failed due to ${this.errMsg}`,
          time: rpClient.helpers.now(),
        });
      }

      rpClient.finishTestItem(itemObject.tempId, {
        endTime: step.endTime,
        status,
      });
    } else {
      try {
        rpClient.finishTestItem(itemObject.tempId, {
          status,
        });
      } catch (error) {
        console.log(error);
      }
    }
  }

  function _finishLaunch(launchObject) {
    try {
      rpClient.finishLaunch(launchObject.tempId, {
        status: launchStatus,
      });
    } catch (error) {
      console.log(error);
    }

  }

  function _updateStep(step, status) {
    _finishTestItem(launchObj, stepObj, step, status);
  }

  return this;
};
