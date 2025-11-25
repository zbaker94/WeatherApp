import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import axios from 'axios'

const API_KEY = process.env.OPENWEATHER_API_KEY



export const getLocation = createServerFn({ method: 'GET' }).handler(async () => {
    if (!API_KEY) {
  throw new Error('OPENWEATHER_API_KEY environment variable is required')
}
  const response = await axios.get(
    `http://api.openweathermap.org/geo/1.0/direct?q=Beverly%20Hills,CA,US&limit=1&appid=${API_KEY}`
  )
  return response.data[0]
})

export const getWeather = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ lat: z.number(), lon: z.number() }))
  .handler(async ({data}) => {
    const { lat, lon } = data
    if (!API_KEY) {
      throw new Error('OPENWEATHER_API_KEY environment variable is required')
    }
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    )
    return response.data
  })