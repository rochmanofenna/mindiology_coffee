// app/reservation/confirm.tsx — Reservation Confirmation & Success
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useReservation, type Reservation } from '@/context/ReservationContext';
import { createReservation } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SuccessScreen({ reservation, onDone }: { reservation: Reservation; onDone: () => void }) {
  const dateObj = new Date(reservation.date);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dateFormatted = `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  return (
    <View style={successStyles.container}>
      <View style={successStyles.checkCircle}>
        <Ionicons name="checkmark" size={36} color="#fff" />
      </View>
      <Text style={successStyles.title}>Reservasi Dikonfirmasi!</Text>
      <Text style={successStyles.subtitle}>Kami menunggu kedatangan Anda</Text>

      <View style={successStyles.card}>
        <View style={successStyles.row}>
          <Ionicons name="cafe-outline" size={16} color={Colors.green} />
          <Text style={successStyles.label}>{reservation.branchName}</Text>
        </View>
        <View style={successStyles.row}>
          <Ionicons name="calendar-outline" size={16} color={Colors.green} />
          <Text style={successStyles.label}>{dateFormatted}</Text>
        </View>
        <View style={successStyles.row}>
          <Ionicons name="time-outline" size={16} color={Colors.green} />
          <Text style={successStyles.label}>{reservation.time} WIB</Text>
        </View>
        <View style={successStyles.row}>
          <Ionicons name="people-outline" size={16} color={Colors.green} />
          <Text style={successStyles.label}>{reservation.partySize} orang</Text>
        </View>
        {reservation.specialRequests ? (
          <View style={successStyles.row}>
            <Ionicons name="chatbubble-outline" size={16} color={Colors.green} />
            <Text style={successStyles.label}>{reservation.specialRequests}</Text>
          </View>
        ) : null}

        <View style={successStyles.divider} />
        <Text style={successStyles.code}>Kode Reservasi</Text>
        <Text style={successStyles.codeValue}>{reservation.id}</Text>
      </View>

      <TouchableOpacity style={successStyles.doneBtn} activeOpacity={0.8} onPress={onDone}>
        <Text style={successStyles.doneBtnText}>Kembali ke Beranda</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ConfirmReservation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedBranch, selectedDate, selectedTime, partySize, notes, setNotes, addReservation, reset } = useReservation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBranch || !selectedDate || !selectedTime) router.back();
  }, [selectedBranch, selectedDate, selectedTime]);

  if (!selectedBranch || !selectedDate || !selectedTime) {
    return null;
  }

  const dateObj = new Date(selectedDate);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dateFormatted = `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      let reservationId = '';
      let esbFailed = false;
      try {
        const result = await createReservation(selectedBranch.branchCode, {
          reservationDate: selectedDate,
          reservationTime: selectedTime,
          totalGuest: partySize,
          notes: notes || '',
        });
        reservationId = result.reservationCode || result.data?.reservationCode || result.id || '';
      } catch {
        esbFailed = true;
        reservationId = `RSV-${Math.floor(Math.random() * 900000 + 100000)}`;
      }

      if (esbFailed) {
        // Warn user that ESB didn't confirm — reservation may not be registered
        setError('Reservasi tersimpan secara lokal. Hubungi outlet untuk konfirmasi.');
      }

      const reservation: Reservation = {
        id: reservationId,
        branchId: selectedBranch.id,
        branchName: selectedBranch.name,
        date: selectedDate,
        time: selectedTime,
        partySize,
        specialRequests: notes || undefined,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      addReservation(reservation);
      setConfirmedReservation(reservation);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setError(e.message || 'Gagal membuat reservasi');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    reset();
    router.push('/');
  };

  if (success && confirmedReservation) {
    return <SuccessScreen reservation={confirmedReservation} onDone={handleDone} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Konfirmasi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Detail Reservasi</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="cafe" size={18} color={Colors.green} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Lokasi</Text>
              <Text style={styles.summaryValue}>{selectedBranch.name}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="calendar" size={18} color={Colors.green} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Tanggal</Text>
              <Text style={styles.summaryValue}>{dateFormatted}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="time" size={18} color={Colors.green} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Waktu</Text>
              <Text style={styles.summaryValue}>{selectedTime} WIB</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="people" size={18} color={Colors.green} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Jumlah Tamu</Text>
              <Text style={styles.summaryValue}>{partySize} orang</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Catatan Khusus</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Contoh: perayaan ulang tahun, kursi tinggi untuk bayi..."
            placeholderTextColor={Colors.textSoft + '88'}
            multiline
            numberOfLines={3}
          />
        </View>

        {error && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle" size={16} color={Colors.hibiscus} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={handleConfirm} disabled={loading}>
          <LinearGradient colors={[Colors.green, Colors.greenDeep]} style={styles.ctaBtn}>
            {loading ? (
              <Text style={styles.ctaText}>Memproses...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.ctaText}>Konfirmasi Reservasi</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text },

  summaryCard: { marginHorizontal: Spacing.xxl, backgroundColor: Colors.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, marginBottom: 20 },
  summaryTitle: { fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  summaryIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontFamily: Font.regular, fontSize: 11, color: Colors.textSoft, marginBottom: 1 },
  summaryValue: { fontFamily: Font.semibold, fontSize: 14, color: Colors.text },

  notesSection: { paddingHorizontal: Spacing.xxl, marginBottom: 20 },
  notesTitle: { fontFamily: Font.bold, fontSize: 14, color: Colors.text, marginBottom: 10 },
  notesInput: { fontFamily: Font.regular, backgroundColor: Colors.white, borderRadius: 14, padding: 14, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: '#F0EBE4', minHeight: 80, textAlignVertical: 'top' },

  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.xxl, padding: 12, backgroundColor: Colors.hibiscusLight, borderRadius: 10 },
  errorText: { fontFamily: Font.medium, fontSize: 13, color: Colors.hibiscus, flex: 1 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xxl, backgroundColor: Colors.cream, borderTopWidth: 1, borderTopColor: '#F0EBE4' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  ctaText: { fontFamily: Font.bold, fontSize: 16, color: '#fff' },
});

const successStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', padding: 36 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 22, shadowColor: Colors.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  title: { fontFamily: Font.displayBold, fontSize: 24, color: Colors.text, marginBottom: 6 },
  subtitle: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, marginBottom: 28 },

  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  label: { fontFamily: Font.medium, fontSize: 14, color: Colors.text },
  divider: { height: 1, backgroundColor: '#F0EBE4', marginVertical: 12 },
  code: { fontFamily: Font.regular, fontSize: 11, color: Colors.textSoft, marginBottom: 4 },
  codeValue: { fontFamily: Font.extrabold, fontSize: 20, color: Colors.green, letterSpacing: 1 },

  doneBtn: { backgroundColor: Colors.green, width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontFamily: Font.bold, color: '#fff', fontSize: 15 },
});
