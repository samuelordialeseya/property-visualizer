"use client";
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 p-6 text-center font-sans">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-zinc-200">
            <h2 className="text-[18px] font-bold text-zinc-900 font-['Sora']">Something went wrong</h2>
            <p className="mt-2 text-[13px] text-zinc-500 font-['Manrope']">
              {this.state.error?.message || "An unexpected error occurred while rendering."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-5 w-full rounded-xl bg-[#0b3860] py-2.5 text-[13px] font-bold text-white shadow-md hover:bg-[#051b30] transition cursor-pointer font-['Manrope']"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
