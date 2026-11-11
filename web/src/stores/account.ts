import { create } from "zustand";
import { accountAvailable, signedIn, signIn, signOut } from "../native/account";

/** YouTube Music sign-in state, shared by Home (Quick picks) and Settings. */
interface AccountState {
  status: "unknown" | "signedIn" | "signedOut";
  busy: boolean;
  check: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: (forgetGoogle?: boolean) => Promise<void>;
  /** The cookies stopped working (YouTube answered as signed out). */
  expired: () => void;
}

export const useAccount = create<AccountState>((set, get) => ({
  status: "unknown",
  busy: false,
  check: async () => {
    if (!accountAvailable()) return set({ status: "signedOut" });
    set({ status: (await signedIn()) ? "signedIn" : "signedOut" });
  },
  signIn: async () => {
    if (get().busy) return;
    set({ busy: true });
    try {
      set({ status: (await signIn()) ? "signedIn" : get().status });
    } finally {
      set({ busy: false });
    }
  },
  signOut: async (forgetGoogle = false) => {
    set({ busy: true });
    try {
      await signOut(forgetGoogle);
      set({ status: "signedOut" });
    } finally {
      set({ busy: false });
    }
  },
  expired: () => set({ status: "signedOut" }),
}));
