import { useLocationQuery } from "src/lib/provider/LocationQueryProvider"
import { MapPin } from "lucide-react"
import { motion } from "framer-motion"

type LocationIconProps = {
    className?: string;
};

const LocationIcon = ({ className }: LocationIconProps) => {
    const { requestUserLocation, userAcceptedLocation } = useLocationQuery();
    const MotionMapPin = motion.create(MapPin);
    
    return <MotionMapPin
            onClick={requestUserLocation}
            className={ `cursor-pointer ${className}`}
            animate={{ stroke: !!userAcceptedLocation ? '#d30f0fff' : '#000000' }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
};

export default LocationIcon;