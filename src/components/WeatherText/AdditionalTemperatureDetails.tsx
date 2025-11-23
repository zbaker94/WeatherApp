import { AnimatePresence, motion } from "framer-motion";
import { convertTemperatureToUnits, TemperatureUnits } from "./util";
import { useMemo } from "react";

interface AdditionalTemperatureDetailsProps {
    units: TemperatureUnits;
}

const AdditionalTemperatureDetails = ({ units }: AdditionalTemperatureDetailsProps) => {
    const lowKelvin = 292.15; // TODO: Replace with actual data
    const highKelvin = 303.15; // TODO: Replace with actual data
    const feelsLikeKelvin = 301.15; // TODO: Replace with actual data
    const humidity = 60; // TODO: Replace with actual data

    const lowToDisplay = useMemo(() => {
        return convertTemperatureToUnits(lowKelvin, units);
    }, [lowKelvin, units]);

    const highToDisplay = useMemo(() => {
        return convertTemperatureToUnits(highKelvin, units);
    }, [highKelvin, units]);

    const feelsLikeToDisplay = useMemo(() => {
        return convertTemperatureToUnits(feelsLikeKelvin, units);
    }, [feelsLikeKelvin, units]);

    return (
        <AnimatePresence mode="wait">
        <motion.div key={units} className="flex justify-end justify-items-end gap-1" transition={{ staggerChildren: 0.1 }} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">the low is {lowToDisplay}</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">with a high of {highToDisplay}</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500">and the humidity is {humidity}%.</motion.span>
            <motion.span className="text-sm sm:text-base md:text-lg text-gray-500" >it feels like {feelsLikeToDisplay}.</motion.span>
        </motion.div>
        </AnimatePresence>
    );
}

export default AdditionalTemperatureDetails;
