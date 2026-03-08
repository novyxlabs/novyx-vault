"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

export default class NovyxErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <AlertTriangle size={28} className="text-amber-400/60 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {this.props.fallbackTitle || "Something went wrong"}
          </p>
          <p className="text-xs text-muted">
            Try closing and reopening this panel. If the issue persists, check your Novyx API key in Settings.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-3 py-1.5 text-xs text-accent border border-accent/20 rounded-md hover:bg-accent/5 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
