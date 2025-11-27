import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { States, State, getStates } from "@/lib/serverFunctions/stateData";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

interface StateSelectProps {
	value: string;
	onChange: (value: string) => void;
}

import { memo } from "react";

const StateSelect = memo(({ value, onChange }: StateSelectProps) => {
	const getStatesFn = useServerFn(getStates);

	const getStatesQuery = useQuery<States, Error>({
		queryKey: ["states"],
		queryFn: async () => {
			return await getStatesFn();
		},
	});

	if (getStatesQuery.isLoading) {
		return <div>Loading...</div>;
	}

	if (getStatesQuery.isError) {
		return <div>Error loading states</div>;
	}

	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Choose State" />
			</SelectTrigger>
			<SelectContent>
				{getStatesQuery.data?.map((state: State) => (
					<SelectItem key={state.abbreviation} value={state.abbreviation}>
						{state.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
});

export default StateSelect;
