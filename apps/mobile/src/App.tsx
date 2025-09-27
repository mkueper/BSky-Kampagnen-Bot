import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  AVAILABLE_PLATFORMS,
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  formatScheduleSummary,
  formatSkeetDraft,
} from '@bsky-bot/shared';

const Stack = createNativeStackNavigator();

function CreateSkeetScreen() {
  const [body, setBody] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => AVAILABLE_PLATFORMS.map((item) => item.id));
  const [recurrence, setRecurrence] = useState('none');
  const defaultSchedule = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }, []);
  const [scheduledAt, setScheduledAt] = useState<Date>(() => new Date(defaultSchedule.getTime()));
  const [repeatDayOfWeek, setRepeatDayOfWeek] = useState<number | null>(null);
  const [repeatDayOfMonth, setRepeatDayOfMonth] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState<{ visible: boolean; mode: 'date' | 'time' }>({ visible: false, mode: 'date' });

  const preview = formatSkeetDraft({ title: '', body });
  const scheduleSummary = useMemo(
    () =>
      formatScheduleSummary({
        scheduledFor: scheduledAt.toISOString(),
        recurrence,
        repeatDayOfWeek,
        repeatDayOfMonth,
      }),
    [scheduledAt, recurrence, repeatDayOfWeek, repeatDayOfMonth],
  );

  const hasCustomSchedule = useMemo(() => {
    const defaultHours = defaultSchedule.getHours();
    const defaultMinutes = defaultSchedule.getMinutes();
    const timeDiff =
      scheduledAt.getHours() !== defaultHours || scheduledAt.getMinutes() !== defaultMinutes;

    if (recurrence === 'none') {
      return (
        scheduledAt.getFullYear() !== defaultSchedule.getFullYear() ||
        scheduledAt.getMonth() !== defaultSchedule.getMonth() ||
        scheduledAt.getDate() !== defaultSchedule.getDate() ||
        timeDiff
      );
    }

    if (recurrence === 'weekly') {
      return timeDiff || repeatDayOfWeek !== null;
    }

    if (recurrence === 'monthly') {
      return timeDiff || repeatDayOfMonth !== null;
    }

    return timeDiff;
  }, [recurrence, scheduledAt, defaultSchedule, repeatDayOfWeek, repeatDayOfMonth]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((current) => {
      if (current.includes(platformId)) {
        return current.filter((item) => item !== platformId);
      }
      return [...current, platformId];
    });
  };

  const openPicker = (mode: 'date' | 'time') => {
    setShowPicker({ visible: true, mode });
  };

  const handlePickerChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker((state) => ({ ...state, visible: false }));
    }
    if (!date) return;
    setScheduledAt((current) => {
      const next = new Date(current.getTime());
      if (showPicker.mode === 'date') {
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      } else {
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      }
      return next;
    });
  };

  const resetSchedule = () => {
    setScheduledAt(new Date(defaultSchedule.getTime()));
    setRepeatDayOfWeek(null);
    setRepeatDayOfMonth(null);
  };

  const handleRecurrenceChange = (value: string) => {
    setRecurrence(value);
    if (value !== 'weekly') {
      setRepeatDayOfWeek(null);
    }
    if (value !== 'monthly') {
      setRepeatDayOfMonth(null);
    }
    setScheduledAt((current) => {
      const reference = current ?? defaultSchedule;
      if (value === 'none') {
        return new Date(defaultSchedule.getTime());
      }
      const today = new Date();
      today.setHours(reference.getHours(), reference.getMinutes(), 0, 0);
      return today;
    });
  };

  const toggleWeekday = (value: number) => {
    setRepeatDayOfWeek((current) => (current === value ? null : value));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Skeet erstellen</Text>
        <Text style={styles.sectionLabel}>Plattformen</Text>
        <View style={styles.row}>
          {AVAILABLE_PLATFORMS.map((platform) => {
            const isActive = selectedPlatforms.includes(platform.id);
            return (
              <TouchableOpacity
                key={platform.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => togglePlatform(platform.id)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{platform.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.sectionLabel}>Wiederholung</Text>
        <View style={styles.row}>
          {RECURRENCE_OPTIONS.map((option) => {
            const isActive = recurrence === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleRecurrenceChange(option.id)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.sectionLabel}>Terminierung</Text>
        <View style={styles.scheduleRow}>
          {recurrence === 'none' ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => openPicker('date')}>
              <Text style={styles.secondaryButtonText}>{scheduledAt.toLocaleDateString()}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.secondaryButton} onPress={() => openPicker('time')}>
            <Text style={styles.secondaryButtonText}>
              {scheduledAt
                ? scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Uhrzeit wählen'}
            </Text>
          </TouchableOpacity>
          {hasCustomSchedule ? (
            <TouchableOpacity style={styles.resetButton} onPress={resetSchedule}>
              <Text style={styles.resetButtonText}>Zurücksetzen</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {recurrence === 'weekly' ? (
          <View style={styles.row}>
            {WEEKDAY_OPTIONS.map((option) => {
              const isActive = repeatDayOfWeek === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chipSmall, isActive && styles.chipActiveSmall]}
                  onPress={() => toggleWeekday(option.value)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option.label.slice(0, 2)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        {recurrence === 'monthly' ? (
          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>Tag im Monat</Text>
            <TextInput
              style={styles.monthInput}
              keyboardType="number-pad"
              value={repeatDayOfMonth ? String(repeatDayOfMonth) : ''}
              onChangeText={(value) => {
                if (!value) {
                  setRepeatDayOfMonth(null);
                  return;
                }
                const numeric = Number(value);
                if (!Number.isFinite(numeric)) {
                  return;
                }
                const clamped = Math.min(Math.max(Math.round(numeric), 1), 31);
                setRepeatDayOfMonth(clamped);
              }}
              placeholder="1-31"
              maxLength={2}
            />
          </View>
        ) : null}
        <Text style={styles.scheduleSummary}>{scheduleSummary}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Inhalt"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Entwurf speichern</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Vorschau</Text>
        <Text style={styles.previewText}>{preview}</Text>
        <View style={styles.previewMeta}>
          <Text style={styles.previewMetaLabel}>Plattformen:</Text>
          <Text style={styles.previewMetaValue}>
            {AVAILABLE_PLATFORMS.filter((platform) => selectedPlatforms.includes(platform.id))
              .map((platform) => platform.label)
              .join(', ') || 'Keine Auswahl'}
          </Text>
        </View>
        <View style={styles.previewMeta}>
          <Text style={styles.previewMetaLabel}>Planung:</Text>
          <Text style={styles.previewMetaValue}>{scheduleSummary}</Text>
        </View>
      </View>
      {showPicker.visible ? (
        <DateTimePicker
          value={scheduledAt}
          mode={showPicker.mode}
          onChange={handlePickerChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      ) : null}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="create" component={CreateSkeetScreen} options={{ title: 'Unterwegs planen' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#020617',
    gap: 24,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: '#94a3b8',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  chipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  chipSmall: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  chipActiveSmall: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  chipText: {
    color: '#cbd5f5',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#f8fafc',
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  secondaryButtonText: {
    color: '#c7d2fe',
    fontWeight: '500',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#f87171',
    fontWeight: '500',
  },
  scheduleSummary: {
    color: '#e2e8f0',
    fontSize: 13,
    marginBottom: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  monthInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    color: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 72,
    textAlign: 'center',
  },
  previewMeta: {
    marginTop: 12,
    gap: 4,
  },
  previewMetaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  previewMetaValue: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    color: '#e2e8f0',
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f8fafc',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  preview: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 20,
    padding: 20,
  },
  previewLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  previewText: {
    color: '#f1f5f9',
    fontSize: 16,
  },
});
