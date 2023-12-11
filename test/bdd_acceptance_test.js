const { exec } = require('child_process');
const { expect } = require('chai');

const runner = './node_modules/.bin/codeceptjs run features/basic.feature';
const configFilePath = './test/codecept.conf.js';

describe('RP Plugin - Codeceptjs Integration - BDD Feature', () => {
  describe('Passed test', () => {
    it('should push data to rp', (done) => {
      exec(`${runner} --grep @pass -c ${configFilePath} --verbose`, (error, stdout, stderr) => {
        expect(stdout).to.include('Start launch with tempId');
        expect(stdout).to.include("type: 'SUITE'");
        expect(stdout).to.include("type: 'TEST'");
        expect(stdout).to.include("type: 'STEP'");
        expect(stdout).to.include('OK  | 1 passed ');
        done();
      });
    });
  });

  describe('Failed test', () => {
    it('should push data to rp', (done) => {
      exec(`${runner} --grep @fail -c ${configFilePath} --verbose`, (error, stdout, stderr) => {
        expect(stdout).to.include('Start launch with tempId');
        expect(stdout).to.include("type: 'SUITE'");
        expect(stdout).to.include("type: 'TEST'");
        expect(stdout).to.include("type: 'STEP'");
        expect(stdout).to.include('FAIL  | 0 passed, 1 failed');
        done();
      });
    });
  });
});
