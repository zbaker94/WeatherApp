import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useLocationQuery } from "@/lib/provider/LocationQueryProvider";
import TemperatureText from "@/components/WeatherText/TemparatureText";

export const Route = createFileRoute("/")({ component: App, });

function App() {
  const { locationQuery } = useLocationQuery();

  const MotionMapPin = motion(MapPin);

  return (
    <motion.div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <motion.div className="flex flex-row text-1xl sm:text-3xl md:text-5xl font-bold leading-tight mr-90">
        IT IS
      </motion.div>

      <TemperatureText />
      <motion.div className="text-1xl sm:text-3xl md:text-5xl font-bold leading-tight mr-50">
        IN
      </motion.div>
      <motion.div className="text-4xl sm:text-6xl md:text-8xl font-bold leading-tight relative flex items-center justify-center mr-40">
        { locationQuery?.data?.[0]?.name.toUpperCase() ?? '???'}
          <MotionMapPin
            className="ml-10 size-8 sm:size-12 md:size-16"
            animate={{ stroke: locationQuery?.isSuccess ? '#d30f0fff' : '#000000' }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
      </motion.div>
    </motion.div>
  );
}
