// Precision Design - UI State management
export enum UIState {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export type LoadingState = "idle" | "loading" | "success" | "error";
