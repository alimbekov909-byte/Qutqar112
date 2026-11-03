import { useState, useEffect, useCallback } from 'react';
import { Coordinates } from '../types/emergency';

// Fallback coordinates (Central Almaty, Kazakhstan - high seismic risk zone where 112 digital system is vital)
const DEFAULT_COORDS: Coordinates = {
  latitude: 43.238942,
  longitude: 76.889709,
  accuracy: 8,
  altitude: 812,
  heading: null,
  speed: null,
  timestamp: Date.now(),
};

export function useGeolocation() {
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [address, setAddress] = useState<string>('г. Алматы, пр. Абая / ул. Байтурсынова');
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(84);

  // Read device battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  const refreshPosition = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Геолокация не поддерживается устройством');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        };
        setCoords(newCoords);
        setIsLocating(false);

        // Reverse geocode approximation (using open street map nominatim if online, or local grid)
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'ru,kk' } }
        )
          .then((res) => res.json())
          .then((data) => {
            if (data?.display_name) {
              // Clean up display address
              const parts = data.display_name.split(',');
              const concise = parts.slice(0, 3).join(', ');
              setAddress(concise);
            }
          })
          .catch(() => {
            // Keep default or coordinate-based string
          });
      },
      (err) => {
        console.warn('Geolocation error or denied:', err.message);
        setIsLocating(false);
        // Retain fallback coordinates so SOS functions never break
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, []);

  useEffect(() => {
    refreshPosition();

    // Also watch if allowed
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [refreshPosition]);

  return {
    coords,
    address,
    error,
    isLocating,
    batteryLevel,
    refreshPosition,
  };
}

// Distance calculation between coordinates in meters (Haversine formula)
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Bearing angle in degrees (0 = North, 90 = East, 180 = South, 270 = West)
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const brng = ((θ * 180) / Math.PI + 360) % 360; // in degrees
  return Math.round(brng);
}
