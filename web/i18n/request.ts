import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => ({
  locale: "en-NG",
  messages: (await import("../messages/en.json")).default,
  timeZone: "Africa/Lagos",
}));
