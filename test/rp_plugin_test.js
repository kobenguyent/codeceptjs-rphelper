const {I} = inject();

Feature('RP Plugin tests');

Scenario('Send passed results to RP @pass', () => {
    I.amOnPage('/');
    I.dontSee('abc');
});

Scenario('Send failed results to RP @fail', () => {
    I.amOnPage('/');
    I.see('abcdef');
});
