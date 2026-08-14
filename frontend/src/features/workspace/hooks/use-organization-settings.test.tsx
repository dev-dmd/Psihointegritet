import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/workspace/settings",
  refresh: vi.fn(),
  updateOrganizationLocales: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("../organization-api", () => ({
  fetchOrganizationSettings: vi.fn(),
  updateOrganizationLocales: mocks.updateOrganizationLocales,
}));

import { useOrganizationLocalesMutation } from "./use-organization-settings";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

describe("organization locale switching", () => {
  beforeEach(() => {
    mocks.pathname = "/workspace/settings";
    mocks.refresh.mockReset();
    mocks.updateOrganizationLocales.mockReset();
    window.history.replaceState(null, "", "/workspace/settings");
  });

  it("switches en → sr-Latn → en with history replacement and one server refresh", async () => {
    const onSaved = vi.fn();
    const onFailed = vi.fn();
    mocks.updateOrganizationLocales.mockResolvedValueOnce({
      id: "organization-1",
      slug: "psihointegritet",
      displayName: "Psihointegritet",
      uiLocale: "sr-Latn",
      defaultContentLocale: "en",
    });

    const english = renderHook(
      () => useOrganizationLocalesMutation({ onSaved, onFailed }),
      { wrapper },
    );
    await act(() =>
      english.result.current.mutateAsync({
        uiLocale: "sr-Latn",
        defaultContentLocale: "en",
      }),
    );

    expect(window.location.pathname).toBe("/radni-prostor/podesavanja");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    english.unmount();

    mocks.pathname = "/radni-prostor/podesavanja";
    mocks.updateOrganizationLocales.mockResolvedValueOnce({
      id: "organization-1",
      slug: "psihointegritet",
      displayName: "Psihointegritet",
      uiLocale: "en",
      defaultContentLocale: "en",
    });
    const serbian = renderHook(
      () => useOrganizationLocalesMutation({ onSaved, onFailed }),
      { wrapper },
    );
    await act(() =>
      serbian.result.current.mutateAsync({
        uiLocale: "en",
        defaultContentLocale: "en",
      }),
    );

    expect(window.location.pathname).toBe("/workspace/settings");
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledTimes(2);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("preserves the query string and hash while localizing the pathname", async () => {
    window.history.replaceState(
      { workspace: true },
      "",
      "/workspace/settings?tab=language&from=profile#locale",
    );
    mocks.updateOrganizationLocales.mockResolvedValueOnce({
      id: "organization-1",
      slug: "psihointegritet",
      displayName: "Psihointegritet",
      uiLocale: "sr-Latn",
      defaultContentLocale: "sr-Latn",
    });

    const hook = renderHook(
      () =>
        useOrganizationLocalesMutation({
          onSaved: vi.fn(),
          onFailed: vi.fn(),
        }),
      { wrapper },
    );
    await act(() =>
      hook.result.current.mutateAsync({
        uiLocale: "sr-Latn",
        defaultContentLocale: "sr-Latn",
      }),
    );

    expect(window.location.pathname).toBe("/radni-prostor/podesavanja");
    expect(window.location.search).toBe("?tab=language&from=profile");
    expect(window.location.hash).toBe("#locale");
    expect(window.history.state).toEqual({ workspace: true });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes exactly once when the localized pathname is already current", async () => {
    mocks.updateOrganizationLocales.mockResolvedValueOnce({
      id: "organization-1",
      slug: "psihointegritet",
      displayName: "Psihointegritet",
      uiLocale: "en",
      defaultContentLocale: "en",
    });
    const replaceState = vi.spyOn(window.history, "replaceState");
    const hook = renderHook(
      () =>
        useOrganizationLocalesMutation({
          onSaved: vi.fn(),
          onFailed: vi.fn(),
        }),
      { wrapper },
    );

    await act(() =>
      hook.result.current.mutateAsync({
        uiLocale: "en",
        defaultContentLocale: "en",
      }),
    );

    expect(replaceState).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    replaceState.mockRestore();
  });
});
