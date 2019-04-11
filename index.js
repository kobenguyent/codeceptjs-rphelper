const RPClient = require('reportportal-client');
const fs = require('fs');
const path = require('path');
const event = require('codeceptjs').event;
const container = require('codeceptjs').container;
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

event.dispatcher.on(event.test.failed, (test, err) => {
    test.err = err.message;
});

class ReportPortalHelper extends Helper {

    constructor(config) {
        super(config);
    }

    async _updateStep(step, status) {
        await this._finishTestItem(launchObj, itemObj, step, status);
    }

    async _passed() {
        await this._updateStep(stepInfo, 'PASSED');
    }

    async _failed(test) {
        this.errMsg = test.err;

        let helpers = container.helpers();
        for (const helperName of supportedHelpers) {
            if (Object.keys(helpers).indexOf(helperName) > -1) {
                this.helper = helpers[helperName];
            }
        }

        fileName = `${this.now()}_failed.png`;
        logFile = `${this.now()}_browser.logs.txt`;
        await this.helper.saveScreenshot(fileName);
        await this._updateStep(stepInfo, 'FAILED');
    }

    async _startLaunch(suiteTitle) {
        rpClient = new RPClient({
            token: this.config.token,
            endpoint: this.config.endpoint,
            project: this.config.projectName,
            debug: this.config.debug,
        });

        return rpClient.startLaunch({
            name: suiteTitle,
            start_time: rpClient.helpers.now(),
            description: suiteTitle
        });
    }

    async _startTestItem(launchObj, testTitle) {
        return rpClient.startTestItem({
            description: testTitle,
            name: testTitle,
            start_time: rpClient.helpers.now(),
            type: 'SCENARIO'
        }, launchObj.tempId);
    }

    async _finishTestItem(launchObj, itemObj, step, status) {
        if (status === 'FAILED') {
            const browserLogs = await this.helper.grabBrowserLogs();
            fs.writeFileSync(path.join(global.output_dir, logFile), util.inspect(browserLogs));

            rpClient.sendLog(itemObj.tempId, {
                level: 'error',
                message: `[FAILED STEP] ${step.actor} ${step.name} , ${step.args.join(',')} due to ${this.errMsg}`,
                time: step.startTime
            }, {
                    name: fileName,
                    type: 'image/png',
                    content: fs.readFileSync(path.join(global.output_dir, fileName)),
                });

            fs.unlinkSync(path.join(global.output_dir, fileName));

            rpClient.sendLog(itemObj.tempId, {
                level: 'trace',
                message: `[BROWSER LOGS FOR FAILED STEP] ${step.actor} ${step.name} , ${step.args.join(',')} due to ${this.errMsg}`,
                time: step.startTime
            }, {
                    name: logFile,
                    type: 'text/plain',
                    content: fs.readFileSync(path.join(global.output_dir, logFile)),
                });
            
            fs.unlinkSync(path.join(global.output_dir, logFile));
        }

        rpClient.finishTestItem(itemObj.tempId, {
            'end_time': step.endTime,
            'status': status,
        })

        rpClient.updateLaunch(
            launchObj.tempId, {
                'status': status
            }
        );
    }

    async _finishLaunch(launchObj) {
        rpClient.finishLaunch(launchObj.tempId, {
            end_time: rpClient.helpers.now()
        });
    }

    async _beforeStep(step) {
        stepInfo = step;
    }

    async _afterStep(step) {
        rpClient.sendLog(itemObj.tempId, {
            level: 'info',
            message: `[STEP] ${step.actor} ${step.name} , ${step.args.join(',')}`,
            time: step.startTime
        })
    }

    async _beforeSuite(suite) {
        launchObj = await this._startLaunch(suite.title);
    }

    async _afterSuite() {
        await this._finishLaunch(launchObj);
    }

    async _before(test) {
        itemObj = await this._startTestItem(launchObj, test.title);
    }

    now() {
        return new Date().valueOf();
    }
}

module.exports = ReportPortalHelper;
