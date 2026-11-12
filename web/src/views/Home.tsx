import { ArrowClockwiseIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { LogoMark } from "../components/Brand";
import { IconButton } from "../components/IconButton";
import { PageHeader } from "../components/Page";
import { PullToRefresh } from "../components/PullToRefresh";
import { QuickPicks } from "../components/QuickPicks";
import { useT } from "../i18n";
import { paths } from "../lib/routes";
import { accountAvailable } from "../native/account";
import { useAccount } from "../stores/account";
import { useLibrary } from "../stores/library";
import { usePicks } from "../stores/picks";

export default function Home() {
  const { favorites, playlists, history, status } = useLibrary();
  const navigate = useNavigate();
  const t = useT();
  const empty = status === "ready" && !favorites.length && !playlists.length && !history.length;
  // The recommendation shelves are all there is to refresh, and they need the account.
  const canRefresh = useAccount((s) => s.status === "signedIn") && accountAvailable();
  const refreshing = usePicks((s) => s.loading);
  const refresh = () => void usePicks.getState().refresh();

  return (
    <div className="pb-8">
      <PageHeader
        actions={
          canRefresh && (
            <IconButton label="추천곡 새로고침" disabled={refreshing} onClick={refresh} className="disabled:opacity-100">
              <ArrowClockwiseIcon size={22} className={refreshing ? "animate-spin" : undefined} />
            </IconButton>
          )
        }
      />
      {canRefresh && <PullToRefresh onRefresh={refresh} busy={refreshing} />}

      <div className="pt-2 md:pt-8" />

      <QuickPicks />

      {empty && (
        <div className="mx-4 flex flex-col items-start gap-5 rounded-[20px] bg-surface-2 p-6 ring-1 ring-line md:mx-6 md:flex-row md:items-center md:p-8">
          <span className="grid size-16 shrink-0 place-items-center rounded-[18px] bg-accent text-accent-ink">
            <LogoMark className="size-10" />
          </span>
          <div className="flex-1">
            <p className="text-xl font-semibold tracking-tight">{t.home.startTitle}</p>
            <p className="mt-1 max-w-[52ch] text-sm text-fg-2">{t.home.startBody}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(paths.search)}
            className="flex h-12 items-center gap-2 rounded-full bg-accent pr-6 pl-5 font-semibold text-accent-ink transition-transform active:scale-[0.97]"
          >
            <MagnifyingGlassIcon size={20} weight="bold" /> {t.common.searchMusic}
          </button>
        </div>
      )}
    </div>
  );
}
