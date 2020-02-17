const RPClient = require('reportportal-client');
const fs = require('fs');
const path = require('path');
const util = require('util');

const Helper = codecept_helper;

const supportedHelpers = [
  'Mochawesome',
  'WebDriverIO',
  'WebDriver',
  'Protractor',
  'Appium',
  'Nightmare',
  'Puppeteer',
];
let launchObj;
let itemObj;
let fileName;
let stepInfo;
let rpClient;
let logFile;
let suiteTempId;
let beforeSuiteStatus = 'failed';
let launchStatus = 'passed';

class ReportPortalHelper extends Helper {
  _updateStep(step, status) {
    this._finishTestItem(launchObj, itemObj, step, status);
  }

  _passed() {
    this._updateStep(stepInfo, 'passed');
  }

  async _failed(test) {
    launchStatus = 'failed';
    this.errMsg = test.err.message;
    this._updateStep(stepInfo, 'failed');
  }

  _startLaunch(suiteTitle) {
    rpClient = new RPClient({
      token: this.config.token,
      endpoint: this.config.endpoint,
      project: this.config.projectName,
      debug: this.config.debug,
    });

    return rpClient.startLaunch({
      name: this.config.launchName || suiteTitle,
      description: this.config.launchDescription || '',
      attributes: this.config.launchAttributes || [],
      rerun: this.config.rerun || false,
      rerunOf: this.config.rerunOf || undefined,
    });
  }

  _startTestItem(launchObject, testTitle, method, suiteId = null) {
    return rpClient.startTestItem({
      description: testTitle,
      name: testTitle,
      type: method,
    }, launchObject.tempId, suiteId);
  }

  _finishTestItem(launchObject, itemObject, step, status) {
    if (step) {
      if (status === 'failed') {
        supportedHelpers.forEach(async (helperName) => {
          if (Object.keys(this.helpers).indexOf(helperName) > -1) {
            this.helper = this.helpers[helperName];
            fileName = `${rpClient.helpers.now()}_failed.png`;
            logFile = `${rpClient.helpers.now()}_browser.logs.txt`;
            this.helper.saveScreenshot(fileName).then(() => {
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

            this.helper.grabBrowserLogs().then((browserLogs) => {
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
        });

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

  _finishLaunch(launchObject) {
    rpClient.finishLaunch(launchObject.tempId, {
      status: launchStatus,
    });
  }

  _beforeStep(step) {
    if (step) {
      stepInfo = step;
    }
  }

  _afterStep(step) {
    rpClient.sendLog(itemObj.tempId, {
      level: 'info',
      message: `[STEP] ${step.actor} ${step.name} , ${step.args.join(',')}`,
      time: step.startTime,
    });
  }

  _init() {
    launchObj = this._startLaunch();
  }

  _beforeSuite(suite) {
    itemObj = this._startTestItem(launchObj, suite.title, 'SUITE');
    suiteTempId = itemObj.tempId;
    beforeSuiteStatus = 'passed';
  }

  _afterSuite() {
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
  }

  _finishTest() {
    this._finishLaunch(launchObj);
  }

  _before(test) {
    itemObj = this._startTestItem(launchObj, test.title, 'TEST', suiteTempId);
  }
}

module.exports = ReportPortalHelper;
