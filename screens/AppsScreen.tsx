import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HudButton } from '@/components/HudButton';
import { MOBILE_APPS, type MobileAppKey } from '@/services/mobileLinks';
import type { ControlMode } from '@/services/storage';

type AppsScreenProps = {
  controlMode: ControlMode;
  loading: boolean;
  onAction: (appKey: MobileAppKey, action: 'otwórz' | 'zamknij') => void;
};

type AppCategory = {
  title: string;
  keys: MobileAppKey[];
};

const APP_CATEGORIES: AppCategory[] = [
  {
    title: 'Media',
    keys: ['spotify', 'youtube', 'netflix'],
  },
  {
    title: 'Komunikacja',
    keys: ['whatsapp', 'discord', 'teams'],
  },
  {
    title: 'Przeglądarki',
    keys: [],
  },
  {
    title: 'Narzędzia',
    keys: [],
  },
  {
    title: 'Gry',
    keys: ['steam'],
  },
  {
    title: 'System',
    keys: [],
  },
  {
    title: 'Praca / Nauka',
    keys: [],
  },
];

const ALL_APP_KEYS = APP_CATEGORIES.flatMap((category) => category.keys);

export function AppsScreen({ controlMode, loading, onAction }: AppsScreenProps) {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState(APP_CATEGORIES[0].title);

  const query = searchText.trim().toLowerCase();
  const selectedCategory = APP_CATEGORIES.find((category) => category.title === activeCategory);

  const visibleAppKeys = useMemo(() => {
    const sourceKeys = query ? ALL_APP_KEYS : selectedCategory?.keys ?? [];

    return sourceKeys.filter((appKey) => MOBILE_APPS[appKey].label.toLowerCase().includes(query));
  }, [query, selectedCategory?.keys]);

  return (
    <View style={styles.screen}>
      <View style={styles.topControls}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#6fa6bb" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Szukaj aplikacji..."
            placeholderTextColor="#60758d"
            style={styles.searchInput}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={10}>
              <Feather name="x" size={15} color="#8d75c9" />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
          keyboardShouldPersistTaps="handled">
          {APP_CATEGORIES.map((category) => {
            const active = !query && activeCategory === category.title;

            return (
              <Pressable
                key={category.title}
                onPress={() => setActiveCategory(category.title)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                  pressed && styles.pressed,
                ]}>
                <Text
                  numberOfLines={1}
                  style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {category.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={styles.appsContent}
        keyboardShouldPersistTaps="handled">
        {visibleAppKeys.map((appKey) => {
          const app = MOBILE_APPS[appKey];

          return (
            <View key={appKey} style={styles.appRow}>
              <View style={styles.appText}>
                <Text selectable style={styles.appName}>
                  {app.label}
                </Text>
                <Text style={styles.appMode}>
                  {controlMode === 'pc' ? 'Backend PC' : 'Telefon lokalnie'}
                </Text>
              </View>

              <View style={styles.appActions}>
                <HudButton
                  title="Otwórz"
                  onPress={() => onAction(appKey, 'otwórz')}
                  disabled={loading}
                  style={styles.appButton}
                />

                {controlMode === 'pc' ? (
                  <HudButton
                    title="Zamknij"
                    variant="secondary"
                    onPress={() => onAction(appKey, 'zamknij')}
                    disabled={loading}
                    style={styles.appButton}
                  />
                ) : null}
              </View>
            </View>
          );
        })}

        {visibleAppKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Brak aplikacji</Text>
            <Text style={styles.emptyText}>
              {query ? 'Zmień frazę wyszukiwania.' : 'Ta kategoria jest pusta.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topControls: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  searchBox: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.28)',
    borderRadius: 8,
    backgroundColor: 'rgba(3, 10, 22, 0.82)',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#d8edf4',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 8,
  },
  categoryChips: {
    gap: 8,
    paddingRight: 18,
  },
  categoryChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(140, 117, 201, 0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(9, 12, 28, 0.68)',
    paddingHorizontal: 12,
  },
  categoryChipActive: {
    borderColor: 'rgba(36, 199, 214, 0.58)',
    backgroundColor: 'rgba(36, 199, 214, 0.08)',
  },
  categoryChipText: {
    color: '#8d75c9',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryChipTextActive: {
    color: '#24c7d6',
  },
  panelScroll: {
    flex: 1,
    marginTop: 12,
  },
  appsContent: {
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  appRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(36, 199, 214, 0.22)',
    borderRadius: 9,
    backgroundColor: 'rgba(5, 15, 30, 0.66)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  appText: {
    flex: 1,
    gap: 3,
  },
  appName: {
    color: '#e2f4f8',
    fontSize: 17,
    fontWeight: '900',
  },
  appMode: {
    color: '#788aa5',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  appActions: {
    width: 130,
    gap: 7,
  },
  appButton: {
    minHeight: 34,
  },
  emptyState: {
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(140, 117, 201, 0.22)',
    borderRadius: 9,
    backgroundColor: 'rgba(9, 12, 28, 0.58)',
  },
  emptyTitle: {
    color: '#d8edf4',
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    color: '#788aa5',
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.62,
  },
});
