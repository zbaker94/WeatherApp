import WeatherTextConditions from "@/components/WeatherText/WeatherTextConditions";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useLocation } from "@/lib/provider/LocationProvider";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const { location, userAcceptedLocation, locationQueryIsSuccess } = useLocation();

  const MotionMapPin = motion(MapPin);

  return (
    <motion.div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <motion.div className="flex flex-row text-1xl sm:text-3xl md:text-5xl font-bold leading-tight mr-90">
        IT IS
      </motion.div>
      <WeatherTextConditions />
      <motion.div className="text-1xl sm:text-3xl md:text-5xl font-bold leading-tight mr-50">
        IN
      </motion.div>
      <motion.div className="text-4xl sm:text-6xl md:text-8xl font-bold leading-tight relative flex items-center justify-center mr-40">
        {location?.name.toUpperCase() || '???'}
          <MotionMapPin
            className="ml-10 size-8 sm:size-12 md:size-16"
            animate={{ stroke: locationQueryIsSuccess ? '#d30f0fff' : '#000000' }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
      </motion.div>
    </motion.div>
  );
}
