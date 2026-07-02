"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in dashboard component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[250px] p-6 border border-dashed border-red-200 dark:border-red-900/50 rounded-2xl bg-red-50/30 dark:bg-red-950/10 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-8 h-8 mb-2 text-red-500 dark:text-red-400" />
            <h3 className="font-semibold text-sm">Visualization Error</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center max-w-[250px]">
              Something went wrong while rendering this analytics component.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
