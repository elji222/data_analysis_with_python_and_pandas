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
  height: number;
  onMarkerPress: (listIndex: number) => void;
};

const MIN_RAIL_HEIGHT = 120;

export function ChatScrollRail({
  markers,
  activeMarkerId,
  scrollProgress,
  height,
  onMarkerPress,
}: ChatScrollRailProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const markerColor = isDark ? '#5A5A5A' : '#C8C8C8';
  const activeColor = isDark ? ChatTheme.sidebarTextDark : ChatTheme.sidebarText;
  const railHeight = Math.max(MIN_RAIL_HEIGHT, height);
  const thumbTop = Math.max(0, Math.min(railHeight - 28, scrollProgress * (railHeight - 28)));

  return (
    <View style={[styles.container, { height: railHeight }]}>
      <View style={styles.rail}>
        <View style={styles.markerColumn}>
          {markers.map((marker) => {
            const isActive = marker.id === activeMarkerId;
            const markerTop = marker.position * Math.max(railHeight - 10, 1);

            return (
              <Pressable
                key={marker.id}
                style={[styles.markerHitArea, { top: markerTop - 8 }]}
                onPress={() => onMarkerPress(marker.listIndex)}
                accessibilityRole="button"
                accessibilityLabel="Jump to message">
                <View
                  style={[
                    styles.marker,
                    {
                      backgroundColor: isActive ? activeColor : markerColor,
                      width: isActive ? 20 : 14,
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
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as const) : {}),
  },
  rail: {
    width: 28,
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  markerColumn: {
    position: 'absolute',
    left: 0,
    right: 8,
    top: 0,
    bottom: 0,
  },
  markerHitArea: {
    position: 'absolute',
    right: 0,
    height: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
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
    width: 5,
    borderRadius: 3,
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
    borderRadius: 3,
    backgroundColor: '#B8B8B8',
  },
  scrollThumbDark: {
    backgroundColor: '#7A7A7A',
  },
});
