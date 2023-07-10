import { promisify } from "util";

export class Database {
	constructor({ config, spaces }) {
		this._bucket = config.spacesBucket;

		this._getObject = promisify(spaces.getObject.bind(spaces));
		this._putObject = promisify(spaces.putObject.bind(spaces));
	}

	async get(name) {
		const resp = await this._getObject({
			Bucket: this._bucket,
			Key: `database/${name}`,
		});
		const value = resp.Body.toString("utf-8");
		return value;
	}

	async tryGet(name) {
		try {
			const value = await this.get(name);
			return value;
		} catch (e) {
			return null;
		}
	}

	async set(name, value) {
		await this._putObject({
			Bucket: this._bucket,
			Key: `database/${name}`,
			Body: Buffer.from(value),
		});
	}
}
