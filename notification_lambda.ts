import { Handler, SQSEvent } from "aws-lambda";
import { WebhookClient } from "discord.js";
import { getSecret } from "./utils";

export type Item = {
  id: number;
  title: string;
  price: string;
  is_visible: number;
  is_visible_new: boolean;
  discount: any;
  currency: string;
  brand_title: string;
  user: {
    id: number;
    login: string;
    business: boolean;
    profile_url: string;
    photo: {
      id: number;
      width: number;
      height: number;
      temp_uuid: any;
      url: string;
      dominant_color: string;
      dominant_color_opaque: string;
      thumbnails: Array<{
        type: string;
        url: string;
        width: number;
        height: number;
        original_size: any;
      }>;
      is_suspicious: boolean;
      orientation: any;
      high_resolution: {
        id: string;
        timestamp: number;
        orientation: any;
      };
      full_size_url: string;
      is_hidden: boolean;
      extra: {};
    };
  };
  url: string;
  promoted: boolean;
  photo: {
    id: number;
    image_no: number;
    width: number;
    height: number;
    dominant_color: string;
    dominant_color_opaque: string;
    url: string;
    is_main: boolean;
    thumbnails: Array<{
      type: string;
      url: string;
      width: number;
      height: number;
      original_size?: boolean;
    }>;
    high_resolution: {
      id: string;
      timestamp: number;
      orientation: any;
    };
    is_suspicious: boolean;
    full_size_url: string;
    is_hidden: boolean;
    extra: {};
  };
  favourite_count: number;
  is_favourite: boolean;
  badge: any;
  conversion: any;
  service_fee: string;
  total_item_price: string;
  view_count: number;
  size_title: string;
  content_source: string;
  status: string;
  icon_badges: Array<any>;
  search_tracking_params: {
    score: number;
    matched_queries: any;
  };
};

export const handler: Handler = async (event: SQSEvent) => {
  const { body } = event.Records[0];
  const item = JSON.parse(body) as Item;
  try {
    const discordWebhookUrl = await getSecret(
      process.env.DISCORD_WEBHOOK_URL_ID!
    );

    const webhookClient = new WebhookClient({ url: discordWebhookUrl });

    await webhookClient.send({
      content: `New item found: ${item.title} - ${item.price}`,
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
