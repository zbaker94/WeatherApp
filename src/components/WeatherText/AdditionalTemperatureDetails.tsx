import { AnimatePresence, motion } from "framer-motion";
import { convertTemperatureToUnits, TemperatureUnits } from "./util";
import { useMemo } from "react";
import { useWeather } from "../../lib/WeatherProvider";

interface AdditionalTemperatureDetailsProps {
    units: TemperatureUnits;
}

const AdditionalTemperatureDetails = ({ units }: AdditionalTemperatureDetailsProps) => {
    const { weather } = useWeather();

    const lowToDisplay = useMemo(() => {
        const lowKelvin = weather?.main?.temp_min;
        if (lowKelvin === undefined) {
            return '?';
        }
        return convertTemperatureToUnits(lowKelvin, units);
    }, [weather?.main?.temp_min, units]);
    
    const highToDisplay = useMemo(() => {
        const highKelvin = weather?.main?.temp_max;
        if (highKelvin === undefined) {
            return '?';
        }
        return convertTemperatureToUnits(highKelvin, units);
    }, [weather?.main?.temp_max, units]);
    
    const feelsLikeToDisplay = useMemo(() => {
        const feelsLikeKelvin = weather?.main?.feels_like;
        if (feelsLikeKelvin === undefined) {
            return '?';
        }
        return convertTemperatureToUnits(feelsLikeKelvin, units);
    }, [weather?.main?.feels_like, units]);

    return (
        <AnimatePresence mode="wait">
        <motion.div key={units} className="flex justify-end justify-items-end gap-1" transition={{ staggerChildren: 0.1 }} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">the low is {lowToDisplay}</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">with a high of {highToDisplay}</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">and the humidity is {weather?.main?.humidity ?? '?'}%.</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500" >it feels like {feelsLikeToDisplay}.</motion.span>
        </motion.div>
        </AnimatePresence>
    );
}

export default AdditionalTemperatureDetails;
