import SecretManager from "aws-sdk/clients/secretsmanager";
import SQS from "aws-sdk/clients/sqs";
import DynamoDBClient from "aws-sdk/clients/dynamodb";
import { VintedItem } from "./types";
const dynamodb = new DynamoDBClient.DocumentClient();

export const getSecret = async (secretId: string) => {
  const client = new SecretManager();
  const secret = await client.getSecretValue({ SecretId: secretId }).promise();
  if (!secret.SecretString) {
    throw new Error("No secret found");
  }
  return secret.SecretString;
};

export const sendItemToQueue = async (item: any, queueUrl: string) => {
  const sqs = new SQS();

  sqs.sendMessage(
    {
      QueueUrl: queueUrl,
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
};

export const getAlert = async ({
  userId,
  alertId,
}: {
  userId: string;
  alertId: string;
}): Promise<{
  keywords: string;
  user_id: string;
  alert_id: string;
  max_price: number;
}> => {
  const params: DynamoDBClient.GetItemInput = {
    TableName: "alerts",
    Key: {
      // @ts-expect-error
      user_id: userId,
      // @ts-expect-error
      alert_id: alertId,
    },
  };

  try {
    const result = await dynamodb.get(params).promise();
    if (!result.Item) {
      throw new Error(`Alert ${alertId} not found for user ${userId}`);
    }
    return result.Item as {
      keywords: string;
      user_id: string;
      alert_id: string;
      max_price: number;
    };
  } catch (error) {
    throw error;
  }
};

export const getCheckedItems = async (itemId: number, alertId: string) => {
  const params: DynamoDBClient.GetItemInput = {
    TableName: "checked_items",
    Key: {
      // @ts-expect-error
      item_id: itemId,
      // @ts-expect-error
      alert_id: alertId,
    },
  };

  try {
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    throw error;
  }
};

export const setCheckedItem = async (itemId: number, alertId: string) => {
  const params: DynamoDBClient.PutItemInput = {
    TableName: "checked_items",
    Item: {
      // @ts-expect-error
      item_id: itemId,
      // @ts-expect-error
      alert_id: alertId,
    },
  };

  try {
    await dynamodb.put(params).promise();
  } catch (error) {
    throw error;
  }
};

export const getVintedCookie = async (): Promise<string | undefined> => {
  const response = await fetch("https://www.vinted.fr/");
  const cookie = response.headers.get("set-cookie");

  return cookie?.match(/_vinted_fr_session=(.*?);/)?.[1];
};

export const getItems = async (keywords: string, cookie: string) => {
  const reponseItems = await fetch(
    `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${keywords}`,
    {
      headers: {
        cookie: `_vinted_fr_session=${cookie}`,
      },
    }
  );

  const data = (await reponseItems.json()) as { items: VintedItem[] };

  return data.items;
};
