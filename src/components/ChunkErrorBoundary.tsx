/**
 * @fileOverview Chunk Error Boundary Component
 *
 * A specialized React Error Boundary designed to handle ChunkLoadError and
 * other dynamic import failures gracefully. This component provides:
 * - Automatic error detection for chunk loading failures
 * - User-friendly error UI with recovery options
 * - Automatic retry mechanisms with exponential backoff
 * - Development vs production error handling strategies
 *
 * Use this component to wrap dynamic imports and components that may
 * fail to load due to network issues or webpack chunk problems.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  maxRetries?: number;
  enableAutoRetry?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Chunk Error Boundary Component
 *
 * Catches and handles chunk loading errors, providing graceful fallbacks
 * and recovery options for users when dynamic imports fail.
 */
class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ChunkErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  /**
   * Static method called when an error occurs during rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ChunkErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error has been caught
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Check if this is a chunk loading error
    if (this.isChunkLoadError(error)) {
      console.warn('Chunk loading error detected:', error.message);

      // Attempt automatic retry if enabled
      if (this.props.enableAutoRetry && this.state.retryCount < (this.props.maxRetries || 3)) {
        this.scheduleRetry();
      }
    }
  }

  /**
   * Cleanup timeout on unmount
   */
  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Check if the error is related to chunk loading
   */
  private isChunkLoadError(error: Error): boolean {
    const chunkErrorPatterns = [
      /ChunkLoadError/i,
      /Loading chunk \d+ failed/i,
      /Failed to fetch dynamically imported module/i,
      /Loading CSS chunk/i,
    ];

    return chunkErrorPatterns.some(pattern => pattern.test(error.message || error.name));
  }

  /**
   * Schedule an automatic retry with exponential backoff
   */
  private scheduleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000); // Max 5s delay

    this.setState({ isRetrying: true });

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  /**
   * Manual retry handler
   */
  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount < maxRetries) {
      console.log(`Retrying chunk load (attempt ${this.state.retryCount + 1}/${maxRetries})`);

      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    } else {
      this.setState({ isRetrying: false });
    }
  };

  /**
   * Force page reload as last resort
   */
  private handlePageReload = () => {
    window.location.reload();
  };

  /**
   * Navigate to home page
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Render error UI
   */
  private renderErrorUI() {
    const { error, retryCount, isRetrying } = this.state;
    const { maxRetries = 3 } = this.props;
    const isChunkError = error ? this.isChunkLoadError(error) : false;
    const canRetry = retryCount < maxRetries;

    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Alert variant={isChunkError ? "default" : "destructive"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {isChunkError ? 'Loading Error' : 'Application Error'}
            </AlertTitle>
            <AlertDescription>
              {isChunkError
                ? 'Some application resources failed to load. This is usually a temporary issue.'
                : 'An unexpected error occurred while loading this component.'}
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === 'development' && error && (
            <Alert variant="default">
              <AlertTitle>Error Details (Development)</AlertTitle>
              <AlertDescription className="font-mono text-xs">
                {error.name}: {error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button
                onClick={this.handleRetry}
                disabled={isRetrying}
                variant="default"
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying... (Attempt {retryCount + 1}/{maxRetries})
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({retryCount}/{maxRetries})
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={this.handlePageReload}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>

            <Button
              onClick={this.handleGoHome}
              variant="ghost"
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Button>
          </div>

          {retryCount > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Previous attempts: {retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise render default error UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;