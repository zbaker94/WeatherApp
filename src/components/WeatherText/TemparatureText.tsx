import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { ChevronDownIcon } from "lucide-react";

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

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
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
    
    const temperatureKelvin = 284.2; // Data from API would be used here

    const handleUnitChange = useCallback((unit: TemperatureUnits) => {
        setUnits(unit);
        setOpen(false);
    }, []);

    const temperatureToDisplay = useMemo(() => {
        switch (units) {
            case TemperatureUnits.FAHRENHEIT:
                return `${Math.round(convertKelvinToFahrenheit(temperatureKelvin))}°`;
            case TemperatureUnits.CELSIUS:
                return `${Math.round(convertKelvinToCelsius(temperatureKelvin))}°`;
            case TemperatureUnits.KELVIN:
                return `${Math.round(temperatureKelvin)}°`;
            default:
                return '';
        }
    }, [units, temperatureKelvin]);

    return (
        <AnimatePresence mode="wait">
            <motion.div key={units} className="text-5xl sm:text-7xl md:text-9xl font-bold leading-tight flex items-center justify-center gap-4" variants={containerVariants} initial="hidden" animate="show">
                <AnimatePresence>
                    <motion.span key={`temp-${units}`} variants={itemVariants}>{temperatureToDisplay}</motion.span>
                </AnimatePresence>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="text-4xl sm:text-5xl md:text-8xl font-bold leading-tight p-0 h-auto hover:bg-transparent flex items-center cursor-pointer">
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
                            <Button key={u} variant="ghost" onClick={() => handleUnitChange(u)} className="w-full justify-start cursor-pointer">
                                {u}
                            </Button>
                        ))}
                    </PopoverContent>
                </Popover>
            </motion.div>
        </AnimatePresence>
    );
}

export default TemperatureText;