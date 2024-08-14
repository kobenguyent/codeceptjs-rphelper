const RPClient = require('@reportportal/client-javascript');
const { LAUNCH_MODES } = require('../constants/launchModes');
const { TEST_ITEM_TYPES } = require('../constants/testItemTypes');
const { STATUSES } = require('../constants/statuses');
const fs = require('fs');
const path = require('path');
const RestClient = require('./restClient');
const logToFile = require('./logging');
const debug = require('debug')('codeceptjs:reportportal');
const restClient = new RestClient();
const { output, event } = codeceptjs;
let rpClient;

async function startLaunch(config, suiteTitle) {
	try {
		rpClient = new RPClient({
			apiKey: config.token,
			endpoint: config.endpoint,
			project: config.projectName,
			debug: config.debug,
		});

		logToFile(`Creating new RP Client: ${JSON.stringify(rpClient, null, 2)}`);

		const launchObj = rpClient.startLaunch({
			name: config.launchName || suiteTitle,
			description: config.launchDescription,
			attributes: config.launchAttributes,
			rerun: config.rerun,
			rerunOf: config.rerunOf,
			mode: LAUNCH_MODES.DEFAULT,
		});
		return launchObj;
	} catch (e) {
		logToFile(`Could not start launch due to: ${e.message}`);
	}
}

async function finishLaunch(launchObj, launchStatus) {
	try {
		debug(`${launchObj.tempId} Finished launch: ${launchStatus}`);
		const launch = rpClient.finishLaunch(launchObj.tempId, {
			status: launchStatus,
		});

		const response = await launch.promise;
		event.emit('reportportal.result', response);
	} catch (error) {
		console.log(error);
		debug(error);
	}
}

async function getRPLink(config, launchId) {
	try {
		const res = await restClient.makeGetRequest(
			`${config.endpoint}/${config.projectName}/launch?page.page=1&page.size=50&page.sort=startTime%2Cnumber%2CDESC`,
			{ Authorization: `Bearer ${config.token}` },
		);
		const launch = res.data.content.filter((item) => item.uuid === launchId);
		return `${config.endpoint.split('api')[0]}ui/#${
			config.projectName
		}/launches/all/${launch[0].id}`;
	} catch (e) {
		console.log(e);
	}
}

function writePRInfo(launchLink, config) {
	output.print(
		`📋 Writing results to ReportPortal: Project Name: ${config.projectName} > RP Endpoint: ${config.endpoint}`,
	);
	output.print(`📋 ReportPortal Launch Link: ${launchLink}`);
}

async function startTestItem(
	launchId,
	testTitle,
	method,
	parentId,
	parentTitle,
) {
	try {
		if (method === TEST_ITEM_TYPES.SUITE) {
			const payload = suitePayload(testTitle);
			return rpClient.startTestItem(payload, launchId, parentId);
		}

		if (method === TEST_ITEM_TYPES.TEST) {
			const payload = testPayload(testTitle, parentTitle);
			return rpClient.startTestItem(payload, launchId, parentId);
		}

		if (method === TEST_ITEM_TYPES.STEP) {
			const payload = stepPayload(testTitle, parentTitle);
			return rpClient.startTestItem(payload, launchId, parentId);
		}
	} catch (error) {
		console.log(error);
	}
}

async function finishTestItem(test, issueObject) {
	if (!test) return;

	debug(`Finishing '${test.toString()}' Test`);
	const testItemRQ = {
		endTime: rpClient.helpers.now(),
		status: rpStatus(test.status),
	};

	if (issueObject) {
		testItemRQ.issue = issueObject;
	}

	rpClient.finishTestItem(test.tempId, testItemRQ);
}

async function finishStepItem(step) {
	if (!step) return;

	debug(`Finishing '${step.toString()}' step`);

	return rpClient.finishTestItem(step.tempId, {
		endTime: rpClient.helpers.now(),
		status: rpStatus(step.status) || STATUSES.PASSED,
	});
}

function logCurrent(data, file) {
	const obj = stepObj || testObj;
	if (obj) rpClient.sendLog(obj.tempId, data, file);
}

function rpStatus(status) {
	if (status.toLowerCase() === 'success') return STATUSES.PASSED;
	if (status.toLowerCase() === 'failed') return STATUSES.FAILED;
	return status;
}

function suitePayload(title) {
	return {
		name: title,
		type: TEST_ITEM_TYPES.SUITE,
		codeRef: '',
	};
}

function testPayload(testTitle, suiteTitle) {
	return {
		name: testTitle,
		type: TEST_ITEM_TYPES.STEP,
		codeRef: `${suiteTitle}/${testTitle}`,
		testCaseId: `${suiteTitle}/${testTitle}`,
		hasStats: true,
	};
}

function stepPayload(stepTitle, testTitle) {
	return {
		name: stepTitle,
		type: TEST_ITEM_TYPES.STEP,
		codeRef: `${testTitle}/${stepTitle}`,
		testCaseId: `${testTitle}/${stepTitle}`,
		hasStats: false,
	};
}

async function sendLogToRP({ tempId, level, message, screenshotData }) {
	debug('📷 Attaching screenshot & error to failed step...');
	return rpClient.sendLog(
		tempId,
		{
			level,
			message,
		},
		screenshotData,
	).promise;
}

async function attachScreenshot(helper, fileName) {
	if (!helper) return undefined;
	let content;

	if (!fileName) {
		const _fileName = `${rpClient.helpers.now()}_failed.png`;
		try {
			await helper.saveScreenshot(_fileName);
			content = fs.readFileSync(path.join(global.output_dir, _fileName));
			fs.unlinkSync(path.join(global.output_dir, _fileName));
		} catch (err) {
			output.error("Couldn't save screenshot");
			return undefined;
		}
	} else {
		content = fs.readFileSync(path.resolve(global.output_dir, fileName));
	}

	return {
		name: 'failed_test.png',
		type: 'image/png',
		content,
	};
}

async function attachVideo(fileName) {
	const content = fs.readFileSync(path.resolve(global.output_dir, fileName));

	return {
		name: 'failed_test.webm',
		type: 'video/webm',
		content,
	};
}

async function attachTrace(fileName) {
	const content = fs.readFileSync(path.resolve(global.output_dir, fileName));

	return {
		name: 'trace.zip',
		type: 'application/zip',
		content,
	};
}

module.exports = {
	startLaunch,
	getRPLink,
	writePRInfo,
	startTestItem,
	finishTestItem,
	finishStepItem,
	logCurrent,
	rpStatus,
	suitePayload,
	testPayload,
	stepPayload,
	sendLogToRP,
	attachScreenshot,
	finishLaunch,
	attachVideo,
	attachTrace,
};
