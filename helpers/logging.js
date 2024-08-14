const fs = require('fs');
const path = require('path');

module.exports = function logToFile(message) {
	const logFilePath = path.join(output_dir, 'codeceptjs-reportportal.log');
	const timestamp = new Date().toISOString();
	const logMessage = `[${timestamp}] ${message}\n`;

	fs.appendFile(logFilePath, logMessage, (err) => {
		if (err) {
			console.error('Failed to write to log file:', err);
		}
	});
};
