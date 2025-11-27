import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import TemperatureText from "@/components/WeatherText/TemparatureText";
import LocationText from "@/components/LocationText/LocationText";

export const Route = createFileRoute("/")({ component: App, });

function App() {
  return (
    <motion.div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <motion.div className="flex flex-row text-1xl sm:text-3xl md:text-5xl font-bold leading-tight mr-90">
        IT IS
      </motion.div>
      <TemperatureText />
      <motion.div className="text-1xl sm:text-3xl md:text-5xl font-bold leading-tight mr-50">
        IN
      </motion.div>
      <LocationText />
    </motion.div>
  );
}
