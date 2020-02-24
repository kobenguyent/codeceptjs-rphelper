const { I } = inject();

Given('I am Google homepage', () => {
  I.amOnPage('/');
});

Then('I dont see abc', () => {
  I.dontSee('abc');
});

Then('I see abc', () => {
  I.see('abc');
});
