'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  retryCount: number;
}

/**
 * Error boundary specifically for the onboarding flow.
 * Catches React error #310 (hooks mismatch during render) which can happen
 * transiently with React 19 + Next.js 15+ during navigation.
 * 
 * Auto-retries up to 3 times before showing fallback.
 */
export class OnboardingErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if it's the hooks error
    const isHooksError = error.message?.includes('310') || 
                         error.message?.includes('more hooks') ||
                         error.message?.includes('Rendered more hooks');
    
    if (isHooksError) {
      return { hasError: true };
    }
    
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('OnboardingErrorBoundary caught error:', error.message);
    console.warn('This is often a transient React 19 issue, auto-retrying...');
  }

  componentDidUpdate(_: Props, prevState: State) {
    // Auto-retry after a short delay
    if (this.state.hasError && !prevState.hasError && this.state.retryCount < 3) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          retryCount: prev.retryCount + 1
        }));
      }, 100);
    }
  }

  render() {
    if (this.state.hasError && this.state.retryCount >= 3) {
      // After 3 retries, show fallback or default error UI
      return this.props.fallback || (
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl max-w-md text-center">
            <h2 className="text-xl font-semibold text-[#2d2d2d] mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We encountered an issue loading the onboarding flow.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#355a48] transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      // Show nothing while retrying (will auto-retry in componentDidUpdate)
      return null;
    }

    return this.props.children;
  }
}
