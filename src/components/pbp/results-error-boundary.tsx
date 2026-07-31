import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  error: Error | null;
}

/** Keeps a rendering failure in the results section from blanking the app. */
export class ResultsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Results render failed", error, info);
  }

  handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mt-8 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
        <AlertTriangle className="mx-auto size-6 text-destructive" />
        <p className="mt-3 font-medium text-destructive">
          Something went wrong computing the chain
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{this.state.error.message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={this.handleRetry}>
          <RotateCw className="size-4" /> Retry
        </Button>
      </div>
    );
  }
}
