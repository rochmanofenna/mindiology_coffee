// app/careers/[id].tsx — Job Detail + Apply
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Spacing } from '@/constants/theme';
import { JOBS } from '@/constants/jobs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function JobDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const job = JOBS.find(j => j.id === id);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', experience: '' });
  const [submitted, setSubmitted] = useState(false);

  if (!job) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Posisi tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={36} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Lamaran Terkirim!</Text>
        <Text style={styles.successDesc}>Terima kasih sudah melamar posisi {job.title}. Tim HR kami akan menghubungi Anda melalui telepon dalam 3-5 hari kerja.</Text>
        <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/')}>
          <Text style={styles.successBtnText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showForm) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowForm(false)}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lamar {job.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
          {[
            { key: 'name', label: 'Nama Lengkap', placeholder: 'Masukkan nama lengkap', icon: 'person-outline' as const },
            { key: 'phone', label: 'Nomor HP', placeholder: '08xxxxxxxxxx', icon: 'call-outline' as const },
            { key: 'email', label: 'Email', placeholder: 'email@contoh.com', icon: 'mail-outline' as const },
          ].map(field => (
            <View key={field.key} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <View style={styles.fieldInput}>
                <Ionicons name={field.icon} size={16} color={Colors.textSoft} />
                <TextInput
                  style={styles.input}
                  value={form[field.key as keyof typeof form]}
                  onChangeText={v => setForm(prev => ({ ...prev, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textSoft + '88'}
                />
              </View>
            </View>
          ))}

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Pengalaman Kerja</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={form.experience}
              onChangeText={v => setForm(prev => ({ ...prev, experience: v }))}
              placeholder="Ceritakan pengalaman kerja Anda yang relevan..."
              placeholderTextColor={Colors.textSoft + '88'}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (!form.name || !form.phone) {
                Alert.alert('Data belum lengkap', 'Mohon isi nama dan nomor HP');
                return;
              }
              setSubmitted(true);
            }}
          >
            <LinearGradient colors={[Colors.green, Colors.greenDeep]} style={styles.submitBtn}>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitText}>Kirim Lamaran</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Posisi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.green} />
              <Text style={styles.metaText}>{job.branch}</Text>
            </View>
            <View style={[styles.typeBadge, job.type === 'part-time' && styles.typeBadgePT]}>
              <Text style={[styles.typeText, job.type === 'part-time' && styles.typeTextPT]}>
                {job.type === 'full-time' ? 'Full-time' : 'Part-time'}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.bodyText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Persyaratan</Text>
          {job.requirements.map((r, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{r}</Text>
            </View>
          ))}
        </View>

        {/* Benefits */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Benefit</Text>
          {job.benefits.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowForm(true)}>
          <LinearGradient colors={[Colors.green, Colors.greenDeep]} style={styles.applyBtn}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.applyText}>Lamar Sekarang</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.text },

  titleSection: { paddingHorizontal: Spacing.xxl, paddingVertical: 16 },
  jobTitle: { fontFamily: Font.displayBold, fontSize: 26, color: Colors.text, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: Font.medium, fontSize: 13, color: Colors.textSoft },
  typeBadge: { backgroundColor: Colors.greenMint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgePT: { backgroundColor: Colors.parchment },
  typeText: { fontFamily: Font.semibold, fontSize: 11, color: Colors.green },
  typeTextPT: { color: Colors.brown },

  detailSection: { paddingHorizontal: Spacing.xxl, marginBottom: 24 },
  sectionTitle: { fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 10 },
  bodyText: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green, marginTop: 6 },
  bulletText: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, lineHeight: 20, flex: 1 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xxl, backgroundColor: Colors.cream, borderTopWidth: 1, borderTopColor: '#F0EBE4' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  applyText: { fontFamily: Font.bold, fontSize: 16, color: '#fff' },

  // Form
  formContent: { paddingHorizontal: Spacing.xxl, paddingBottom: 40 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontFamily: Font.semibold, fontSize: 13, color: Colors.text, marginBottom: 6 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#F0EBE4' },
  input: { fontFamily: Font.regular, flex: 1, fontSize: 14, color: Colors.text },
  textArea: { flexDirection: 'column', minHeight: 100, alignItems: 'stretch', paddingTop: 12, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, marginTop: 8, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
  submitText: { fontFamily: Font.bold, fontSize: 16, color: '#fff' },

  // Success
  successContainer: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center', padding: 36 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 22, shadowColor: Colors.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  successTitle: { fontFamily: Font.displayBold, fontSize: 24, color: Colors.text, marginBottom: 10 },
  successDesc: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successBtn: { backgroundColor: Colors.green, width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  successBtnText: { fontFamily: Font.bold, color: '#fff', fontSize: 15 },

  // Not found
  notFound: { flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: Font.regular, fontSize: 16, color: Colors.textSoft, marginBottom: 12 },
  backLink: { fontFamily: Font.semibold, fontSize: 14, color: Colors.green },
});
