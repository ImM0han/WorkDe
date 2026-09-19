import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'info';

interface AlertState {
  visible: boolean;
  type: AlertType;
  title?: string;
  message?: string;
  showAlert: (params: { type?: string; text1?: string; text2?: string }) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  type: 'success',
  title: '',
  message: '',
  showAlert: (params) => {
    set({
      visible: true,
      type: (params.type as AlertType) || 'info',
      title: params.text1 || '',
      message: params.text2 || '',
    });
    // Auto hide after 3 seconds
    setTimeout(() => {
      set({ visible: false });
    }, 3000);
  },
  hideAlert: () => set({ visible: false }),
}));
