import { useColorScheme } from 'react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ChatTheme } from '@/constants/chat-theme';

export type ChatScrollMarker = {
  id: string;
  listIndex: number;
  position: number;
};

type ChatScrollRailProps = {
  markers: ChatScrollMarker[];
  activeMarkerId: string | null;
  scrollProgress: number;
  onMarkerPress: (listIndex: number) => void;
};

const RAIL_HEIGHT = 220;

export function ChatScrollRail({
  markers,
  activeMarkerId,
  scrollProgress,
  onMarkerPress,
}: ChatScrollRailProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const markerColor = isDark ? '#5A5A5A' : '#C8C8C8';
  const activeColor = isDark ? ChatTheme.sidebarTextDark : ChatTheme.sidebarText;
  const thumbTop = Math.max(0, Math.min(RAIL_HEIGHT - 28, scrollProgress * (RAIL_HEIGHT - 28)));

  return (
    <View style={styles.container}>
      <View style={[styles.rail, { height: RAIL_HEIGHT }]}>
        <View style={styles.markerColumn}>
          {markers.map((marker) => {
            const isActive = marker.id === activeMarkerId;
            const markerTop = marker.position * (RAIL_HEIGHT - 10);

            return (
              <Pressable
                key={marker.id}
                style={[
                  styles.markerHitArea,
                  { top: markerTop - 8 },
                ]}
                onPress={() => onMarkerPress(marker.listIndex)}
                accessibilityRole="button"
                accessibilityLabel="Jump to message">
                <View
                  style={[
                    styles.marker,
                    {
                      backgroundColor: isActive ? activeColor : markerColor,
                      width: isActive ? 18 : 12,
                      opacity: isActive ? 1 : 0.85,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.scrollTrack, isDark && styles.scrollTrackDark]}>
          <View style={[styles.scrollThumb, { top: thumbTop }, isDark && styles.scrollThumbDark]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as const) : {}),
  },
  rail: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  markerColumn: {
    position: 'absolute',
    left: 0,
    right: 10,
    top: 0,
    bottom: 0,
  },
  markerHitArea: {
    position: 'absolute',
    left: 0,
    height: 16,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {}),
  },
  marker: {
    height: 2,
    borderRadius: 1,
  },
  scrollTrack: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
    backgroundColor: '#ECECEC',
  },
  scrollTrackDark: {
    backgroundColor: '#3A3A3A',
  },
  scrollThumb: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#B8B8B8',
  },
  scrollThumbDark: {
    backgroundColor: '#7A7A7A',
  },
});
