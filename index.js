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
const {LAUNCH_MODES} = require("./constants/launchModes");
const {
    startLaunch, getRPLink, writePRInfo, startTestItem, logCurrent, rpStatus, finishStepItem, sendLogToRP,
    attachScreenshot, finishLaunch
} = require("./helpers/rpHelpers");

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
    let stepObj;
    let failedStep;
    let rpClient;

    let suiteStatus = STATUSES.PASSED;
    let launchStatus = STATUSES.PASSED;
    let currentMetaSteps = [];
    let suiteArr = new Set();
    let testArr = [];

    let currenTestTitle;
    let currentSuiteTitle;

    event.dispatcher.on(event.all.before, async () => {
        if (!process.env.RUNS_WITH_WORKERS) {
            launchObj = startLaunch(config);
            try {
                await launchObj.promise;
                const launchId = (await launchObj.promise).id;
                const launchLink = await getRPLink(config, launchId);
                writePRInfo(launchLink, config);
            } catch (err) {
                output.error(`❌ Can't connect to ReportPortal, exiting...`);
                output.error(err);
                process.exit(1);
            }
            const outputLog = output.log;
            const outputDebug = output.debug;
            const outputError = output.error;

            output.log = (message) => {
                outputLog(message);
                logCurrent({level: LOG_LEVELS.TRACE, message});
            }

            output.debug = (message) => {
                outputDebug(message);
                logCurrent({level: LOG_LEVELS.DEBUG, message});
            }

            output.error = (message) => {
                outputError(message);
                logCurrent({level: LOG_LEVELS.ERROR, message});
            }
        }
    });

    event.dispatcher.on(event.suite.before, async (suite) => {
        await recorder.add(async () => {
            if (!process.env.RUNS_WITH_WORKERS) {
                suiteObj = await startTestItem(launchObj.tempId, suite.title, TEST_ITEM_TYPES.SUITE);
                debug(`${suiteObj.tempId}: The suiteId '${suite.title}' is started.`);
                suite.tempId = suiteObj.tempId;
                suiteStatus = STATUSES.PASSED;
            }
        });
    });

    event.dispatcher.on(event.test.before, async (test) => {
        await recorder.add(async () => {
            if (!process.env.RUNS_WITH_WORKERS) {
                currentMetaSteps = [];
                stepObj = null;
                testObj = await startTestItem(launchObj.tempId, test.title, TEST_ITEM_TYPES.TEST, suiteObj.tempId);
                test.tempId = testObj.tempId;
                failedStep = null;
                debug(`${testObj.tempId}: The testId '${test.title}' is started.`);
            }
        })
    });

    event.dispatcher.on(event.step.before, async (step) => {
        await recorder.add(async () => {
            if (!process.env.RUNS_WITH_WORKERS) {
                const parent = await startMetaSteps(step);
                stepObj = await startTestItem(launchObj.tempId, step.toString().slice(0, 300), TEST_ITEM_TYPES.STEP, parent.tempId);
                step.tempId = stepObj.tempId;
            }
        })
    });

    event.dispatcher.on(event.step.after, (step) => {
        recorder.add(() => {
            if (!process.env.RUNS_WITH_WORKERS) {
                finishStep(step)
            }
        });
    });

    event.dispatcher.on(event.step.failed, (step) => {
        if (!process.env.RUNS_WITH_WORKERS) {
            for (const metaStep of currentMetaSteps) {
                if (metaStep) metaStep.status = STATUSES.FAILED;
            }
            if (step && step.tempId) failedStep = Object.assign({}, step);
        }
    });

    event.dispatcher.on(event.step.passed, (step, err) => {
        if (!process.env.RUNS_WITH_WORKERS) {
            for (const metaStep of currentMetaSteps) {
                metaStep.status = STATUSES.PASSED;
            }
            failedStep = null;
        }
    });

    event.dispatcher.on(event.test.failed, async (test, err) => {
        if (!process.env.RUNS_WITH_WORKERS) {
            launchStatus = STATUSES.FAILED;
            suiteStatus = STATUSES.FAILED;

            if (failedStep && failedStep.tempId) {
                const step = failedStep;

                debug(`Attaching screenshot & error to failed step`);

                const screenshot = await attachScreenshot(helper, `${clearString(test.testTitle)}.failed.png`);

                await rpClient.sendLog(step.tempId, {
                    level: LOG_LEVELS.ERROR,
                    message: `${err.stack}`,
                    time: step.startTime,
                }, screenshot).promise;

            }

            if (!test.tempId) return;

            debug(`${test.tempId}: ${PREFIX_FAILED_TEST}: '${test.title}'`);

            if (!failedStep) {
                await rpClient.sendLog(test.tempId, {
                    level: LOG_LEVELS.ERROR,
                    message: `${err.stack}`,
                }).promise;
            }

            rpClient.finishTestItem(test.tempId, {
                endTime: test.endTime || rpClient.helpers.now(),
                status: STATUSES.FAILED,
                message: `${err.stack}`,
            });
        }
    });

    event.dispatcher.on(event.test.passed, (test) => {
        if (!process.env.RUNS_WITH_WORKERS) {
            debug(`${test.tempId}: Test '${test.title}' passed.`);
            rpClient.finishTestItem(test.tempId, {
                endTime: test.endTime || rpClient.helpers.now(),
                status: STATUSES.PASSED,
            });
        }
    });

    event.dispatcher.on(event.test.after, (test) => {
        if (!process.env.RUNS_WITH_WORKERS) {
            recorder.add(async () => {
                debug(`closing ${currentMetaSteps.length} metasteps for failed test`);
                if (failedStep) await finishStep(failedStep);
                await Promise.all(currentMetaSteps.reverse().map(m => finishStep(m)));
                stepObj = null;
                testObj = null;
            });
        }
    });

    event.dispatcher.on(event.suite.after, (suite) => {
        if (!process.env.RUNS_WITH_WORKERS) {
            recorder.add(async () => {
                debug(`${suite.tempId}: Suite '${suite.title}' finished ${suiteStatus}.`);
                return rpClient.finishTestItem(suite.tempId, {
                    endTime: suite.endTime || rpClient.helpers.now(),
                    status: rpStatus(suiteStatus)
                });
            });
        }
    });

    event.dispatcher.on(event.all.result, async () => {
        if (!process.env.RUNS_WITH_WORKERS) {
            debug('Finishing launch...');
            if (suiteObj) {
                await rpClient.finishTestItem(suiteObj.tempId, {
                    status: suiteStatus,
                }).promise;
            }
            await finishLaunch(launchObj, launchStatus);
        }
    });

    event.dispatcher.on(event.workers.result, async (result) => {
        await recorder.add(async () => {
            await _sendResultsToRP(result);
        });
    });

    async function _sendResultsToRP(result) {
        if (result) {
            for (suite of result.suites) {
                suiteArr.add(suite.title);
            }
            testArr = result.tests;
        }

        launchObj = await startLaunch(config);
        await launchObj.promise;
        const launchId = (await launchObj.promise).id;
        const launchLink = await getRPLink(config, launchId);
        writePRInfo(launchLink, config);

        const suiteTempIdArr = [];
        const testTempIdArr = [];

        for (suite of suiteArr) {
            suiteObj = await startTestItem(launchObj.tempId, suite, TEST_ITEM_TYPES.SUITE);
            suiteObj.status = STATUSES.PASSED;
            suiteTempIdArr.push({
                suiteTitle: suite,
                suiteTempId: suiteObj.tempId,
            });
            currentSuiteTitle = suite;
            await finishStepItem(suiteObj);
        }

        if (process.env.RUNS_WITH_WORKERS) {
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
                await finishStepItem(testObj);
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
                await finishStepItem(testObj);
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
                await finishStepItem(testObj);
            }
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

    async function startMetaSteps(step) {
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
            metaStepObj = startTestItem(launchObj.tempId, metaStep.toString(), rp_STEP, metaStepObj.tempId || testObj.tempId);
            metaStep.tempId = metaStepObj.tempId;
            debug(`${metaStep.tempId}: The stepId '${metaStep.toString()}' is started. Nested: ${isNested}`);
        }

        currentMetaSteps = metaSteps;
        return currentMetaSteps[currentMetaSteps.length - 1] || testObj;
    }

    function finishStep(step) {
        if (!step) return;
        if (!step.tempId) {
            debug(`WARNING: '${step.toString()}' step can't be closed, it has no tempId`);
            return;
        }
        debug(`Finishing '${step.toString()}' step`);

        return rpClient.finishTestItem(step.tempId, {
            endTime: rpClient.helpers.now(),
            status: rpStatus(step.status),
        });
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
