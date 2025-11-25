import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { ChevronDownIcon } from "lucide-react";
import AdditionalTemperatureDetails from "./AdditionalTemperatureDetails";
import { convertTemperatureToUnits, TemperatureUnits } from "./util";
import { useWeather } from "../../lib/WeatherProvider";
import { z } from "zod";



const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
            delay: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const TemperatureText = () => {
    const [units, setUnits] = useState<TemperatureUnits>(TemperatureUnits.FAHRENHEIT);
    const [open, setOpen] = useState(false);
    const { weather, isLoading, error, isError } = useWeather();
    
    const handleUnitChange = useCallback((unit: TemperatureUnits) => {
        setUnits(unit);
        setOpen(false);
    }, []);

    const temperatureToDisplay = useMemo(() => {
        const temperatureKelvin = weather?.main?.temp;
        const parsed = z.number().safeParse(temperatureKelvin);
        if (!parsed.success) {
            return 'N/A';
        }
        return convertTemperatureToUnits(parsed.data, units);
    }, [units, weather?.main?.temp, convertTemperatureToUnits]);

    if (isError) {
        return <div className="text-3xl sm:text-5xl md:text-7xl font-bold leading-tight">unable to load the weather: {String(error)}</div>;
    }
    if (isLoading) {
        return <div className="text-3xl sm:text-5xl md:text-7xl font-bold leading-tight">loading the weather</div>;
    }



    return (
        <div className="flex flex-col">
        <AnimatePresence mode="wait">
            <motion.div key={units} className="text-5xl sm:text-7xl md:text-9xl font-bold leading-tight flex items-center justify-center gap-4" variants={containerVariants} initial="hidden" animate="show">
                <AnimatePresence>
                    <motion.span key={`temp-${units}`} variants={itemVariants}>{temperatureToDisplay}</motion.span>
                </AnimatePresence>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="text-4xl sm:text-5xl md:text-8xl font-bold leading-tight p-2 h-auto hover:bg-transparent flex items-center cursor-pointer">
                            <AnimatePresence>
                                <motion.div key={`unit-${units}`} variants={itemVariants} className="flex items-center">
                                    {units}
                                    <ChevronDownIcon className={`ml-2 size-8 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                                </motion.div>
                            </AnimatePresence>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                        {Object.values(TemperatureUnits).map((u) => (
                            u === units ? null : (
                            <Button key={u} variant="ghost" onClick={() => handleUnitChange(u)} className="w-full justify-start cursor-pointer">
                                {u}
                            </Button>
                            )
                        ))}
                    </PopoverContent>
                </Popover>
            </motion.div>
        </AnimatePresence>
        <AdditionalTemperatureDetails units={units} />
        </div>
    );
}

export default TemperatureText;
