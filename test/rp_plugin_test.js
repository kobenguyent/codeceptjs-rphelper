const {I} = inject();
const Joi = require('joi');
const faker = require('@faker-js/faker');

const resSchemaForImporting = Joi.object({
    status: Joi.number().valid(200).required(),
    msg: Joi.string().valid('Started sync successfully.').required(),
    messages: Joi.array().length(0).required(),
    localized_messages: Joi.array().length(0).required(),
    errors: Joi.array().length(0).required(),
    request: Joi.object({
        host: Joi.string().required(),
        id: Joi.string().guid({ version: 'uuidv4' }).required()
    }).required()
}).required();

let createdUser;

Feature('RP Plugin tests');

async function createNewUser(userData) {
    let payload = userData || {
        name: faker.name.firstName(),
        job: 'leader'
    };

    return I.sendPostRequest('/api/users', payload);
}

Before(async () => {
    createdUser = await createNewUser();
});

Scenario('Send passed results to RP @pass', () => {
    I.amOnPage('/');
    I.dontSee('abc');
});

Scenario('Send failed results to RP @fail', () => {
    I.amOnPage('/');
    I.see('abcdef');
});

Scenario('API tests with joi @api', async () => {
    let id = createdUser['data']['id'];
    await I.sendDeleteRequest(`/api/users/${id}`);
    I.seeResponseMatchesJsonSchema(resSchemaForImporting);
});
