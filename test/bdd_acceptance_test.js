const { exec } = require('child_process');
const { expect } = require('chai');

const runner = './node_modules/.bin/codeceptjs run-workers 2 features/basic.feature';
const configFilePath = './test/codecept.conf.js';

describe('RP Plugin - Codeceptjs Integration - BDD Feature', () => {
  describe('Passed test', () => {
    it('should push data to rp', (done) => {
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
        expect(stdout).to.include('Success start launch with tempId');
        expect(stdout).to.include('FAIL  | 0 passed, 1 failed');
        done();
      });
    });
  });
});
