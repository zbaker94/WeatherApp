import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Countries, Country, getCountries } from "@/lib/serverFunctions/countryData";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import {memo} from "react";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
}



const CountrySelect = memo(({ value, onChange }: CountrySelectProps) => {
    
    const getCountriesFn = useServerFn(getCountries)

    const getCountriesQuery = useQuery<Countries, Error>({
    queryKey: ["countries"],
    queryFn: async () => {
      return await getCountriesFn();
    },
  });

  if (getCountriesQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (getCountriesQuery.isError) {
    return <div>Error loading countries</div>;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Choose Country" />
      </SelectTrigger>
      <SelectContent>
        {getCountriesQuery.data?.map((country: Country) => (
          <SelectItem key={country["alpha-2"]} value={country["alpha-2"]}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

export default CountrySelect;
