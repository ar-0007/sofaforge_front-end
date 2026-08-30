"use client";

import { useTracking } from "./tracker";

/**
 * The consent gate, shown only when the owner's rule requires an answer and the
 * visitor has not given one. Declining is a first-class button, not a link
 * hidden in small print — that is what makes the consent real.
 */
export default function ConsentBanner() {
  const { consent, consentMode, grantConsent, denyConsent, bannerText, privacyUrl } = useTracking();

  if (consentMode === "off") return null;
  if (consent !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-lg border border-[#ddcfbe] bg-[#fbf8f1] p-4 shadow-[0_18px_60px_-24px_rgba(71,47,29,0.45)] sm:inset-x-6 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-6 text-[#5c5145]">
          {bannerText}{" "}
          {privacyUrl ? (
            <a href={privacyUrl} className="underline underline-offset-2">
              Privacy policy
            </a>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={denyConsent}
            className="rounded-md border border-[#ddcfbe] px-4 py-2 text-[13px] font-medium text-[#5c5145] transition-colors hover:bg-[#f2ebe0]"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={grantConsent}
            className="rounded-md bg-[#25221d] px-4 py-2 text-[13px] font-medium text-[#f8f4ec] transition-opacity hover:opacity-90"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
