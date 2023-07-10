import AWS from "aws-sdk";
import Inquirer from "inquirer";
import { promisify } from "util";

const spacesEndpoint = new AWS.Endpoint("nyc3.digitaloceanspaces.com");
const spaces = new AWS.S3({
	endpoint: spacesEndpoint,
	credentials: {
		accessKeyId: process.env.UWUBOT_SPACES_ACCESS_KEY_ID,
		secretAccessKey: process.env.UWUBOT_SPACES_SECRET_ACCESS_KEY,
	},
});
const listObjects = promisify(spaces.listObjectsV2.bind(spaces));
const putObject = promisify(spaces.putObject.bind(spaces));

async function main() {
	const response = await listObjects({
		Bucket: process.env.UWUBOT_SPACES_BUCKET,
		Prefix: "config/",
	});
	const configKeys = new Set(
		response.Contents.map((meta) => meta.Key.slice("config/".length)),
	);

	const QUESTIONS = [
		{
			type: "input",
			name: "key",
			message: "Config name?",
		},
		{
			type: "input",
			name: "value",
			message: "New value?",
		},
	];

	const { key, value } = await Inquirer.prompt(QUESTIONS);

	if (configKeys.has(key)) {
		console.error("Config key already exists. Use update-config instead.");
		process.exit(-1);
	}

	await putObject({
		Bucket: process.env.UWUBOT_SPACES_BUCKET,
		Key: `config/${key}`,
		Body: value,
	});
}

main();
