const RPClient = require('reportportal-client');
const fs = require('fs');
const path = require('path');
const util = require('util');
const event = require('codeceptjs').event;
const Container = require('codeceptjs').container;
const helpers = Container.helpers();
let helper;
let launchObj;
let itemObj;
let fileName;
let stepInfo;
let rpClient;
let logFile;
let suiteTempId;
let beforeSuiteStatus = 'failed';
let launchStatus = 'passed';

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

  event.dispatcher.on(event.all.before, () => {
		launchObj = _startLaunch();
  });

  event.dispatcher.on(event.suite.before, (suite) => {
    itemObj = _startTestItem(launchObj, suite.title, 'SUITE');
    suiteTempId = itemObj.tempId;
    beforeSuiteStatus = 'passed';
  });

  event.dispatcher.on(event.suite.after, () => {
    if (stepInfo) {
      rpClient.finishTestItem(suiteTempId, {
        endTime: stepInfo.endTime,
        status: beforeSuiteStatus,
      });
    } else {
      rpClient.finishTestItem(suiteTempId, {
        status: 'RESTED',
      });
    }
  });

  event.dispatcher.on(event.test.before, (test) => {
    itemObj = _startTestItem(launchObj, test.title, 'STEP', suiteTempId);
  });

  event.dispatcher.on(event.test.passed, (test) => {
    _updateStep(stepInfo, 'passed');
  });
  
  event.dispatcher.on(event.test.failed, (test, err) => {
    launchStatus = 'failed';
    this.errMsg = err.message;
    _updateStep(stepInfo, 'failed');
  });
  
  event.dispatcher.on(event.test.finished, () => {
    _finishLaunch(launchObj);
  });
  
  function _startLaunch(suiteTitle) {
    rpClient = new RPClient({
      token: this.config.token,
      endpoint: this.config.endpoint,
      project: this.config.projectName,
      debug: this.config.debug,
    });
  
    return rpClient.startLaunch({
      name: this.config.launchName || suiteTitle,
      description: this.config.launchDescription,
      attributes: this.config.launchAttributes,
      rerun: this.config.rerun,
      rerunOf: this.config.rerunOf,
    });
  }

  function _startTestItem(launchObject, testTitle, method, suiteId = null) {
    return rpClient.startTestItem({
      description: testTitle,
      name: testTitle,
      type: method,
    }, launchObject.tempId, suiteId);
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
      rpClient.finishTestItem(itemObject.tempId, {
        status,
      });
    }
  }

  function _finishLaunch(launchObject) {
    rpClient.finishLaunch(launchObject.tempId, {
      status: launchStatus,
    });
  }

  function  _updateStep(step, status) {
    _finishTestItem(launchObj, itemObj, step, status);
  }
  
  return this;
};

module.exports = ReportPortal;
