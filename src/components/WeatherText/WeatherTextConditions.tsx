import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import TemperatureText from "./TemparatureText";

const WeatherTextConditions = () => {
  const conditionComponents = [TemperatureText, () => <div className="">SUNNY</div>, () => <div className="">WINDY</div>];

  return (
    <Carousel>
      <CarouselContent>
        {conditionComponents.map((ConditionComponent, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
                <ConditionComponent />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default WeatherTextConditions;
