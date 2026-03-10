"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onClose?: () => void;
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
      const fallbackContent = (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <AlertTriangle size={28} className="text-amber-400/60 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {this.props.fallbackTitle || "Something went wrong"}
          </p>
          <p className="text-xs text-muted">
            The Novyx API may be temporarily unavailable. Check your API key in Settings.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1.5 text-xs text-accent border border-accent/20 rounded-md hover:bg-accent/5 transition-colors"
            >
              Try again
            </button>
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                className="px-3 py-1.5 text-xs text-muted border border-sidebar-border rounded-md hover:text-foreground hover:bg-muted-bg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      );

      // When onClose is provided, render as a dismissible modal
      if (this.props.onClose) {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={this.props.onClose}>
            <div className="fixed inset-0 bg-black/60" />
            <div
              className="relative w-full max-w-md mx-4 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
                <h2 className="text-lg font-semibold">{this.props.fallbackTitle || "Error"}</h2>
                <button onClick={this.props.onClose} className="p-1 rounded text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              {fallbackContent}
            </div>
          </div>
        );
      }

      return fallbackContent;
    }
    return this.props.children;
  }
}
