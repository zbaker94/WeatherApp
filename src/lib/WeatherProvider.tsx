import { createContext, useContext, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { getLocation, getWeather } from './serverfns'
import {z} from 'zod'

const weatherQuerySchema = z.object({
    lat: z.number(),
    lon: z.number(),
})

interface LocationData {
  name: string
  lat: number
  lon: number
  country: string
  state: string
}


interface WeatherData {
  main: {
    temp: number
    temp_min: number
    temp_max: number
    feels_like: number
    humidity: number
  }
  weather: Array<{
    main: string
    description: string
  }>
}

interface WeatherContextType {
  location: LocationData | undefined
  weather: WeatherData | undefined
  refetch: () => void
  isLoading: boolean
  isError: boolean
  error: any
}

const WeatherContext = createContext<WeatherContextType | null>(null)

export const WeatherProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient()

  const getLocationFn = useServerFn(getLocation)
  const getWeatherFn = useServerFn(getWeather)

  const locationQuery = useQuery<LocationData, Error>({
    queryKey: ['location'],
    queryFn: getLocationFn,
  })

  const weatherQuery = useQuery<WeatherData>({
    queryKey: ['weather', locationQuery.data?.lat, locationQuery.data?.lon],
    queryFn: () => {
      const { lat, lon } = locationQuery.data!
      const parsed = weatherQuerySchema.safeParse({ lat, lon })
      if (!parsed.success) {
        throw new Error('Invalid lat/lon')
      }
      return getWeatherFn({data: { lat: parsed.data.lat, lon: parsed.data.lon }})
    },
    enabled: !!locationQuery.data && weatherQuerySchema.safeParse({ lat: locationQuery.data.lat, lon: locationQuery.data.lon }).success,
  })

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['location'] })
    queryClient.invalidateQueries({ queryKey: ['weather'] })
  }

    useEffect(() => {
    if (locationQuery.isError) {
      console.error('Failed to fetch location:', locationQuery.error)
      // Add any other error handling logic here
    }
  }, [locationQuery.isError, locationQuery.error])

  return (
    <WeatherContext.Provider value={{
      location: locationQuery.data,
      weather: weatherQuery.data,
      refetch,
      isLoading: locationQuery.isLoading || weatherQuery.isLoading,
      isError: locationQuery.isError || weatherQuery.isError,
      error: locationQuery.error || weatherQuery.error,
    }}>
      {children}
    </WeatherContext.Provider>
  )
}

export const useWeather = () => {
  const context = useContext(WeatherContext)
  if (!context) {
    throw new Error('useWeather must be used within WeatherProvider')
  }
  return context
}