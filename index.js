const RPClient = require('@reportportal/client-javascript');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('codeceptjs:reportportal');
const { event, recorder, output, container } = codeceptjs;
const axios = require('axios').default;
const restClient = axios.create();
const { clearString } = require('codeceptjs/lib/utils');

const helpers = container.helpers();
let helper;

const rp_FAILED = 'FAILED';
const rp_PASSED = 'PASSED';
const rp_SKIPPED = 'SKIPPED';
const rp_SUITE = 'SUITE';
const rp_TEST = 'TEST';
const rp_STEP = 'STEP';

const screenshotHelpers = [
  'WebDriver',
  'Appium',
  'Puppeteer',
  'TestCafe',
  'Playwright',
];

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
  attributes: [],
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

  let reportUrl;
  let launchObj;
  let suiteObj;
  let testObj;
  let stepObj;
  let failedStep;
  let rpClient;

  let suiteStatus = rp_PASSED;
  let launchStatus = rp_PASSED;
  let currentMetaSteps = [];
  let suiteArr = new Set();
  let testArr = [];
  let stepArr = [];

  function logCurrent(data, file) {
    const obj = stepObj || testObj;
    if (obj) rpClient.sendLog(obj.tempId, data, file);
  }

  event.dispatcher.on(event.all.before, async () => {
    if (!process.env.RUNS_WITH_WORKERS) {
      launchObj = startLaunch();
      try {
        await launchObj.promise;
        const launchId = (await launchObj.promise).id;
      } catch (err) {
        output.error(`❌ Can't connect to ReportPortal, exiting...`);
        output.error(err);
        process.exit(1);
      }
      output.print(`📋 Writing results to ReportPortal: ${config.projectName} > ${config.endpoint}`);

      const outputLog = output.log;
      const outputDebug = output.debug;
      const outputError = output.error;

      output.log = (message) => {
        outputLog(message);
        logCurrent({ level: 'trace', message });
      }

      output.debug = (message) => {
        outputDebug(message);
        logCurrent({ level: 'debug', message });
      }

      output.error = (message) => {
        outputError(message);
        logCurrent({ level: 'error', message });
      }
    }
  });

  event.dispatcher.on(event.suite.before, (suite) => {
    recorder.add(async () => {
      if (!process.env.RUNS_WITH_WORKERS) {
        suiteObj = startTestItem(suite.title, rp_SUITE);
        debug(`${suiteObj.tempId}: The suiteId '${suite.title}' is started.`);
        suite.tempId = suiteObj.tempId;
        suiteStatus = rp_PASSED;
      }
    });
  });

  event.dispatcher.on(event.test.before, (test) => {
    recorder.add(async () => {
      if (!process.env.RUNS_WITH_WORKERS) {
        currentMetaSteps = [];
        stepObj = null;
        testObj = startTestItem(test.title, rp_TEST, suiteObj.tempId);
        test.tempId = testObj.tempId;
        failedStep = null;
        debug(`${testObj.tempId}: The testId '${test.title}' is started.`);
      } else {
        testArr.push(test);
      }
    })
  });

  event.dispatcher.on(event.step.before, (step) => {
    recorder.add(async () => {
      if (!process.env.RUNS_WITH_WORKERS) {
        const parent = await startMetaSteps(step);
        stepObj = startTestItem(step.toString().slice(0, 300), rp_STEP, parent.tempId);
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
        if (metaStep) metaStep.status = 'failed';
      }
      if (step && step.tempId) failedStep = Object.assign({}, step);
    }
  });

  event.dispatcher.on(event.step.passed, (step, err) => {
    if (!process.env.RUNS_WITH_WORKERS) {
      for (const metaStep of currentMetaSteps) {
        metaStep.status = 'passed';
      }
      failedStep = null;
    }
  });

  event.dispatcher.on(event.test.failed, async (test, err) => {
    if (!process.env.RUNS_WITH_WORKERS) {
      launchStatus = rp_FAILED;
      suiteStatus = rp_FAILED;

      if (failedStep && failedStep.tempId) {
        const step = failedStep;

        debug(`Attaching screenshot & error to failed step`);

        const screenshot = await attachScreenshot();

        resp = await rpClient.sendLog(step.tempId, {
          level: 'ERROR',
          message: `${err.stack}`,
          time: step.startTime,
        }, screenshot).promise;

      }

      if (!test.tempId) return;

      debug(`${test.tempId}: Test '${test.title}' failed.`);

      if (!failedStep) {
        await rpClient.sendLog(test.tempId, {
          level: 'ERROR',
          message: `${err.stack}`,
        }).promise;
      }

      rpClient.finishTestItem(test.tempId, {
        endTime: test.endTime || rpClient.helpers.now(),
        status: rp_FAILED,
        message: `${err.stack}`,
      });
    }
  });

  event.dispatcher.on(event.test.passed, (test) => {
    if (!process.env.RUNS_WITH_WORKERS) {
      debug(`${test.tempId}: Test '${test.title}' passed.`);
      rpClient.finishTestItem(test.tempId, {
        endTime: test.endTime || rpClient.helpers.now(),
        status: rp_PASSED,
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

  async function startTestItem(launchId, testTitle, method, parentId = null) {
    try {
      const hasStats = method !== rp_STEP;
      return rpClient.startTestItem({
        name: testTitle,
        type: method,
        hasStats,
      }, launchId, parentId);
    } catch (error) {
      console.log(error);
    }
  }

  event.dispatcher.on(event.all.result, async () => {
    if (!process.env.RUNS_WITH_WORKERS) {
      debug('Finishing launch...');
      if (suiteObj) {
        rpClient.finishTestItem(suiteObj.tempId, {
          status: suiteStatus,
        }).promise;
      }
      await finishLaunch();
    }
  });

  event.dispatcher.on(event.workers.result, async (result) => {
    await recorder.add(async () => {
      output.print(`📋 Writing results to ReportPortal: ${config.projectName} > ${config.endpoint}`);
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

    launchObj = await startLaunch();
    await launchObj.promise;
    const launchId = (await launchObj.promise).id;
    const launchLink = await getRPLink(launchId);
    output.print(`📋 ReportPortal Launch Link: ${launchLink}`);

    const suiteTempIdArr = [];
    const testTempIdArr = [];

    for (suite of suiteArr) {
      suiteObj = await startTestItem(launchObj.tempId, suite, rp_SUITE);
      suiteObj.status = rp_PASSED;
      suiteTempIdArr.push({
        suiteTitle: suite,
        suiteTempId: suiteObj.tempId,
      });
      await finishStepItem(suiteObj);
    }

    if (process.env.RUNS_WITH_WORKERS) {
      for (test of testArr.passed) {
        testObj = await startTestItem(launchObj.tempId, test.title, rp_TEST, suiteTempIdArr.find((element) => element.suiteTitle === test.parent.title).suiteTempId);
        testObj.status = rp_PASSED;

        testTempIdArr.push({
          testTitle: test.title,
          testTempId: testObj.tempId,
          testError: test.err,
          testSteps: test.steps,
        });

        await finishStepItem(testObj);
      }

      for (test of testArr.failed) {
        testObj = await startTestItem(launchObj.tempId, test.title, rp_TEST, suiteTempIdArr.find((element) => element.suiteTitle === test.parent.title).suiteTempId);
        testObj.status = rp_FAILED;

        testTempIdArr.push({
          testTitle: test.title,
          testTempId: testObj.tempId,
          testError: test.err,
          testSteps: test.steps,
        });

        await finishStepItem(testObj);
      }

      for (test of testArr.skipped) {
        testObj = await startTestItem(launchObj.tempId, test.title, rp_TEST, suiteTempIdArr.find((element) => element.suiteTitle === test.parent.title).suiteTempId);
        testObj.status = rp_SKIPPED;

        testTempIdArr.push({
          testTitle: test.title,
          testTempId: testObj.tempId,
          testError: test.err,
          testSteps: test.steps,
        });

        await finishStepItem(testObj);
      }
    } else {
      for (test of testArr) {
        testObj = await startTestItem(launchObj.tempId, test.title, rp_TEST, suiteTempIdArr.find((element) => element.suiteTitle === test.parent.title).suiteTempId);
        testObj.status = test.pending ? rp_SKIPPED : test.state;

        testTempIdArr.push({
          testTitle: test.title,
          testTempId: testObj.tempId,
          testError: test.err,
          testSteps: test.steps,
        });
        await finishStepItem(testObj);
      }
    }

    for (test of testTempIdArr) {
      for (step of test.testSteps) {
        // typo would be fixed by https://github.com/codeceptjs/CodeceptJS/pull/4077
        const stepArgs = step.agrs ?  step.agrs : step.args
        const stepTitle = stepArgs ? `[STEP] - ${step.actor} ${step.name} ${JSON.stringify(stepArgs.map(item => item && item._secret ? '*****' : JSON.stringify(item)).join(' '))}` : `[STEP] - ${step.actor} ${step.name}`;

        const stepObj = await startTestItem(launchObj.tempId, stepTitle.slice(0, 300), rp_STEP, test.testTempId);
        stepObj.status = step.status || rp_PASSED;
        await finishStepItem(stepObj);

        if (stepObj.status === 'failed' && step.err) {
          await sendLogToRP({ tempId: stepObj.tempId, level: 'ERROR', message: `[FAILED STEP] - ${(step.err.stack ? step.err.stack : JSON.stringify(step.err))}` });
          //await sendLogToRP({
            //tempId: stepObj.tempId, level: 'debug', message: 'Last seen screenshot', screenshotData: await attachScreenshot(`${clearString(test.testTitle)}.failed.png`),
          });
        } else if (stepObj.status === 'failed' && step.helper.currentRunningTest.err) {
          await sendLogToRP({ tempId: stepObj.tempId, level: 'ERROR', message: `[FAILED STEP] - ${step.helper.currentRunningTest.err}` });
          //await sendLogToRP({
            //tempId: stepObj.tempId, level: 'debug', message: 'Last seen screenshot', screenshotData: await attachScreenshot(`${clearString(test.testTitle)}.failed.png`),
          });
        }
      }
    }

    await finishLaunch();
  }

  async function sendLogToRP({tempId, level, message, screenshotData,}) {
    return rpClient.sendLog(tempId, {
      level,
      message,
    }, screenshotData).promise;
  }

  function startLaunch(suiteTitle) {
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

  async function getRPLink(launchId) {
    const res = await restClient.get(`${config.endpoint}/${config.projectName}/launch?page.page=1&page.size=50&page.sort=startTime%2Cnumber%2CDESC`, { headers: { Authorization: `Bearer ${config.token }`}});
    const launch = res.data.content.filter(item => item.uuid === launchId);
    return `${config.endpoint.split('api')[0]}ui/#${config.projectName}/launches/all/${launch[0].id}`;
  }

  async function attachScreenshot() {
    if (!helper) return undefined;

    const fileName = `${rpClient.helpers.now()}.png`;
    try {
      await helper.saveScreenshot(fileName);
    } catch (err) {
      output.error(`Couldn't save screenshot`);
      return undefined;
    }

    const content = fs.readFileSync(path.join(global.output_dir, fileName));
    fs.unlinkSync(path.join(global.output_dir, fileName));

    return {
      name: 'failed.png',
      type: 'image/png',
      content,
    }
  }

  async function finishLaunch() {
    try {
      debug(`${launchObj.tempId} Finished launch: ${launchStatus}`)
      const launch = rpClient.finishLaunch(launchObj.tempId, {
        status: launchStatus,
      });

      const response = await launch.promise;

      reportUrl = response.link;
      output.print(` 📋 Report #${response.number} saved ➡`, response.link);
      event.emit('reportportal.result', response);
    } catch (error) {
      console.log(error);
      debug(error);
    }
  }

  async function startMetaSteps(step) {
    let metaStepObj = {};
    const metaSteps = metaStepsToArray(step.metaStep);

    // close current metasteps
    for (let j = currentMetaSteps.length-1; j >= metaSteps.length; j--) {
      await finishStep(currentMetaSteps[j]);
    }

    for (const i in metaSteps) {
      const metaStep = metaSteps[i];
      if (isEqualMetaStep(metaStep, currentMetaSteps[i])) {
        metaStep.tempId = currentMetaSteps[i].tempId;
        continue;
      }
      // close metasteps other than current
      for (let j = currentMetaSteps.length-1; j >= i; j--) {
        await finishStep(currentMetaSteps[j]);
        delete currentMetaSteps[j];
      }

      metaStepObj = currentMetaSteps[i-1] || metaStepObj;

      const isNested = !!metaStepObj.tempId;
      metaStepObj = startTestItem(metaStep.toString(), rp_STEP, metaStepObj.tempId || testObj.tempId);
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

  async function finishStepItem(step) {
    if (!step) return;

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


function rpStatus(status) {
  if (status === 'success') return rp_PASSED;
  if (status === 'failed') return rp_FAILED;
  return status;
}
