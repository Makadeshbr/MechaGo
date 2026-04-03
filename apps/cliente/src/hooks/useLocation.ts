import { useState, useEffect } from "react";
import * as Location from "expo-location";

export interface LocationState {
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  address: string | null;
  city: string | null;
  state: string | null;
  error: string | null;
  loading: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    address: null,
    city: null,
    state: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    async function getInitialLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== "granted") {
          setState((prev) => ({
            ...prev,
            error: "Permissão de localização negada",
            loading: false,
          }));
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;

        // Busca o endereço amigável (Reverse Geocoding)
        const [place] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (place) {
          const city = place.city || place.subregion || "Cidade não identificada";
          const region = place.region || "UF";
          
          setState({
            coords: { latitude, longitude },
            address: `${place.street}, ${place.name} - ${place.district}`,
            city,
            state: region,
            error: null,
            loading: false,
          });
        } else {
          setState({
            coords: { latitude, longitude },
            address: null,
            city: "Localização atual",
            state: null,
            error: null,
            loading: false,
          });
        }
      } catch (err) {
        console.error("[useLocation] Error:", err);
        setState((prev) => ({
          ...prev,
          error: "Erro ao obter localização",
          loading: false,
        }));
      }
    }

    getInitialLocation();
  }, []);

  return state;
}
