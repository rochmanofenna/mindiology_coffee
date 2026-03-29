// app/reservation/select-time.tsx — Date, Time & Party Size Selection
import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useReservation } from '@/context/ReservationContext';
import { getReservationTimes } from '@/services/api';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Generate next 14 days
function getNext14Days(): { date: string; dayName: string; dayNum: number; monthShort: string; isToday: boolean }[] {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const result = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push({
      date: d.toISOString().split('T')[0],
      dayName: days[d.getDay()],
      dayNum: d.getDate(),
      monthShort: months[d.getMonth()],
      isToday: i === 0,
    });
  }
  return result;
}

// Generate time slots based on operating hours (fallback when ESB unavailable)
function generateFallbackSlots(hours: string): string[] {
  const match = hours.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
  if (!match) return [];
  const startH = parseInt(match[1]);
  const endH = parseInt(match[3]);
  const slots: string[] = [];
  for (let h = Math.max(startH, 10); h < endH - 1; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

export default function SelectTimeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedBranch, selectedDate, selectedTime, partySize, setDate, setTime, setPartySize } = useReservation();
  const dates = useMemo(() => getNext14Days(), []);

  const [apiSlots, setApiSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);

  // Default to today
  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setDate(dates[0].date);
    }
  }, []);

  // Fetch time slots from ESB when date or branch changes
  useEffect(() => {
    if (!selectedBranch || !selectedDate) return;

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(false);

    getReservationTimes(selectedBranch.branchCode, selectedDate)
      .then(result => {
        if (cancelled) return;
        // Try to extract time slots from ESB response (shape may vary)
        const slots = result.data?.times || result.times || result.data || [];
        if (Array.isArray(slots) && slots.length > 0) {
          // Slots might be strings like "10:00" or objects like { time: "10:00", available: true }
          const mapped = slots.map((s: any) => typeof s === 'string' ? s : s.time || s.timeSlot || '');
          setApiSlots(mapped.filter(Boolean));
        } else {
          setApiSlots(null); // fall back to client-side
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiSlots(null); // fall back to client-side
          setSlotsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedDate, selectedBranch]);

  // Use API slots when available, fallback to client-side
  const timeSlots = apiSlots || (selectedBranch ? generateFallbackSlots(selectedBranch.hours) : []);

  const canProceed = selectedDate && selectedTime && partySize > 0;

  const adjustParty = (delta: number) => {
    const next = Math.max(1, Math.min(20, partySize + delta));
    setPartySize(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  useEffect(() => {
    if (!selectedBranch) router.back();
  }, [selectedBranch]);

  if (!selectedBranch) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Pilih Waktu</Text>
          <Text style={styles.branchLabel}>{selectedBranch.shortName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tanggal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {dates.map(d => (
              <TouchableOpacity
                key={d.date}
                style={[styles.dateCard, selectedDate === d.date && styles.dateCardActive]}
                onPress={() => setDate(d.date)}
              >
                <Text style={[styles.dateDayName, selectedDate === d.date && styles.dateTextActive]}>
                  {d.isToday ? 'Hari ini' : d.dayName}
                </Text>
                <Text style={[styles.dateDayNum, selectedDate === d.date && styles.dateTextActive]}>
                  {d.dayNum}
                </Text>
                <Text style={[styles.dateMonth, selectedDate === d.date && styles.dateTextActive]}>
                  {d.monthShort}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Waktu</Text>
          {slotsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.green} />
            </View>
          ) : (
            <>
              <View style={styles.timeGrid}>
                {timeSlots.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeSlot, selectedTime === slot && styles.timeSlotActive]}
                    onPress={() => setTime(slot)}
                  >
                    <Text style={[styles.timeText, selectedTime === slot && styles.timeTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {timeSlots.length === 0 && (
                <Text style={styles.noSlots}>Tidak ada slot waktu tersedia</Text>
              )}
              {slotsError && !apiSlots && timeSlots.length > 0 && (
                <Text style={styles.estimateNote}>Jadwal estimasi — hubungi outlet untuk konfirmasi</Text>
              )}
            </>
          )}
        </View>

        {/* Party Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jumlah Tamu</Text>
          <View style={styles.partyRow}>
            <TouchableOpacity style={styles.partyBtn} onPress={() => adjustParty(-1)}>
              <Ionicons name="remove" size={20} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.partyDisplay}>
              <Text style={styles.partyNum}>{partySize}</Text>
              <Text style={styles.partyLabel}>{partySize === 1 ? 'orang' : 'orang'}</Text>
            </View>
            <TouchableOpacity style={styles.partyBtnAdd} onPress={() => adjustParty(1)}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, !canProceed && styles.ctaBtnDisabled]}
          activeOpacity={0.8}
          disabled={!canProceed}
          onPress={() => router.push('/reservation/confirm')}
        >
          <Text style={styles.ctaText}>Lanjutkan</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerCenter: { alignItems: 'center' },
  title: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.text },
  branchLabel: { fontFamily: Font.medium, fontSize: 12, color: Colors.textSoft, marginTop: 2 },

  section: { paddingHorizontal: Spacing.xxl, marginBottom: 28 },
  sectionTitle: { fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 14 },

  // Date picker
  dateRow: { gap: 8, paddingRight: 24 },
  dateCard: { width: 68, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D8', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  dateCardActive: { backgroundColor: Colors.green, borderColor: Colors.green, shadowColor: Colors.green, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  dateDayName: { fontFamily: Font.medium, fontSize: 11, color: Colors.textSoft, marginBottom: 4 },
  dateDayNum: { fontFamily: Font.extrabold, fontSize: 22, color: Colors.text, marginBottom: 2 },
  dateMonth: { fontFamily: Font.medium, fontSize: 11, color: Colors.textSoft },
  dateTextActive: { color: '#fff' },

  // Time slots
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E8E0D8' },
  timeSlotActive: { backgroundColor: Colors.green, borderColor: Colors.green },
  timeText: { fontFamily: Font.semibold, fontSize: 14, color: Colors.text },
  timeTextActive: { color: '#fff' },
  noSlots: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft },
  loadingContainer: { paddingVertical: 24, alignItems: 'center' },
  estimateNote: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, fontStyle: 'italic', marginTop: 10 },

  // Party size
  partyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  partyBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 2, borderColor: '#E8E0D8', alignItems: 'center', justifyContent: 'center' },
  partyBtnAdd: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  partyDisplay: { alignItems: 'center' },
  partyNum: { fontFamily: Font.displayBlack, fontSize: 40, color: Colors.text },
  partyLabel: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, marginTop: -2 },

  // Bottom
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xxl, backgroundColor: Colors.cream, borderTopWidth: 1, borderTopColor: '#F0EBE4' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.green, height: 54, borderRadius: 14, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  ctaBtnDisabled: { backgroundColor: Colors.brownLight, opacity: 0.5 },
  ctaText: { fontFamily: Font.bold, fontSize: 16, color: '#fff' },
});
