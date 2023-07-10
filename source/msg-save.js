import assert from "assert";
import WebSocket from "ws";

const OP_DISPATCH = 0;
const OP_HEARTBEAT = 1;
const OP_IDENTIFY = 2;
const OP_PRESENSE_UPDATE = 3;
const OP_HELLO = 10;
const OP_HEARTBEAT_ACK = 11;

const EVENT_READY = "READY";
const EVENT_MESSAGE_CREATE = "MESSAGE_CREATE";
const EVENT_MESSAGE_UPDATE = "MESSAGE_UPDATE";

export class MsgSave {
	_lastHeartbeatAck = null;

	constructor(toolbox) {
		this.start(toolbox).catch((e) => {
			console.error("Failed to start MsgSave.", e);
		});
	}

	async start({ config, database, discord }) {
		this._database = database;
		this._token = config.token;

		const { url: baseGateway } = await discord.getGateway();
		const gateway = new URL(baseGateway);
		gateway.searchParams.set("v", 9);
		gateway.searchParams.set("encoding", "json");
		this._ws = new WebSocket(gateway);
		this._ws.on("message", (...args) => this.onMessage(...args));
	}

	onMessage(payload) {
		const { op, d: data, s: sequence, t: event } = JSON.parse(payload);
		switch (op) {
			case OP_DISPATCH:
				this.onReceiveDispatch(event, data);
				break;
			case OP_HEARTBEAT:
				this.sendHeartbeat();
				break;
			case OP_HELLO:
				this.onReceiveHello(data);
				break;
			case OP_HEARTBEAT_ACK:
				this._lastHeartbeatAck = Date.now();
				break;
		}
		this._lastSequence = sequence;
	}

	send(op, data = {}) {
		const payload = JSON.stringify({ op, d: data });
		this._ws.send(payload);
	}

	onReceiveDispatch(event, data) {
		switch (event) {
			case EVENT_READY:
				this._database.set("msg-save/last-session-id", data.session_id);
				this.send(OP_PRESENSE_UPDATE, {
					status: "online",
					afk: false,
					since: null,
					activities: [
						{
							type: 0,
							name: "ur mom",
							created_at: Date.now(),
						},
					],
				});
				break;
			case EVENT_MESSAGE_CREATE:
			case EVENT_MESSAGE_UPDATE:
				this._database.set(
					`msg-save/messages/${data.author.id}/${data.id}`,
					JSON.stringify({ content: data.content }),
				);
				break;
		}
	}

	async onReceiveHello({ heartbeat_interval: heartbeatInterval }) {
		assert.ok(this._heartbeat == null, "Already started heartbeat.");
		this._heartbeatInterval = heartbeatInterval;
		this._heartbeat = setInterval(() => {
			this.sendHeartbeat();
		}, heartbeatInterval);

		this.send(OP_IDENTIFY, {
			token: this._token,
			intents: 1 << 9,
			properties: {
				$os: "linux",
				$browser: "uwubot",
				$device: "uwubot",
			},
		});
	}

	sendHeartbeat() {
		assert.ok(
			this._lastHeartbeatAck === null ||
				this._lastHeartbeatAck > Date.now() - this._heartbeatInterval - 100,
			"Zombie connection.",
		);
		this.send(OP_HEARTBEAT);
	}
}
