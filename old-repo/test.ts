import * as Brevo from '@getbrevo/brevo';
const api = new Brevo.TransactionalEmailsApi();
api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, 'key');
