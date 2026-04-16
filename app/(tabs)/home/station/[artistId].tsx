import StationScreen from "@/screens/StationScreen";
import { useLocalSearchParams } from "expo-router";

export default function StationRoute() {
  const { artistId, name, thumb } = useLocalSearchParams<{
    artistId: string;
    name?: string;
    thumb?: string;
  }>();

  return (
    <StationScreen
      artistId={artistId}
      initialName={name ?? null}
      initialThumb={thumb ?? null}
      tab="home"
    />
  );
}