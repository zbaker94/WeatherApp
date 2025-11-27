import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { WeatherAPI } from "src/lib/serverFunctions";
import { GeoLocation } from "../serverFunctions/weatherAPI/weatherAPI.interface";
import { z } from "zod";


interface LocationContextType {
  geoLocationQuery: UseQueryResult<GeoLocation[], Error> | undefined;
  userAcceptedLocation: boolean | null;
  refetchLocation: () => void;
  requestUserLocation: () => void;
  setCoords: React.Dispatch<React.SetStateAction<{ lat: number; lon: number } | null>>;
  setUserAcceptedLocation: React.Dispatch<React.SetStateAction<boolean | null>>;
}

const LocationQueryContext = createContext<LocationContextType | undefined>(
  undefined
);

export const LocationQueryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [userAcceptedLocation, setUserAcceptedLocation] = useState<
    boolean | null
  >(null);

  
  const getLocationFromCoordsFn = useServerFn(WeatherAPI.getLocationFromCoords);

  const geoLocationQuery = useQuery<GeoLocation[], Error>({
    queryKey: ["location", coords],
    queryFn: async () => {
      const parsedCoords = z
        .object({ lat: z.number(), lon: z.number() })
        .parse(coords);
      return await  getLocationFromCoordsFn({
        data: { lat: parsedCoords.lat, lon: parsedCoords.lon },
      });
    },
    enabled: !!coords,
    placeholderData: (previousData) => previousData ?? [],
  });





  const requestUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserAcceptedLocation(true);
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setUserAcceptedLocation(false);
          setCoords(null);
        }
      );
    } else {
      setUserAcceptedLocation(null);
      setCoords(null);
    }
  }, []);

  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  const refetchLocation = () => {
    queryClient.invalidateQueries({ queryKey: ["location"] });
  };

  return (
    <LocationQueryContext.Provider
      value={{
        geoLocationQuery,
        userAcceptedLocation,
        refetchLocation,
        requestUserLocation,
        setCoords,
        setUserAcceptedLocation,
      }}
    >
      {children}
    </LocationQueryContext.Provider>
  );
};

export const useLocationQuery = () => {
  const context = useContext(LocationQueryContext);
  if (!context) {
    throw new Error(
      "useLocationQuery must be used within LocationQueryProvider"
    );
  }
  return context;
};
