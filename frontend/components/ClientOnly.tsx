"use client";

import React from 'react';

/**
 * A component that ensures its children are only rendered on the client.
 * Uses class component approach to avoid hook issues during server rendering.
 */
interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  return React.createElement(ClientOnlyImpl, { children, fallback });
}

// Props for the ClientOnlyImpl class component
interface ClientOnlyImplProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

// Using class component to avoid hooks during server rendering
class ClientOnlyImpl extends React.Component<ClientOnlyImplProps, { isMounted: boolean }> {
  state = { isMounted: false };

  componentDidMount() {
    this.setState({ isMounted: true });
  }

  render() {
    const { children, fallback } = this.props;
    const { isMounted } = this.state;
    return isMounted ? children : fallback;
  }
}