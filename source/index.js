import AWS from "aws-sdk";
import { Auth } from "./auth.js";
import { Discord } from "./discord.js";
import { ColorManager } from "./color-manager.js";
import { makeConfig } from "./config.js";
import { ChannelManager } from "./channel-manager.js";
import { HttpServer } from "./http-server.js";
import { DynamicConfig } from "./dynamic-config.js";
import { Database } from "./database.js";
import { makeToolbox, factory, singleton, eager } from "./toolbox.js";
import { StatusPoster } from "./status-poster.js";
import { MsgSave } from "./msg-save.js";

const toolbox = makeToolbox({
	auth: Auth,
	channelManager: ChannelManager,
	colorManager: ColorManager,
	config: singleton(factory(() => makeConfig(process.env))),
	database: Database,
	discord: Discord,
	dynamicConfig: DynamicConfig,
	httpServer: HttpServer,
	// msgSave: eager(MsgSave),
	spaces: singleton(
		factory((toolbox) => {
			const config = toolbox.config;
			const spacesEndpoint = new AWS.Endpoint("nyc3.digitaloceanspaces.com");

			return new AWS.S3({
				endpoint: spacesEndpoint,
				credentials: {
					accessKeyId: config.spacesAccessKeyId,
					secretAccessKey: config.spacesSecretAccessKey,
				},
			});
		}),
	),
	statusPoster: eager(StatusPoster),
});

const httpServer = toolbox.httpServer;
httpServer.listen(() => {
	console.log("listening!");
});
