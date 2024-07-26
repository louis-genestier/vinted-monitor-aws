import { Handler } from "aws-lambda";
import { createNewAlert } from "../utils/utils";

export const handler: Handler = async (event) => {
  try {
    const { userId, keywords, maxPrice } = event;

    console.log(
      `Creating alert for user ${userId}, keywords ${keywords} and max price ${maxPrice}`
    );

    const alert = await createNewAlert({ userId, keywords, maxPrice });

    console.log("Alert created:", alert);

    return {
      statusCode: 200,
      body: JSON.stringify({ alert }),
    };
  } catch (error) {
    console.error("[ERROR] -", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};
