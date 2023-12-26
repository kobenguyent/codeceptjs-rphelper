const { exec } = require('child_process');
const { expect } = require('chai');

const runner = './node_modules/.bin/codeceptjs run-workers 2 rp_plugin_test.js';
const configFilePath = './test/codecept.conf.js';

describe('RP Plugin - Codeceptjs Integration', () => {
  describe('Passed test', () => {
    it.skip('should push data to rp', (done) => {
      exec(`${runner} --grep @pass -c ${configFilePath} --verbose`, (error, stdout, stderr) => {
        expect(stdout).to.include('Success start launch with tempId');
        expect(stdout).to.include('OK  | 1 passed ');
        done();
      });
    });
  });

  describe('Failed test', () => {
    it('should push data to rp', (done) => {
      exec(`${runner} --grep @fail -c ${configFilePath} --verbose`, (error, stdout, stderr) => {
        console.log(stdout)
        expect(stdout).to.include('Success start launch with tempId');
        expect(stdout).to.include('FAIL  |');
        done();
      });
    });
  });
});
