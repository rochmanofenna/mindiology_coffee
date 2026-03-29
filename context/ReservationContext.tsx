// context/ReservationContext.tsx — Reservation flow state management
import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { StoreInfo } from '@/constants/stores';

export interface Reservation {
  id: string;
  branchId: string;
  branchName: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

interface ReservationState {
  selectedBranch: StoreInfo | null;
  selectedDate: string | null;
  selectedTime: string | null;
  partySize: number;
  notes: string;
  reservations: Reservation[];
  setBranch: (branch: StoreInfo) => void;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setPartySize: (size: number) => void;
  setNotes: (notes: string) => void;
  addReservation: (r: Reservation) => void;
  cancelReservation: (id: string) => void;
  reset: () => void;
}

const ReservationContext = createContext<ReservationState | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<StoreInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const reset = () => {
    setSelectedBranch(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setPartySize(2);
    setNotes('');
  };

  const addReservation = (r: Reservation) => {
    setReservations(prev => [r, ...prev]);
  };

  const cancelReservation = (id: string) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' as const } : r));
  };

  return (
    <ReservationContext.Provider value={{
      selectedBranch, selectedDate, selectedTime, partySize, notes, reservations,
      setBranch: setSelectedBranch,
      setDate: setSelectedDate,
      setTime: setSelectedTime,
      setPartySize,
      setNotes,
      addReservation,
      cancelReservation,
      reset,
    }}>
      {children}
    </ReservationContext.Provider>
  );
}

export function useReservation() {
  const ctx = useContext(ReservationContext);
  if (!ctx) throw new Error('useReservation must be used within ReservationProvider');
  return ctx;
}
