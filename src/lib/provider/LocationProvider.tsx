import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { WeatherAPI } from 'src/lib/serverFunctions'
import { GeoLocation } from '../serverFunctions/weatherAPI/weatherAPI.interface'

interface LocationContextType {
  location: GeoLocation | undefined
  refetchLocation: () => void
  locationQueryIsLoading: boolean
  locationQueryIsError: boolean
  locationQueryIsSuccess: boolean
  locationQueryIsPending: boolean
  userAcceptedLocation: boolean | null
  error: Error | null
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient()

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null | undefined>(undefined)
  const [userAcceptedLocation, setUserAcceptedLocation] = useState<boolean| null>(null)

  const getLocationFn = useServerFn(WeatherAPI.getLocation)
  const getLocationFromCoordsFn = useServerFn(WeatherAPI.getLocationFromCoords)

  const locationQuery = useQuery<GeoLocation, Error>({
    queryKey: ['location', coords],
    queryFn: () => {
      if (coords) {
        return getLocationFromCoordsFn({ data: { lat: coords.lat, lon: coords.lon } })
      } else {
        return getLocationFn({ data: { query: 'Atlanta' } })
      }
    },
    enabled: coords !== undefined,
  })

  useEffect(() => {
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
        { timeout: 10000 }
      )
    } else {
      setUserAcceptedLocation(null)
      setCoords(null)
    }
  }, [])

  const refetchLocation = () => {
    queryClient.invalidateQueries({ queryKey: ['location'] })
  }

  useEffect(() => {
    if (locationQuery.isError) {
      console.error('Failed to fetch location:', locationQuery.error)
    }
  }, [locationQuery.isError, locationQuery.error])

  return (
    <LocationContext.Provider
      value={{
        location: locationQuery.data,
        refetchLocation,
        locationQueryIsLoading: locationQuery.isLoading,
        locationQueryIsError: locationQuery.isError,
        locationQueryIsSuccess: locationQuery.isSuccess,
        locationQueryIsPending: locationQuery.isPending,
        userAcceptedLocation,
        error: locationQuery.error,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider')
  }
  return context
}