// components/ErrorBoundary.tsx — Catches unhandled errors to prevent white screen crashes
import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={40} color={Colors.gold} />
          </View>
          <Text style={styles.title}>Terjadi Kesalahan</Text>
          <Text style={styles.desc}>
            {this.props.fallbackMessage || 'Aplikasi mengalami masalah. Coba lagi.'}
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.debug} numberOfLines={4}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.text,
    marginBottom: 8,
  },
  desc: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  debug: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.hibiscus,
    backgroundColor: Colors.hibiscusLight,
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: '#fff',
  },
});
