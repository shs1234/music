import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { LogoMark } from "../components/Brand";
import { PageHeader } from "../components/Page";
import { QuickPicks } from "../components/QuickPicks";
import { useT } from "../i18n";
import { paths } from "../lib/routes";
import { useLibrary } from "../stores/library";

export default function Home() {
  const { favorites, playlists, history, status } = useLibrary();
  const navigate = useNavigate();
  const t = useT();
  const empty = status === "ready" && !favorites.length && !playlists.length && !history.length;

  return (
    <div className="pb-8">
      <PageHeader />

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
