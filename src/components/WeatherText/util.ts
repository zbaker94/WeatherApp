enum TemperatureUnits {
    FAHRENHEIT = 'FAHRENHEIT',
    CELSIUS = 'CELSIUS',
    KELVIN = 'KELVIN'
}

const convertKelvinToFahrenheit = (kelvin: number) => {
    return ((kelvin - 273.15) * 9) / 5 + 32;
}

const convertKelvinToCelsius = (kelvin: number) => {
    return kelvin - 273.15;
}

const convertTemperatureToUnits = (kelvin: number, units: TemperatureUnits): string => {
    switch (units) {
            case TemperatureUnits.FAHRENHEIT:
                return `${Math.round(convertKelvinToFahrenheit(kelvin))}°`;
            case TemperatureUnits.CELSIUS:
                return `${Math.round(convertKelvinToCelsius(kelvin))}°`;
            case TemperatureUnits.KELVIN:
                return `${Math.round(kelvin)}°`;
            default:
                return '';
        }
}

export { TemperatureUnits, convertKelvinToFahrenheit, convertKelvinToCelsius, convertTemperatureToUnits };