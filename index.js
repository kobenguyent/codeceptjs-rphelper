const RPClient = require('reportportal-client');
const fs = require('fs');
const path = require('path');
const { event } = require('codeceptjs');
const { container } = require('codeceptjs');
const util = require('util');

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

event.dispatcher.on(event.test.failed, (test, err) => {
  test.err = err.message;
});

class ReportPortalHelper extends Helper {
  async _updateStep(step, status) {
    await this._finishTestItem(launchObj, itemObj, step, status);
  }

  async _passed() {
    await this._updateStep(stepInfo, 'passed');
  }

  async _failed(test) {
    this.errMsg = test.err;

    const helpers = container.helpers();

    supportedHelpers.forEach((helperName) => {
      if (Object.keys(helpers).indexOf(helperName) > -1) {
        this.helper = helpers[helperName];
      }
    });

    fileName = `${this.now()}_failed.png`;
    logFile = `${this.now()}_browser.logs.txt`;
    await this.helper.saveScreenshot(fileName);
    await this._updateStep(stepInfo, 'failed');
  }

  async _startLaunch(suiteTitle) {
    rpClient = new RPClient({
      token: this.config.token,
      endpoint: this.config.endpoint,
      project: this.config.projectName,
      debug: this.config.debug,
    });

    return rpClient.startLaunch({
      name: this.config.launchName || suiteTitle,
      start_time: rpClient.helpers.now(),
      description: this.config.launchDescription || '',
    });
  }

  async _startTestItem(launchObject, testTitle, method, suiteId = null) {
    return rpClient.startTestItem({
      description: testTitle,
      name: testTitle,
      start_time: rpClient.helpers.now(),
      type: method,
    }, launchObject.tempId, suiteId);
  }

  async _finishTestItem(launchObject, itemObject, step, status) {
    if (status === 'failed') {
      const browserLogs = await this.helper.grabBrowserLogs();
      fs.writeFileSync(path.join(global.output_dir, logFile), util.inspect(browserLogs));

      rpClient.sendLog(itemObject.tempId, {
        level: 'error',
        message: `[FAILED STEP] ${step.actor} ${step.name} , ${step.args.join(',')} due to ${this.errMsg}`,
        time: step.startTime,
      }, {
        name: fileName,
        type: 'image/png',
        content: fs.readFileSync(path.join(global.output_dir, fileName)),
      });

      fs.unlinkSync(path.join(global.output_dir, fileName));

      rpClient.sendLog(itemObject.tempId, {
        level: 'trace',
        message: `[BROWSER LOGS FOR FAILED STEP] ${step.actor} ${step.name} , ${step.args.join(',')} due to ${this.errMsg}`,
        time: step.startTime,
      }, {
        name: logFile,
        type: 'text/plain',
        content: fs.readFileSync(path.join(global.output_dir, logFile)),
      });

      fs.unlinkSync(path.join(global.output_dir, logFile));
    }

    rpClient.finishTestItem(itemObject.tempId, {
      end_time: step.endTime,
      status,
    });

    rpClient.updateLaunch(
      launchObject.tempId, {
        status,
      },
    );
  }

  async _finishLaunch(launchObject) {
    return rpClient.finishLaunch(launchObject.tempId, {
      end_time: rpClient.helpers.now(),
      status: 'passed',
    });
  }

  async _beforeStep(step) {
    stepInfo = step;
  }

  async _afterStep(step) {
    rpClient.sendLog(itemObj.tempId, {
      level: 'info',
      message: `[STEP] ${step.actor} ${step.name} , ${step.args.join(',')}`,
      time: step.startTime,
    });
  }

  async _init() {
    launchObj = await this._startLaunch();
  }

  async _beforeSuite(suite) {
    itemObj = await this._startTestItem(launchObj, suite.title, 'SUITE');
    suiteTempId = itemObj.tempId;
    beforeSuiteStatus = 'passed';
  }

  async _afterSuite() {
    rpClient.finishTestItem(suiteTempId, {
      end_time: stepInfo.endTime,
      status: beforeSuiteStatus,
    });
  }

  async _finishTest() {
    await this._finishLaunch(launchObj);
  }

  async _before(test) {
    itemObj = await this._startTestItem(launchObj, test.title, 'TEST', suiteTempId);
  }

  now() {
    return new Date().valueOf();
  }
}

module.exports = ReportPortalHelper;
