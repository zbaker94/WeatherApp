import { AnimatePresence, motion } from "framer-motion";
import { convertTemperatureToUnits, TemperatureUnits } from "./util";
import { useMemo } from "react";
import { useWeather } from "../../lib/provider/WeatherProvider";

interface AdditionalTemperatureDetailsProps {
    units: TemperatureUnits;
}

const AdditionalTemperatureDetails = ({ units }: AdditionalTemperatureDetailsProps) => {
    const { weatherQuery } = useWeather();

    const lowToDisplay = useMemo(() => {
        const lowKelvin = weatherQuery.data?.forecast?.low;
        if (lowKelvin === undefined) {
            return '?';
        }
        return convertTemperatureToUnits(lowKelvin, units);
    }, [weatherQuery.data?.forecast?.low, units]);
    
    const highToDisplay = useMemo(() => {
        const highKelvin = weatherQuery.data?.forecast?.high;
        if (highKelvin === undefined) {
            return '?';
        }
        return convertTemperatureToUnits(highKelvin, units);
    }, [weatherQuery.data?.forecast?.high, units]);
    
    const feelsLikeToDisplay = useMemo(() => {
        const feelsLikeKelvin = weatherQuery.data?.current.feels_like;
        if (feelsLikeKelvin === undefined) {
            return '?';
        }
        return convertTemperatureToUnits(feelsLikeKelvin, units);
    }, [weatherQuery.data?.current.feels_like, units]);

    return (
        <AnimatePresence mode="wait">
        <motion.div key={units} className="flex justify-end justify-items-end gap-1" transition={{ staggerChildren: 0.1 }} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">the low is {lowToDisplay}</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">with a high of {highToDisplay}</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">and the humidity is {weatherQuery.data?.current?.humidity ?? '?'}.</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500" >it feels like {feelsLikeToDisplay}.</motion.span>
        </motion.div>
        </AnimatePresence>
    );
}

export default AdditionalTemperatureDetails;
