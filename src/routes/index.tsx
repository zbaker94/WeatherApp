import WeatherTextConditions from "@/components/WeatherText/WeatherTextConditions";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <div className="flex flex-row text-4xl sm:text-6xl md:text-8xl font-bold leading-tight text-left">
        IT IS
      </div>
      <WeatherTextConditions />
      <div className="text-4xl sm:text-6xl md:text-8xl font-bold leading-tight">
        IN
      </div>
      <div className="text-5xl sm:text-7xl md:text-9xl font-bold leading-tight relative flex items-center justify-center">
        BEVERLY HILLS
        <MapPin className="ml-10 cursor-pointer" size={64} />
      </div>
    </div>
  );
}
