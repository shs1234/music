import { SignInIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useEffect } from "react";
import { accountAvailable } from "../native/account";
import { useAccount } from "../stores/account";

/** Settings → YouTube Music account: sign in, sign out (keeping the Google session), or forget the Google account. */
export function AccountSection() {
  const { status, busy, check, signIn, signOut } = useAccount();

  useEffect(() => {
    if (status === "unknown") void check();
  }, [status, check]);

  if (!accountAvailable()) return null;
  const pill = "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-transform active:scale-[0.97] disabled:opacity-60";

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-fg-3">계정</h3>
      <div className="flex flex-col gap-3 rounded-[14px] bg-surface-1 p-3 ring-1 ring-line">
        <div className="flex items-center gap-3">
          <UserCircleIcon size={28} className={status === "signedIn" ? "text-accent-text" : "text-fg-3"} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">YouTube Music</p>
            <p className="text-xs text-fg-2">{status === "signedIn" ? "로그인됨" : status === "signedOut" ? "로그인 안 됨" : "확인 중"}</p>
          </div>
          {status === "signedIn" ? (
            <button type="button" disabled={busy} onClick={() => void signOut()} className={`${pill} bg-surface-3 text-fg`}>
              <SignOutIcon size={16} weight="bold" /> 로그아웃
            </button>
          ) : (
            <button type="button" disabled={busy || status === "unknown"} onClick={() => void signIn()} className={`${pill} bg-accent text-accent-ink`}>
              <SignInIcon size={16} weight="bold" /> 로그인
            </button>
          )}
        </div>
        <p className="text-xs text-fg-3">
          로그아웃해도 Google 계정 로그인은 남아 있어서, 다시 로그인할 때 비밀번호 없이 바로 들어와요.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut(true)}
          className="self-start text-xs text-fg-2 underline underline-offset-2 disabled:opacity-60"
        >
          Google 계정까지 로그아웃 (다른 계정으로 바꿀 때)
        </button>
      </div>
    </section>
  );
}
