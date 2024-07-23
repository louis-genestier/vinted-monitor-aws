import { Handler, SQSEvent } from "aws-lambda";
import SQS from "aws-sdk/clients/sqs";

const getVintedCookie = async (): Promise<String | undefined> => {
  const response = await fetch("https://www.vinted.fr/");
  const cookie = response.headers.get("set-cookie");

  return cookie?.match(/_vinted_fr_session=(.*?);/)?.[1];
};

const getItems = async (keywords: String, cookie: String) => {
  const reponseItems = await fetch(
    `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${keywords}`,
    {
      headers: {
        cookie: `_vinted_fr_session=${cookie}`,
      },
    }
  );

  const data = (await reponseItems.json()) as { items: any[] };

  return data.items;
};

const sendItemsToQueue = async (items: any[]) => {
  const sqs = new SQS();

  for (const item of items) {
    sqs.sendMessage(
      {
        QueueUrl: process.env.NOTIFICATION_QUEUE_URL!,
        MessageBody: JSON.stringify(item),
      },
      (err, data) => {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data.MessageId);
        }
      }
    );
  }
};

export const handler: Handler = async (event: SQSEvent) => {
  const { body } = event.Records[0];
  const params = JSON.parse(body) as { keywords: String };

  console.log("Received event:", JSON.stringify(params));

  try {
    console.log("Getting Vinted cookie...");
    const vintedCookie = await getVintedCookie();
    console.log("Cookie:", vintedCookie);

    if (!vintedCookie) {
      throw new Error("No cookie found");
    }

    const items = await getItems(params.keywords, vintedCookie);

    await sendItemsToQueue(items);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Items sent to the queue" }),
    };
  } catch (error) {
    console.error("[ERROR] -", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};
