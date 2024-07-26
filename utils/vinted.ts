import { VintedItem } from "./types";

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
