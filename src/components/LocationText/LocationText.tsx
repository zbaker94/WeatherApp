import { Drawer, DrawerTrigger } from "@/components/ui/drawer";

import { motion, AnimatePresence } from "framer-motion";
import { useLocationQuery } from "src/lib/provider/LocationQueryProvider";
import LocationIcon from "./LocationIcon";
import { Button } from "../ui/button";
import LocationDrawer from "./LocationDrawer";

const LocationText = () => {
  const { geoLocationQuery } = useLocationQuery();
  const locationName = (geoLocationQuery?.data?.[0]?.name ?? "???").toUpperCase();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={locationName}
        className="flex items-center justify-center mr-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Drawer direction="right">
          <DrawerTrigger>
            <Button
              asChild
              variant="ghost"
              className="text-4xl sm:text-5xl md:text-8xl font-bold leading-tight p-2 h-auto hover:bg-transparent flex items-center cursor-pointer"
            >
              <span>
                <motion.span
                  key={`location-${locationName}`}
                  className="text-4xl sm:text-6xl md:text-8xl font-bold leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {locationName}
                </motion.span>
              </span>
            </Button>
          </DrawerTrigger>
          <LocationDrawer />
        </Drawer>
        <motion.div
          key={`icon-${locationName}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
        >
          <LocationIcon className="ml-4 size-8 sm:size-12 md:size-16" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LocationText;
