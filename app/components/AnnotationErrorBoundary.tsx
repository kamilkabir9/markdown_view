import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Alert } from '@heroui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AnnotationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Annotation error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>Comments temporarily unavailable</Alert.Title>
            <Alert.Description>
              The document still rendered, but the annotation layer hit an error. Refresh to try again.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      );
    }

    return this.props.children;
  }
}
