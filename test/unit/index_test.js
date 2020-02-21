const sinon = require('sinon');
const assert = require('assert');
const scenario = require('codeceptjs/lib/scenario');
const recorder = require('codeceptjs/lib/recorder');
const event = require('codeceptjs/lib/event');

let test;
let fn;
let before;
let allBefore;
let after;
let beforeSuite;
let afterSuite;
let failed;
let started;

describe('startLaunch', () => {
    beforeEach(() => {
        test = { timeout: () => { } };
        fn = sinon.spy();
        test.fn = fn;
        event.dispatcher.on(event.all.before, allBefore = sinon.spy());
        event.dispatcher.on(event.test.before, before = sinon.spy());
        event.dispatcher.on(event.test.after, after = sinon.spy());
        event.dispatcher.on(event.test.started, started = sinon.spy());
        event.dispatcher.on(event.suite.before, beforeSuite = sinon.spy());
        event.dispatcher.on(event.suite.after, afterSuite = sinon.spy());
        scenario.suiteSetup();
        scenario.setup();
    });

    it('should fire events', () => {
        scenario.test(test).fn(() => null);
        assert.ok(started.called);
        scenario.teardown();
        scenario.suiteTeardown();
        return recorder.promise()
            .then(() => assert.ok(beforeSuite.called))
            .then(() => assert.ok(afterSuite.called))
            .then(() => assert.ok(before.called))
            .then(() => assert.ok(after.called))
            .then(() => assert.ok(allBefore.called));
    });
});