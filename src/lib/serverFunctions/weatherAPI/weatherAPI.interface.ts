import { z } from "zod";

export const APIKeySchema = z.string().min(1);

export const GeoLocationSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  name: z.string(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
});

export type GeoLocation = z.infer<typeof GeoLocationSchema>;

export const WeatherDataSchema = z.object({
    current: z.object({
        temperature: z.number(),
        feels_like: z.number(),
        humidity: z.number(),
        condition: z.object({
            name: z.string(),
            description: z.string(),
        })
    }),
    forecast: z.object({
        low: z.number(),
        high: z.number(),
    }),
    location: GeoLocationSchema,
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;

export interface IWeatherAPI {
  getGeoLocation(query: string): Promise<GeoLocation[]>;
  getGeoLocationFromCoords(lat: number, lon: number): Promise<GeoLocation[]>;
  getWeather(lat: number, lon: number): Promise<WeatherData>;
}