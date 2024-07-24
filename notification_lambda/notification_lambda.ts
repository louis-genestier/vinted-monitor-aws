import { Handler, SQSEvent } from "aws-lambda";
import { WebhookClient } from "discord.js";
import { getSecret } from "../utils/utils";
import { VintedItem } from "../utils/types";

export const handler: Handler = async (event: SQSEvent) => {
  const { body } = event.Records[0];
  const { item, userId, alertId } = JSON.parse(body) as {
    item: VintedItem;
    userId: string;
    alertId: string;
  };
  try {
    const discordWebhookUrl = await getSecret(
      process.env.DISCORD_WEBHOOK_URL_ID!
    );

    const webhookClient = new WebhookClient({ url: discordWebhookUrl });

    await webhookClient.send({
      content: `New item found: ${item.title} - ${item.price} - ${item.url} - Alert ID: ${alertId} - User ID: ${userId}`,
      username: "Vinted Bot",
      avatarURL: "https://i.imgur.com/wSTFkRM.png",
    });

    return {
      statusCode: 200,
    };
  } catch (error) {
    console.error("[ERROR] -", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};
