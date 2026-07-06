import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type AppErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App screen crashed:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            {this.props.title ?? 'Something went wrong'}
          </ThemedText>
          <ThemedText style={styles.message}>
            {this.state.error.message || 'The app hit an unexpected error.'}
          </ThemedText>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <ThemedText style={styles.buttonLabel}>Try again</ThemedText>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
  },
  message: {
    textAlign: 'center',
    opacity: 0.75,
    maxWidth: 360,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#7B61FF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
