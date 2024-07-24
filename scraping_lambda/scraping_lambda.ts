import { Handler, SQSEvent } from "aws-lambda";
import {
  sendItemToQueue,
  getAlert,
  getVintedCookie,
  getItems,
  getCheckedItems,
  setCheckedItem,
} from "../utils/utils";

export const handler: Handler = async (event: SQSEvent) => {
  const { body } = event.Records[0];
  const params = JSON.parse(body) as { userId: string; alertId: string };

  console.log("Received event:", JSON.stringify(params));

  try {
    console.log("Getting alert...");
    const alert = await getAlert(params);
    console.log("Alert:", alert);

    console.log("Getting Vinted cookie...");
    const vintedCookie = await getVintedCookie();
    console.log("Cookie:", vintedCookie);

    if (!vintedCookie) {
      throw new Error("No cookie found");
    }

    const items = await getItems(alert.keywords, vintedCookie);

    const promisedItems = Promise.all(
      items.map(async (item) => {
        const isItemAlreadyChecked = await getCheckedItems(
          item.id,
          alert.alert_id
        );
        if (isItemAlreadyChecked) {
          console.log(`Item ${item.id} already checked`);
          return;
        }

        await setCheckedItem(item.id, alert.alert_id);
        console.log(`Item ${item.id} checked`);

        if (Number(item.price) <= alert.max_price) {
          await sendItemToQueue(
            {
              item,
              userId: alert.user_id,
              alertId: alert.alert_id,
            },
            process.env.NOTIFICATION_QUEUE_URL!
          );
          console.log(`Item ${item.id} sent to the queue`);
        }
      })
    );

    await promisedItems;

    // for (const item of items) {
    //   const isItemAlreadyChecked = await getCheckedItems(
    //     item.id,
    //     alert.alert_id
    //   );
    //   if (isItemAlreadyChecked) {
    //     console.log(`Item ${item.id} already checked`);
    //     continue;
    //   }

    //   await setCheckedItem(item.id, alert.alert_id);
    //   console.log(`Item ${item.id} checked`);

    //   if (Number(item.price) <= alert.max_price) {
    //     await sendItemToQueue(
    //       {
    //         item,
    //         userId: alert.user_id,
    //         alertId: alert.alert_id,
    //       },
    //       process.env.NOTIFICATION_QUEUE_URL!
    //     );
    //     console.log(`Item ${item.id} sent to the queue`);
    //   }
    // }

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
