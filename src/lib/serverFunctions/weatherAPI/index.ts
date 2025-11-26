import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { APIKeySchema } from "./weatherAPI.interface";
import { OpenWeatherAPIImpl } from "./openWeatherAPI";

const getAPIKey = () => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const parsedKey = APIKeySchema.safeParse(apiKey);
  if (!parsedKey.success) {
    throw new Error("OPENWEATHER_API_KEY environment variable is required");
  }
  return parsedKey.data;
};

export const weatherAPIImplementation = new OpenWeatherAPIImpl(getAPIKey);

export const getLocation = createServerFn({ method: "GET" })
  .inputValidator(z.object({ query: z.string().min(1) }))
  .handler(async ({ data }) => {
    return await weatherAPIImplementation.getGeoLocation(data.query);
  });

export const getLocationFromCoords = createServerFn({ method: "GET" })
  .inputValidator(z.object({ lat: z.number(), lon: z.number() }))
  .handler(async ({ data }) => {
    return await weatherAPIImplementation.getGeoLocationFromCoords(data.lat, data.lon);
  });

export const getWeather = createServerFn({ method: "GET" })
  .inputValidator(z.object({ lat: z.number(), lon: z.number() }))
  .handler(async ({ data }) => {
    const { lat, lon } = data;
    return await weatherAPIImplementation.getWeather(lat, lon);
  });
