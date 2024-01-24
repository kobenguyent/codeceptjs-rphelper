const screenshotHelpers = [
	'WebDriver',
	'Appium',
	'Puppeteer',
	'TestCafe',
	'Playwright',
];

const PREFIX_PASSED_TEST = '✅ [TEST]';
const PREFIX_FAILED_TEST = '❌ [TEST]';
const PREFIX_SKIPPED_TEST = '⏩ [SKIPPED TEST]';
const PREFIX_PASSED_STEP = '✅ [STEP]';
const PREFIX_FAILED_STEP = '❌ [STEP]';
const PREFIX_BUG = '🐞🐞 LOGS --->';

module.exports = {
	screenshotHelpers,
	PREFIX_PASSED_TEST,
	PREFIX_FAILED_TEST,
	PREFIX_SKIPPED_TEST,
	PREFIX_PASSED_STEP,
	PREFIX_FAILED_STEP,
	PREFIX_BUG,
};
