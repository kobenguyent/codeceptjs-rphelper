const { exec } = require('child_process');
const { expect } = require('chai');

const runner = './node_modules/.bin/codeceptjs run-workers 2 features/basic.feature';
const configFilePath = './test/codecept.conf.ts';

describe('RP Plugin - Codeceptjs Integration - BDD Feature', () => {
  describe('Passed test', () => {
    it('should push data to rp', (done) => {
      exec(`${runner} --grep @pass -c ${configFilePath} --verbose`, (error, stdout, stderr) => {
        expect(stdout).to.include('Success start launch with tempId');
        done();
      });
    });
  });

  describe('Failed test', () => {
    it('should push data to rp', (done) => {
      exec(`${runner} --grep @fail -c ${configFilePath} --verbose`, (error, stdout, stderr) => {
        expect(stdout).to.include('Success start launch with tempId');
        done();
      });
    });
  });
});
