const axios = require('axios').default;

class RestClient {
	constructor() {
		this.axios = axios.create();
	}

	async makePostRequest(url, payload = {}, headers = {}) {
		try {
			return this.axios.post(url, payload, { headers });
		} catch (e) {
			throw new Error(e.message);
		}
	}

	async makePutRequest(url, payload = {}, headers = {}) {
		try {
			return this.axios.put(url, payload, { headers });
		} catch (e) {
			throw new Error(e.message);
		}
	}

	async makeGetRequest(url, headers = {}) {
		try {
			return this.axios.get(url, { headers });
		} catch (e) {
			throw new Error(e.message);
		}
	}

	async makeDeleteRequest(url, headers = {}) {
		try {
			return this.axios.delete(url, { headers });
		} catch (e) {
			throw new Error(e.message);
		}
	}
}

module.exports = RestClient;
