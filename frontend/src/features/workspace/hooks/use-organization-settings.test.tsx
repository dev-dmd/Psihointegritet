import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/workspace/settings",
  refresh: vi.fn(),
  replace: vi.fn(),
  updateOrganizationLocales: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
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
    mocks.replace.mockReset();
    mocks.updateOrganizationLocales.mockReset();
  });

  it("navigates en → sr-Latn → en after saving without a manual refresh", async () => {
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

    expect(mocks.replace).toHaveBeenLastCalledWith(
      "/radni-prostor/podesavanja",
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
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

    expect(mocks.replace).toHaveBeenLastCalledWith("/workspace/settings");
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(2);
    expect(onFailed).not.toHaveBeenCalled();
  });
});
