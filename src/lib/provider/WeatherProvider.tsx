import { createContext, useContext } from 'react'
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { WeatherAPI } from 'src/lib/serverFunctions'
import { WeatherData } from '../serverFunctions/weatherAPI/weatherAPI.interface'
import { useLocationQuery } from './LocationQueryProvider'

interface WeatherContextType {
  weatherQuery: UseQueryResult<WeatherData, Error>
  refetchWeather: () => void
}

const WeatherQueryContext = createContext<WeatherContextType | undefined>(undefined)

export const WeatherQueryProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient()
  const { geoLocationQuery } = useLocationQuery()

  const getWeatherFn = useServerFn(WeatherAPI.getWeather)

  const weatherQuery = useQuery<WeatherData, Error>({
    queryKey: ['weather', geoLocationQuery?.data?.[0]?.lat, geoLocationQuery?.data?.[0]?.lon],
    queryFn: () => {
      if (!geoLocationQuery?.data?.[0]) {
        throw new Error('Location not available')
      }
      const { lat, lon } = geoLocationQuery.data[0]
      return getWeatherFn({ data: { lat, lon } })
    },
    refetchInterval: 60000, // Refetch every 60 seconds
    refetchIntervalInBackground: true,
    enabled: !!geoLocationQuery?.isSuccess,
  })

  const refetchWeather = () => {
    queryClient.invalidateQueries({ queryKey: ['weather'] })
  }

  return (
    <WeatherQueryContext.Provider
      value={{
        weatherQuery,
        refetchWeather,
      }}
    >
      {children}
    </WeatherQueryContext.Provider>
  )
}

export const useWeather = () => {
  const context = useContext(WeatherQueryContext)
  if (!context) {
    throw new Error('useWeather must be used within WeatherProvider')
  }
  return context
}