import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '@/constants/theme';
import { StoreInfo, STORES } from '@/constants/stores';

interface BranchBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (store: StoreInfo) => void;
  selectedBranchCode: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.55;

export function BranchBottomSheet({
  visible,
  onClose,
  onSelect,
  selectedBranchCode,
}: BranchBottomSheetProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const isAnimating = useRef(false);

  useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible]);

  function animateIn() {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(panelTranslateY, {
        toValue: 0,
        speed: 14,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function animateOut() {
    if (isAnimating.current) return;
    isAnimating.current = true;

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(panelTranslateY, {
        toValue: PANEL_HEIGHT,
        speed: 14,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
      onClose();
    });
  }

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateOut}>
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} />
        </Animated.View>

        {/* Panel */}
        <Animated.View
          style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}
        >
          {/* Drag handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Pilih Outlet</Text>

          {/* Branch list */}
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {STORES.map((store, index) => {
              const isSelected = store.branchCode === selectedBranchCode;
              return (
                <Pressable
                  key={store.id}
                  style={[
                    styles.row,
                    isSelected && styles.rowSelected,
                    index < STORES.length - 1 && styles.rowBorder,
                  ]}
                  onPress={() => onSelect(store)}
                >
                  {/* Left icon */}
                  <View style={styles.iconCircle}>
                    <Ionicons name="cafe" size={20} color={Colors.white} />
                  </View>

                  {/* Middle text */}
                  <View style={styles.textBlock}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {store.name}
                    </Text>
                    <Text style={styles.storeAddr} numberOfLines={1}>
                      {store.addr}
                    </Text>
                    <Text style={styles.storeHours}>{store.hours}</Text>
                  </View>

                  {/* Right checkmark */}
                  <View style={styles.checkArea}>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={16} color={Colors.white} />
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Safe area bottom padding */}
          <View style={styles.bottomSpacer} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C4C4C4',
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  rowSelected: {
    backgroundColor: Colors.greenMint,
    borderRadius: 12,
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  storeName: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  storeAddr: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textSoft,
    marginBottom: 2,
  },
  storeHours: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.green,
  },
  checkArea: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
