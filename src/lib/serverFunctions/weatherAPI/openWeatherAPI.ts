import axios from "axios";
import {
  GeoLocationSchema,
  WeatherDataSchema,
  GeoLocation,
  WeatherData,
  IWeatherAPI,
} from "./weatherAPI.interface";
import { z } from "zod";

// Define OpenWeather-specific schemas that extend the base
const RawOpenWeatherGeoLocationSchema = z.object({
  name: z.string(),
  local_names: z.record(z.string(), z.string()).optional(),
  country: z.string(),
  state: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
});

const RawOpenWeatherGeoLocationsSchema = z.array(RawOpenWeatherGeoLocationSchema);

const RawOpenWeatherWeatherDataSchema = z.object({
  coord: z.object({
    lon: z.number(),
    lat: z.number(),
  }),
  weather: z.array(
    z.object({
      id: z.number(),
      main: z.string(),
      description: z.string(),
      icon: z.string(),
    })
  ),
  base: z.string(),
  main: z.object({
    temp: z.number(),
    feels_like: z.number(),
    temp_min: z.number(),
    temp_max: z.number(),
    pressure: z.number(),
    humidity: z.number(),
    sea_level: z.number(),
    grnd_level: z.number(),
  }),
  visibility: z.number(),
  wind: z.object({
    speed: z.number(),
    deg: z.number(),
    gust: z.number().optional(),
  }),
  rain: z
    .object({
      "1h": z.number(),
    })
    .optional(),
  clouds: z.object({
    all: z.number(),
  }),
  dt: z.number(),
  sys: z.object({
    type: z.number(),
    id: z.number(),
    country: z.string(),
    sunrise: z.number(),
    sunset: z.number(),
  }),
  timezone: z.number(),
  id: z.number(),
  name: z.string(),
  cod: z.number(),
});

type OpenWeatherGeoLocation = z.infer<typeof RawOpenWeatherGeoLocationSchema>;
type OpenWeatherWeatherData = z.infer<typeof RawOpenWeatherWeatherDataSchema>;

export class OpenWeatherAPIImpl implements IWeatherAPI {
  readonly getAPIKey: () => string;

  constructor(getAPIKey: () => string) {
    this.getAPIKey = getAPIKey;
  }

  private transformGeoLocation(data: OpenWeatherGeoLocation[]): GeoLocation[] {
    return data.map(item => GeoLocationSchema.parse({
      lat: item.lat,
      lon: item.lon,
      name: item.name,
      country: item.country,
      state: item?.state,
      
    }));
  }

  private transformWeatherData(data: OpenWeatherWeatherData[]): WeatherData[] {
    return data.map(item => WeatherDataSchema.parse({
      current: {
        temperature: item.main.temp,
        feels_like: item.main.feels_like,
        humidity: item.main.humidity,
        condition: {
          name: item.weather[0]?.main || "Unknown",
          description: item.weather[0]?.description || "No description",
        },
      },
      forecast: {
        low: item.main.temp_min,
        high: item.main.temp_max,
      },
      location: {
        lat: item.coord.lat,
        lon: item.coord.lon,
        name: item.name,
      },
    }));
  }

  async getGeoLocation(query: string): Promise<GeoLocation[]> {
    try {
      const API_KEY = this.getAPIKey();
      // Check if query matches zip code pattern: "zip,country"
      // zip: all numbers, country: 2-letter code
      const zipPattern = /^\s*(\d+),\s*([a-zA-Z]{2})\s*$/;
      const match = query.match(zipPattern);
      let response;
      if (match) {
        // Use zip endpoint
        const zip = match[1];
        const country = match[2];
        response = await axios.get(
          `http://api.openweathermap.org/geo/1.0/zip?zip=${zip},${country}&appid=${API_KEY}`
        );
        // The zip endpoint returns a single object, not an array
        const parsedResponse = RawOpenWeatherGeoLocationSchema.parse(response.data);
        return this.transformGeoLocation([parsedResponse]);
      } else {
        // Use default direct endpoint
        response = await axios.get(
          `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=4&appid=${API_KEY}`
        );
        const parsedResponse = RawOpenWeatherGeoLocationsSchema.parse(response.data);
        return this.transformGeoLocation(parsedResponse);
      }
    } catch (error) {
      console.debug("Error in getGeoLocation:", error);
      throw new Error("Failed to get location");
    }
  }

  async getGeoLocationFromCoords(lat: number, lon: number): Promise<GeoLocation[]> {
    try {
      const API_KEY = this.getAPIKey();
      const response = await axios.get(
        `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=4&appid=${API_KEY}`
      );
      const parsedResponse = RawOpenWeatherGeoLocationsSchema.parse(response.data);
      return this.transformGeoLocation(parsedResponse);
    } catch (error) {
      console.debug("Error in getGeoLocationFromCoords:", error);
      throw new Error("Failed to get location from coordinates");
    }
  }

  async getWeather(lat: number, lon: number): Promise<WeatherData> {
    try {
      const API_KEY = this.getAPIKey();
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      // Note: This is a placeholder; you need to transform response.data to match OpenWeatherWeatherDataSchema
      const parsedResponse = RawOpenWeatherWeatherDataSchema.parse(response.data);
      return this.transformWeatherData([parsedResponse])[0];
    } catch (error) {
      console.debug("Error in getWeather:", error);
      throw new Error("Failed to get weather");
    }
  }
}
