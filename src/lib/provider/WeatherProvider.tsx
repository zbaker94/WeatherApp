import { createContext, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { WeatherAPI } from 'src/lib/serverFunctions'
import { WeatherData } from '../serverFunctions/weatherAPI/weatherAPI.interface'
import { useLocation } from './LocationProvider'

interface WeatherContextType {
  weather: WeatherData | undefined
  refetchWeather: () => void
  weatherQueryIsLoading: boolean
  weatherQueryIsError: boolean
  error: Error | null
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined)

export const WeatherProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient()
  const { location, locationQueryIsSuccess } = useLocation()

  const getWeatherFn = useServerFn(WeatherAPI.getWeather)

  const weatherQuery = useQuery<WeatherData, Error>({
    queryKey: ['weather', location?.lat, location?.lon],
    queryFn: () => {
      if (!location) {
        throw new Error('Location not available')
      }
      const { lat, lon } = location
      return getWeatherFn({ data: { lat, lon } })
    },
    enabled: !!locationQueryIsSuccess,
  })

  const refetchWeather = () => {
    queryClient.invalidateQueries({ queryKey: ['weather'] })
  }

  return (
    <WeatherContext.Provider
      value={{
        weather: weatherQuery.data,
        refetchWeather,
        weatherQueryIsLoading: weatherQuery.isLoading,
        weatherQueryIsError: weatherQuery.isError,
        error: weatherQuery.error,
      }}
    >
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