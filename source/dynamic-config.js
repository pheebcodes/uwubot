import { promisify } from "util";

export class DynamicConfig {
	constructor({ config, spaces }) {
		this._bucket = config.spacesBucket;

		this._getObject = promisify(spaces.getObject.bind(spaces));
	}

	async get(name) {
		const resp = await this._getObject({
			Bucket: this._bucket,
			Key: `config/${name}`,
		});
		const value = resp.Body.toString("utf-8");
		return value;
	}
}
