'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Wraps the engagement card feed so a single malformed prompt
 * or a throwing card component can't take down the whole dashboard.
 */
export class EngagementErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[EngagementErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          padding: '64px 24px',
          textAlign: 'center',
          color: '#5A6660',
        }}
      >
        <div style={{ fontSize: '40px' }}>🫥</div>
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: '#1A1F1C',
            fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)',
          }}
        >
          Something went sideways
        </h3>
        <p style={{ margin: 0, fontSize: '14px', maxWidth: '320px' }}>
          We couldn't render your memory prompts. Your data is safe — try
          reloading to pick up where you left off.
        </p>
        <button
          onClick={this.handleReset}
          style={{
            marginTop: '4px',
            padding: '10px 20px',
            borderRadius: '12px',
            background: '#2D5A3D',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
