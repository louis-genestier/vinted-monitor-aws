import SecretManager from "aws-sdk/clients/secretsmanager";
import SQS from "aws-sdk/clients/sqs";
import DynamoDBClient from "aws-sdk/clients/dynamodb";
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

export const createNewAlert = async ({
  userId,
  keywords,
  maxPrice,
}: {
  userId: string;
  keywords: string;
  maxPrice: number;
}) => {
  const params: DynamoDBClient.PutItemInput = {
    TableName: "alerts",
    Item: {
      // @ts-expect-error
      user_id: userId,
      // @ts-expect-error
      alert_id: `${userId}-${Date.now()}`,
      // @ts-expect-error
      keywords,
      // @ts-expect-error
      max_price: maxPrice,
    },
  };

  try {
    await dynamodb.put(params).promise();

    return params.Item;
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
