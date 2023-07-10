export class StatusPoster {
	constructor({ config, database, discord, dynamicConfig }) {
		this.config = config;
		this.database = database;
		this.discord = discord;
		this.dynamicConfig = dynamicConfig;

		if (config.mode === "production") {
			this.postIfNewCommit().catch((e) => {
				console.error("Failed to post latest commit info to discord.");
				console.error(e);
			});
		}
	}

	async postIfNewCommit() {
		const currentCommit = this.config.commitHash.slice(0, 8);
		const lastCommit = await this.database.tryGet("last-commit");
		if (lastCommit !== currentCommit) {
			const channelId = await this.dynamicConfig.get(
				"status-poster/channel-id",
			);
			await this.discord.createMessage(channelId, {
				content: `${currentCommit} deployed`,
			});
		}
		await this.database.set("last-commit", currentCommit);
	}
}
