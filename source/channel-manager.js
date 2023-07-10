import { Permissions } from "./discord.js";

export class ChannelManager {
	constructor({ discord, dynamicConfig }) {
		this._discord = discord;
		this._dynamicConfig = dynamicConfig;
	}

	async getOverwritesForMember(member) {
		const optInChannels = await this._getOptInChannels();
		return optInChannels.map((optInChannel) => {
			const permissionOverwrite = optInChannel.permission_overwrites.find(
				(overwrite) => overwrite.id === member.user.id,
			);
			const permissions = new Permissions(permissionOverwrite);
			return {
				id: optInChannel.id,
				name: optInChannel.name,
				joined:
					permissions.get(Permissions.Flags.VIEW_CHANNEL) ===
					Permissions.States.ALLOW,
			};
		});
	}

	async addMemberToChannel(member, channelId) {
		const channel = await this._getOptInChannel(channelId);
		const overwrite = channel.permission_overwrites.find(
			(overwrite) => overwrite.id === member.user.id,
		);
		const permissions = new Permissions(overwrite);
		permissions.allow(Permissions.Flags.VIEW_CHANNEL);
		await this._discord.modifyChannelPermissionOverwrite(
			channel.id,
			member.user.id,
			{ ...permissions.toObject(), type: 1 },
		);
	}

	async removeMemberFromChannel(member, channelId) {
		const channel = await this._getOptInChannel(channelId);
		const overwrite = channel.permission_overwrites.find(
			(overwrite) => overwrite.id === member.user.id,
		);
		const permissions = new Permissions(overwrite);
		permissions.deny(Permissions.Flags.VIEW_CHANNEL);
		await this._discord.modifyChannelPermissionOverwrite(
			channel.id,
			member.user.id,
			{ ...permissions.toObject(), type: 1 },
		);
	}

	async _getOptInChannels() {
		const categoryId = await this._getOptInCategoryId();
		const channels = await this._discord.getChannels();
		return channels.filter((channel) => channel.parent_id === categoryId);
	}

	async _getOptInChannel(channelId) {
		const optInChannels = await this._getOptInChannels();
		const channel = optInChannels.find((channel) => channel.id === channelId);
		if (!channel) {
			throw new ChannelIsNotOptIn("That channel is not opt-in.");
		}
		return channel;
	}

	async _getOptInCategoryId() {
		return this._dynamicConfig.get("opt-in-category");
	}
}

export class ChannelIsNotOptIn extends Error {}
