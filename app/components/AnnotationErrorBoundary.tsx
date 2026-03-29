import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Alert, AlertTitle, AlertDescription } from '~/components/ui/alert';

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
        <Alert>
          <AlertTitle>Comments temporarily unavailable</AlertTitle>
          <AlertDescription>
            The document still rendered, but the annotation layer hit an error. Refresh to try again.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
