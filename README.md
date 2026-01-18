# KB Smart Nurse Thinker — Bulk KB Content Pack (v0.3.0)

This pack fixes the **Guidance Finder showing no results** by adding a large curated snippet library and an LTC/SNF **event catalog** that can drive dynamic checklists and natural narrative note rendering.

## What's inside
Copy these files into your app under `public/kb/`:
- `manifest.json` (updated pointers + release note)
- `sources.json` (source registry)
- `source_sections.json` (**200 searchable guidance sections/snippets**)
- `kb_events.json` (**77 LTC/SNF events**; Option 3 broad catalog)
- `kb_facility.json` (starter action library)
- `kb_medical.json` (starter red flags; intentionally facility/protocol-dependent)
- `kb_documentation.json` (narrative template)

> Notes:
> - Snippets are **curated summaries** intended for internal guidance search. Replace/augment with your facility's exact policy text and official agency excerpts as you curate.
> - Events are broad and designed to make the wizard *exploratory* and dynamic.

## Install into your project
1. In your project repo, back up your current folder:
   - Rename `public/kb/` to `public/kb_backup/`
2. Copy all files from this pack's `public/kb/` into your project `public/kb/`.
3. Rebuild your app (this regenerates `search_index.json`):

```bat
npm run build
```

4. Run locally to confirm search results:

```bat
npm run preview
```

## Quick validation
- After build, check the console output. You should see something like:
  - `wrote 200 docs -> public/kb/search_index.json`
- In the app, search for:
  - `abuse`, `fall`, `fever`, `low oxygen`, `pressure injury`, `med error`

## Next improvements (recommended)
- Add **event-driven render sentences** to your progress note modal:
  - Use the `render` fields in `kb_events.json` for natural paragraph generation.
- Curate your highest-priority sources with exact binder location + updated dates.

