import { expect, test, type Page } from "@playwright/test";

const area = {
  termId: "00000000-0000-4000-8000-000000000001",
  axis: "topic_group",
  stableId: "stress-overload",
  canonicalPath: "/kompas/oblast/stress-overload",
  publicLabel: "Stres i preopterećenost",
  shortDescription: "Objavljena oblast iz DB registra.",
  parentStableId: null,
  journeyIntent: null,
  sortOrder: 10,
  iconKey: null,
  assetId: null,
  searchTerms: [],
  relatedStableIds: [],
};

const taxonomy = {
  taxonomyVersion: "kompas-taxonomy-v1",
  locale: "sr-Latn",
  terms: [area],
};

const baseQuestion = {
  helpText: "Sva pitanja su opciona.",
  inputMode: "single_select",
  allowedTermIds: [] as string[],
  filterTopicsBySelectedArea: false,
  maxSelections: 1,
  optional: true,
  defaultNextQuestionId: null,
  skipNextQuestionId: null,
  staticOptions: [] as Array<Record<string, unknown>>,
  terminal: null,
};

const flow = {
  flowId: "00000000-0000-4000-8000-000000000010",
  versionId: "00000000-0000-4000-8000-000000000011",
  stableId: "main-kompas",
  version: 1,
  locale: "sr-Latn",
  status: "published",
  lockVersion: 1,
  definition: {
    schemaVersion: 1,
    entryQuestionId: "certainty",
    questions: [
      {
        ...baseQuestion,
        questionId: "certainty",
        prompt: "Da li znate od koje oblasti želite da počnete?",
        selectionTarget: "none",
        optionSource: "static",
        skipNextQuestionId: "area",
        staticOptions: [
          {
            optionId: "choose",
            label: "Želim da izaberem oblast",
            selectionValue: null,
            nextQuestionId: "area",
            terminal: null,
          },
          {
            optionId: "unsure",
            label: "Nisam siguran/na šta mi se događa",
            selectionValue: null,
            nextQuestionId: null,
            terminal: "starting_package",
          },
        ],
      },
      {
        ...baseQuestion,
        questionId: "area",
        prompt: "Od čega želite da počnete?",
        selectionTarget: "topic_group",
        optionSource: "taxonomy_axis",
        taxonomyAxis: "topic_group",
        allowedTermIds: [area.stableId],
        terminal: "results",
      },
    ],
    resultSections: [
      {
        sectionId: "understanding",
        title: "Za bolje razumevanje",
        goalIds: [],
        maxItems: 4,
        emptyBehavior: "show",
        locked: false,
      },
      {
        sectionId: "professional-support",
        title: "Stručna podrška",
        goalIds: [],
        maxItems: 1,
        emptyBehavior: "show",
        locked: true,
      },
    ],
  },
};

function experience(topicGroupId: string | null) {
  const hasSelection = topicGroupId !== null;
  return {
    flowVersion: 1,
    normalizedSelection: {
      topicGroupId,
      topicIds: [],
      audienceId: null,
      goalIds: [],
      journeyIntent: null,
    },
    selectionAdjustments: [],
    summary: {
      title: hasSelection ? "Vaš prilagođeni prikaz" : "Polazni prikaz",
      hasSelection,
    },
    sections: [
      {
        sectionId: "understanding",
        title: "Za bolje razumevanje",
        contentItems: hasSelection
          ? [
              {
                card: {
                  itemKey: "service:individualna-psihoterapija",
                  contentType: "service",
                  slug: "individualna-psihoterapija",
                  locale: "sr-Latn",
                  template: "service_detail",
                  seo: {
                    title: "Kako razumeti preopterećenost",
                    description: "Objavljen CMS sadržaj iz backend rezultata.",
                    ogImageAssetId: null,
                  },
                  contentFormat: "article",
                  accessLevel: "public",
                  publishedAt: "2026-08-03T10:00:00Z",
                },
                reasons: [
                  {
                    code: "topic_group",
                    text: "Povezano sa izabranom oblašću.",
                  },
                ],
                goalIds: [],
              },
            ]
          : [],
        taxonomyItems: [],
        emptyBehavior: "show",
        locked: false,
      },
      {
        sectionId: "professional-support",
        title: "Stručna podrška",
        contentItems: [],
        taxonomyItems: [],
        emptyBehavior: "show",
        locked: true,
      },
    ],
    handoffCandidate: {
      schemaVersion: "1",
      taxonomyVersion: taxonomy.taxonomyVersion,
      topicGroupId,
      topicIds: [],
      audienceIds: [],
      journeyIntent: null,
    },
  };
}

async function mockCompassApi(
  page: Page,
  requests: Array<Record<string, unknown>>,
) {
  await page.route("**/api/compass/flow", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(flow),
    }),
  );
  await page.route("**/api/compass/taxonomy", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(taxonomy),
    }),
  );
  await page.route("**/api/compass/recommendations", async (route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>;
    requests.push(request);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        experience((request.topicGroupId as string | null) ?? null),
      ),
    });
  });
}

async function openCompass(page: Page) {
  await page.goto("/kompas");
  await page
    .getByRole("button", { name: "Ipak odgovorite na pitanja" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("DB option is posted and backend sections and reasons are rendered", async ({
  page,
}) => {
  const requests: Array<Record<string, unknown>> = [];
  await mockCompassApi(page, requests);
  await openCompass(page);

  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Želim da izaberem oblast" })
    .click();
  await dialog.getByRole("button", { name: "Stres i preopterećenost" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Vaš prilagođeni prikaz" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Za bolje razumevanje" }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Povezano sa izabranom oblašću."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Stručna podrška" }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    taxonomyVersion: taxonomy.taxonomyVersion,
    topicGroupId: area.stableId,
    topicIds: [],
  });
});

test("skip and unsure sentinel both request the starting package", async ({
  page,
}) => {
  const requests: Array<Record<string, unknown>> = [];
  await mockCompassApi(page, requests);
  await openCompass(page);
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("button", { name: "Preskoči pitanje" }).click();
  await dialog.getByRole("button", { name: "Preskoči pitanje" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Polazni prikaz" }),
  ).toBeVisible();
  expect(requests.at(-1)).toMatchObject({ topicGroupId: null, topicIds: [] });

  await dialog.getByRole("button", { name: "Poništi izbor" }).click();
  await dialog
    .getByRole("button", { name: "Nisam siguran/na šta mi se događa" })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Polazni prikaz" }),
  ).toBeVisible();
  expect(requests.at(-1)).toMatchObject({ topicGroupId: null, topicIds: [] });
});

test("leaving Kompas never swallows navigation and offers isolated feedback", async ({
  page,
}) => {
  await page.goto("/kompas");
  await page.getByRole("link", { name: "Želim stručnu pomoć" }).first().click();
  const feedback = page.getByRole("dialog");
  await expect(feedback).toContainText("ne utiče na vaše preporuke");
  await feedback.getByRole("button", { name: "Ne sada" }).click();
  await expect(page).toHaveURL(/\/pronadji-podrsku$/);
});
