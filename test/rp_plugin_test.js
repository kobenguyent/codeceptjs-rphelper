Feature('RP Plugin tests');

Scenario('Send results to RP', (I) => {
    I.amOnPage('/');
    I.see('abc');
});