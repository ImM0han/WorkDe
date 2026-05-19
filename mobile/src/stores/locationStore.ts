import { create } from 'zustand';

interface PickedLocation {
  lat: number;
  lng: number;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
}

interface LocationStore {
  pickedLocation: PickedLocation | null;
  setPickedLocation: (loc: PickedLocation) => void;
  clearPickedLocation: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  pickedLocation: null,
  setPickedLocation: (loc) => set({ pickedLocation: loc }),
  clearPickedLocation: () => set({ pickedLocation: null }),
}));
