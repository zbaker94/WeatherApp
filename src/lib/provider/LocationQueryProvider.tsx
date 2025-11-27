import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { WeatherAPI } from 'src/lib/serverFunctions'
import { GeoLocation } from '../serverFunctions/weatherAPI/weatherAPI.interface'
import { z } from 'zod'

interface LocationContextType {
  locationQuery: UseQueryResult<GeoLocation[], Error> | undefined
  userAcceptedLocation: boolean | null
  refetchLocation: () => void
  requestUserLocation: () => void
}

interface LocationQuery {
    city: string;
    state?: string;
    country?: string;
}

const LocationQueryContext = createContext<LocationContextType | undefined>(undefined)

export const LocationQueryProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient()

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [userAcceptedLocation, setUserAcceptedLocation] = useState<boolean| null>(null)
  const [reverseLocationQueryParams, setReverseLocationQueryParams] = useState<LocationQuery | null>(null)

  const getLocationFn = useServerFn(WeatherAPI.getLocation)
  const getLocationFromCoordsFn = useServerFn(WeatherAPI.getLocationFromCoords)

  const geoLocationQuery = useQuery<GeoLocation[], Error>({
    queryKey: ['location', coords],
    queryFn: () => {
        const parsedCoords = z.object({ lat: z.number(), lon: z.number() }).parse(coords)
        return getLocationFromCoordsFn({ data: { lat: parsedCoords.lat, lon: parsedCoords.lon } })
    },
    enabled: !!coords,
  })

  const createLocationQueryString = (params: LocationQuery): string => {
    let queryString = params.city;
    if (params.country) {
        if(params.country === 'US' && params.state) {
            queryString += `,${params.state}`;
        }
        queryString += `,${params.country}`;
    }
    return queryString;
  }

  const reverseGeolocationQuery = useQuery<GeoLocation[], Error>({
    queryKey: ['location', reverseLocationQueryParams],
    queryFn: () => {
        const parsedLocationQueryParams = z.object({
            city: z.string(),
            state: z.string().optional(),
            country: z.string().optional(),
        }).parse(reverseLocationQueryParams)
        const queryString = createLocationQueryString(parsedLocationQueryParams);
        return getLocationFn({ data: { query: queryString } })
    },
    enabled: !coords && !!reverseLocationQueryParams,
  });

  const requestUserLocation = useCallback(() => {
        if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
            setUserAcceptedLocation(true)
          setCoords({ lat: position.coords.latitude, lon: position.coords.longitude })
        },
        (error) => {
            console.warn('Geolocation error:', error)
            setUserAcceptedLocation(false)
          setCoords(null)
        },
      )
    } else {
      setUserAcceptedLocation(null)
      setCoords(null)
    }
  }, [])

  useEffect(() => {
    requestUserLocation()
  }, [requestUserLocation])

  const refetchLocation = () => {
    queryClient.invalidateQueries({ queryKey: ['location'] })
  }

  const locationQuery: UseQueryResult<GeoLocation[], Error> | undefined = useMemo(() => {
    if(userAcceptedLocation === true) {
        return geoLocationQuery;
    }

    if(!!reverseLocationQueryParams) {
        return reverseGeolocationQuery;
    }

    return undefined;
  }, [userAcceptedLocation, reverseLocationQueryParams, geoLocationQuery, reverseGeolocationQuery]);

  return (
    <LocationQueryContext.Provider
      value={{
        locationQuery,
        userAcceptedLocation,
        refetchLocation,
        requestUserLocation,
      }}
    >
      {children}
    </LocationQueryContext.Provider>
  )
}

export const useLocationQuery = () => {
  const context = useContext(LocationQueryContext)
  if (!context) {
    throw new Error('useLocationQuery must be used within LocationQueryProvider')
  }
  return context
}