import {
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "../ui/button";
import { MapPin } from "lucide-react";

import { useLocationQuery } from "@/lib/provider/LocationQueryProvider";

import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldSet } from "../ui/field";
import { Input } from "../ui/input";
import CountrySelect from "./CountrySelect";
import { USA_CODE } from "@/lib/serverFunctions/countryData";
import { useQuery } from "@tanstack/react-query";
import { GeoLocation } from "@/lib/serverFunctions/weatherAPI/weatherAPI.interface";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { WeatherAPI } from "@/lib/serverFunctions";
import StateSelect from "./StateSelect";
import { Card, CardDescription, CardFooter, CardHeader } from "../ui/card";

// TODO the format we get from the reverse lookup for state does not match the format used for the geocoding lookup
// e.g. we get full state name but need abbreviation
// This only really matters for pre-filling the selects when location data is available

const LocationDrawer = ({}) => {
  const { requestUserLocation, userAcceptedLocation, setCoords, setUserAcceptedLocation } = useLocationQuery();

    const [location, setLocation] = useState(""); // city or zip
    const [state, setState] = useState("");
    const [country, setCountry] = useState("");

  const getLocationFn = useServerFn(WeatherAPI.getLocation);

  const createLocationQueryString = (location: string, state: string, country: string): string => {
    let queryString = "";
    // If location is all numbers, treat as zip
    if (location && /^\d+$/.test(location)) {
      queryString = `${location},${country}`;
    } else {
      if (location) {
        queryString += location;
      }
      if (country) {
        if (country === USA_CODE && state) {
          queryString += `,${state}`;
        }
        queryString += `,${country}`;
      }
    }
    return queryString;
  };

  const reverseGeolocationQuery = useQuery<GeoLocation[], Error>({
    queryKey: ["location", { location, state, country }],
    queryFn: async () => {
      const queryString = createLocationQueryString(location, state, country);
      const result = await getLocationFn({ data: { query: queryString } });
      return result ?? [];
    },
    enabled: !!location,
  });


  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>
          CHOOSE LOCATION
          <Button
            disabled={!!userAcceptedLocation}
            variant="ghost"
            className="ml-4 p-0"
            onClick={requestUserLocation}
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </DrawerTitle>
      </DrawerHeader>
      <div className="p-5">
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="location">City or Zip Code</FieldLabel>
              <Input
                required
                id="location"
                autoComplete="off"
                placeholder="Enter city or ZIP code"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
            <FieldSeparator />
            <Field>
              <FieldLabel htmlFor="country">Country</FieldLabel>
              <CountrySelect
                value={country}
                onChange={setCountry}
              />
            </Field>
            {/* Hide state select if location is a zip code (all numbers) */}
            {!!country && country !== "" && country === USA_CODE && !(location && /^\d+$/.test(location)) ? (
              <Field>
                <FieldLabel htmlFor="state">State</FieldLabel>
                <StateSelect
                  value={state}
                  onChange={setState}
                />
              </Field>
            ) : null}
            <FieldSeparator />
          </FieldGroup>
        </FieldSet>
        <div className="mt-4 max-h-60 overflow-y-auto">
          {reverseGeolocationQuery.isLoading && <div>Loading...</div>}
          {reverseGeolocationQuery.isError && (
            <div>Error loading locations</div>
          )}
          {reverseGeolocationQuery.data?.map((location) => (
            <div
              key={`${location.lat}-${location.lon}`}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setCoords({ lat: location.lat, lon: location.lon });
                setUserAcceptedLocation(false);
              }}
            >
              <div className="flex flex-col">
              <Card>
                <CardHeader>
                  {location.name}
                </CardHeader>
                <CardDescription>
                  {`${location.lat}`}, {` ${location.lon}`}
                </CardDescription>
                <CardFooter>
                  {location.country ? `${location.country}` : ""}
                  {location.state ? `, ${location.state}` : ""}
                </CardFooter>
              </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
      <DrawerFooter>
        <Button
          disabled={!!userAcceptedLocation}
          variant="secondary"
          onClick={requestUserLocation}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Use Location
        </Button>
        <DrawerClose>
          <Button asChild className="w-full" variant="destructive">
            <span>Cancel</span>
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
};

export default LocationDrawer;
