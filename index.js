const debug = require('debug')('codeceptjs:reportportal');
const {event, recorder, output, container} = codeceptjs;
const {clearString} = require('codeceptjs/lib/utils');
const sleep = require("sleep-promise");
const {
    screenshotHelpers,
    PREFIX_PASSED_STEP,
    PREFIX_SKIPPED_TEST,
    PREFIX_FAILED_TEST,
    PREFIX_PASSED_TEST, PREFIX_FAILED_STEP, PREFIX_BUG
} = require("./constants/codeceptjsTypes");
const {STATUSES} = require("./constants/statuses");
const {TEST_ITEM_TYPES} = require("./constants/testItemTypes");
const {LOG_LEVELS} = require("./constants/logLevels");
const {
    startLaunch, getRPLink, writePRInfo, startTestItem, logCurrent, rpStatus, finishStepItem, sendLogToRP,
    attachScreenshot, finishLaunch
} = require("./helpers/rpHelpers");
const {finishTestItem} = require("./helpers/rpHelpers");

const helpers = container.helpers();
let helper;

for (const helperName of screenshotHelpers) {
    if (Object.keys(helpers).indexOf(helperName) > -1) {
        helper = helpers[helperName];
    }
}

const defaultConfig = {
    token: '',
    endpoint: '',
    projectName: '',
    launchName: 'codeceptjs tests',
    launchDescription: '',
    attributes: [
        {
            key: 'agent',
            value: 'codeceptjs-rphelper',
        }
    ],
    debug: false,
    rerun: undefined,
    enabled: false
};

const requiredFields = ['projectName', 'token', 'endpoint'];

module.exports = (config) => {
    config = Object.assign(defaultConfig, config);

    for (let field of requiredFields) {
        if (!config[field]) throw new Error(`ReportPortal config is invalid. Key ${field} is missing in config.\nRequired fields: ${requiredFields} `)
    }

    let launchObj;
    let suiteObj;
    let testObj;
    let launchStatus = STATUSES.PASSED;
    let currentMetaSteps = [];
    let suiteArr = new Set();
    let testArr = [];
    let testResults = {
        suites: [],
        tests: {
            passed: [],
            failed: [],
            skipped: []
        }
    };

    let currenTestTitle;
    let currentSuiteTitle;

    event.dispatcher.on(event.suite.before, async (suite) => {
        await recorder.add(async () => {
            testResults.suites.push(suite);
        });
    });

    event.dispatcher.on(event.test.failed, async (test, err) => {
        await recorder.add(async () => {
            if (!process.env.RUNS_WITH_WORKERS) {
                testResults.tests.failed.push(test);
            }
        });

    });

    event.dispatcher.on(event.test.passed, async (test) => {
        await recorder.add(async () => {
            if (!process.env.RUNS_WITH_WORKERS) {
                testResults.tests.passed.push(test);
            }
        });
    });

    event.dispatcher.on(event.all.result, async () => {
        await recorder.add(async () => {
            if (!process.env.RUNS_WITH_WORKERS) {
                debug('Finishing launch...');
                await _sendResultsToRP(testResults);
            }
        });
    });

    event.dispatcher.on(event.workers.result, async (result) => {
        await recorder.add(async () => {
            await _sendResultsToRP(result);
        });
    });

    async function _sendResultsToRP(result) {
        for (suite of result.suites) {
            suiteArr.add(suite.title);
        }
        testArr = result.tests;

        launchObj = await startLaunch(config);
        const launchId = (await launchObj.promise).id;
        const launchLink = await getRPLink(config, launchId);
        writePRInfo(launchLink, config);

        const suiteTempIdArr = [];
        const testTempIdArr = [];

        for (suite of suiteArr) {
            suiteObj = await startTestItem(launchObj.tempId, suite, TEST_ITEM_TYPES.SUITE);
            suiteObj.status = (testArr.failed.length > 0) ? STATUSES.FAILED : STATUSES.PASSED;
            suiteTempIdArr.push({
                suiteTitle: suite,
                suiteTempId: suiteObj.tempId,
            });
            currentSuiteTitle = suite;
            await finishStepItem(suiteObj);
        }


        for (test of testArr.passed) {
            currenTestTitle = test.title;
            testObj = await startTestItem(launchObj.tempId, test.title, TEST_ITEM_TYPES.TEST, suiteTempIdArr.find((element) => element.suiteTitle === test.parent.title).suiteTempId, currentSuiteTitle);
            testObj.status = STATUSES.PASSED;

            testTempIdArr.push({
                testTitle: test.title,
                testTempId: testObj.tempId,
                testError: test.err,
                testSteps: test.steps,
            });

            const message = `${PREFIX_PASSED_TEST} - ${test.title}`;
            await sendLogToRP({tempId: testObj.tempId, level: LOG_LEVELS.INFO, message});
            await finishTestItem(testObj);
        }

        for (test of testArr.failed) {
            currenTestTitle = test.title;
            testObj = await startTestItem(launchObj.tempId, test.title, TEST_ITEM_TYPES.TEST, suiteTempIdArr.find((element) => element.suiteTitle === test.parent.title).suiteTempId, currentSuiteTitle);
            testObj.status = STATUSES.FAILED;
            launchStatus = STATUSES.FAILED;

            testTempIdArr.push({
                testTitle: test.title,
                testTempId: testObj.tempId,
                testError: test.err,
                testSteps: test.steps,
            });

            const message = `${PREFIX_FAILED_TEST} - ${test.title}\n${test.err.stack ? test.err.stack : JSON.stringify(test.err)}`;
            await sendLogToRP({tempId: testObj.tempId, level: LOG_LEVELS.ERROR, message});
            await finishTestItem(testObj);
        }

        for (test of testArr.skipped) {
            currenTestTitle = test.title;
            testObj = await startTestItem(launchObj.tempId, test.title, TEST_ITEM_TYPES.TEST, suiteTempIdArr.find((element) => element.suiteTitle === test.parent.title).suiteTempId, currentSuiteTitle);
            testObj.status = STATUSES.SKIPPED;

            testTempIdArr.push({
                testTitle: test.title,
                testTempId: testObj.tempId,
                testError: test.err,
                testSteps: test.steps,
            });

            const message = `${PREFIX_SKIPPED_TEST} - ${test.title}`;
            await sendLogToRP({tempId: testObj.tempId, level: LOG_LEVELS.INFO, message});
            await finishTestItem(testObj);
        }

        for (test of testTempIdArr) {
            for (step of test.testSteps) {
                if (!step) {
                    debug(`The ${test.testTitle} has no steps.`);
                    break;
                }
                const stepArgs = step.agrs ? step.agrs : step.args;
                const prefix = step.status === STATUSES.FAILED ? PREFIX_FAILED_STEP : PREFIX_PASSED_STEP;
                const stepTitle = stepArgs ? `${prefix}: ${step.actor} ${step.name} ${JSON.stringify(stepArgs.map(item => item && item._secret ? '*****' : JSON.stringify(item)).join(' '))}` : `${prefix}: - ${step.actor} ${step.name}`;

                await sleep(1);
                const stepObj = await startTestItem(launchObj.tempId, stepTitle.slice(0, 300), TEST_ITEM_TYPES.STEP, test.testTempId, currenTestTitle);

                stepObj.status = step.status === STATUSES.FAILED ? STATUSES.FAILED : STATUSES.PASSED;

                if (stepObj.status === STATUSES.FAILED) {
                    let stepMessage;
                    if (step.err) {
                        stepMessage = `${PREFIX_BUG}: ${(step.err.stack ? step.err.stack : JSON.stringify(step.err))}`;
                    } else if (step.helper.currentRunningTest.err) {
                        stepMessage = `${PREFIX_BUG}: ${JSON.stringify(step.helper.currentRunningTest.err)}`;
                    }
                    await sendLogToRP({tempId: stepObj.tempId, level: LOG_LEVELS.ERROR, message: stepMessage});

                    if (helper) {
                        const screenshot = await attachScreenshot(helper, `${clearString(test.testTitle)}.failed.png`);
                        await sendLogToRP({
                            tempId: stepObj.tempId,
                            level: LOG_LEVELS.DEBUG,
                            message: '📷 Last seen screenshot',
                            screenshotData: screenshot,
                        });
                    }
                }

                await finishStepItem(stepObj);
            }
        }

        await finishLaunch(launchObj, launchStatus);
    }

    async function startMetaSteps(step, parentTitle) {
        let metaStepObj = {};
        const metaSteps = metaStepsToArray(step.metaStep);

        // close current metasteps
        for (let j = currentMetaSteps.length - 1; j >= metaSteps.length; j--) {
            await finishStep(currentMetaSteps[j]);
        }

        for (const i in metaSteps) {
            const metaStep = metaSteps[i];
            if (isEqualMetaStep(metaStep, currentMetaSteps[i])) {
                metaStep.tempId = currentMetaSteps[i].tempId;
                continue;
            }
            // close metasteps other than current
            for (let j = currentMetaSteps.length - 1; j >= i; j--) {
                await finishStep(currentMetaSteps[j]);
                delete currentMetaSteps[j];
            }

            metaStepObj = currentMetaSteps[i - 1] || metaStepObj;

            const isNested = !!metaStepObj.tempId;
            metaStepObj = startTestItem(launchObj.tempId, metaStep.toString(), TEST_ITEM_TYPES.STEP, metaStepObj.tempId || testObj.tempId, parentTitle);
            metaStep.tempId = metaStepObj.tempId;
            debug(`${metaStep.tempId}: The stepId '${metaStep.toString()}' is started. Nested: ${isNested}`);
        }

        currentMetaSteps = metaSteps;
        return currentMetaSteps[currentMetaSteps.length - 1] || testObj;
    }

    function finishStep(step) {
        if (!step.tempId) {
            debug(`WARNING: '${step.toString()}' step can't be closed, it has no tempId`);
            return;
        }
        debug(`Finishing '${step.toString()}' step`);

        return finishStepItem(step);
    }

    return {
        addLog: logCurrent,
    };
};

function metaStepsToArray(step) {
    let metaSteps = [];
    iterateMetaSteps(step, metaStep => metaSteps.push(metaStep));
    return metaSteps;
}

function iterateMetaSteps(step, fn) {
    if (step && step.metaStep) iterateMetaSteps(step.metaStep, fn);
    if (step) fn(step);
}


const isEqualMetaStep = (metastep1, metastep2) => {
    if (!metastep1 && !metastep2) return true;
    if (!metastep1 || !metastep2) return false;
    return metastep1.actor === metastep2.actor
        && metastep1.name === metastep2.name
        && metastep1.args.join(',') === metastep2.args.join(',');
};
