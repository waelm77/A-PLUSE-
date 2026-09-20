import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  stack?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-12 text-center"
          dir="rtl"
          style={{ background: "#111522", color: "#f3f6fb" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-3xl">
            !
          </div>
          <h1 className="text-2xl font-black">حدث خطأ غير متوقع</h1>
          <p className="max-w-md text-sm opacity-80">
            برجاء تصوير هذه الشاشة وإرسالها للدعم الفني ليتم إصلاح المشكلة.
          </p>
          <pre
            dir="ltr"
            className="max-h-72 max-w-full overflow-auto rounded-xl border border-dashed border-red-500/40 bg-black/30 p-4 text-left text-xs leading-relaxed"
            style={{ color: "#fca5a5" }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.stack}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: "#7c5cf6", color: "#fff" }}
            className="rounded-xl px-6 py-2.5 font-bold transition-opacity hover:opacity-90"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}