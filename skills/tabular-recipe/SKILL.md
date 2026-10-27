---
name: tabular-recipe
description: Convert a recipe from pasted text, a URL, a file, or an image into a Cooking-for-Engineers-style tabular recipe card (ingredients as rows, action columns with rowspans) and render a self-contained, print-ready HTML file. Use for requests like "tabular recipe", "recipe grid", "recipe card", "Cooking For Engineers format", or Indian recipes with tadka, dum, pressure-cook, or biryani layering.
---

# Tabular Recipe

Turn a recipe into a **tabular recipe card**: every ingredient is a row, every action is a column, and an action cell spans exactly the ingredient rows it acts on. The result is a self-contained HTML card that prints cleanly to A4 or Letter and can be saved as PDF from the browser.

This skill separates two jobs:

- **You** do the semantic modeling: read the recipe, decide the components, order the ingredients, and decide which action touches which rows.
- **`scripts/render.mjs`** does the geometry: validates the model, computes rowspans/colspans, and renders the HTML. Never hand-write the table HTML.

Read these before modeling:

- `references/notation.md` - what the table means and the full field reference.
- `references/modeling.md` - how to turn prose into sections, rows, and spans, including Indian technique patterns.
- `references/style-guide.md` - wording, units, and Indian ingredient/technique glossary.

## Workflow

1. **Ingest the source.**
   - Pasted text: use it directly.
   - URL: fetch it. For Cooking For Engineers, the `/recipe/<id>/<slug>/trn` view is the recipe card; use it as a reference, then re-model the recipe in our JSON.
   - Image or PDF: read/transcribe it.
   - Multiple recipes: make one card per recipe.
   - If a page is inaccessible or the recipe is incomplete, ask for the missing text rather than inventing it.

2. **Extract the facts.**
   - Title, yield, source name/URL/author.
   - Ingredients with quantities, units, prep notes, and divided portions.
   - Steps, equipment, oven/grill temperatures, resting/chilling times.
   - Separate components (dough/filling, rice/gravy, marinade/roast, etc.).
   - Whether the dish is genuinely layered (biryani, parfait, lasagna, trifle).

3. **Model each component as a section.**
   - Order ingredient rows by **first use**, not by the source's shopping list.
   - Split a divided ingredient into separate rows with qualifiers, e.g. `1/2 cup coriander leaves (for the filling)` and `1/4 cup coriander leaves (for garnish)`.
   - Give every action a contiguous span. If an action applies to a subset, span only that subset. If it applies to the whole pot, span all rows in the section.
   - Put preheat/grease/soak-skewers steps in `setup`, not in an action column.
   - Put parallel prep branches in separate columns. Put the final combine, bake, dum, or chill **last**.
   - Add a `layers` block only when the dish is assembled in visible layers. List layers **top to bottom**.

4. **Write the JSON** to `./recipes/<slug>.json` (create the directory if needed). Use the schema below.

5. **Validate.**
   ```powershell
   node <skill-dir>\scripts\render.mjs .\recipes\<slug>.json --check
   ```
   `<skill-dir>` is the directory containing this `SKILL.md` (shown when the skill loads). Fix every `[error]`. Treat `[warn]` as a prompt to check the model; a warning is acceptable only when the model is intentional.

6. **Render.**
   ```powershell
   node <skill-dir>\scripts\render.mjs .\recipes\<slug>.json --out .\recipes\<slug>.html
   ```
   Open the HTML and inspect it. If the table has 10 or more action columns, set `"print": { "orientation": "landscape" }` or split the component into smaller sections.

7. **Deliver.**
   - Give the paths to the JSON and HTML.
   - Summarize the sections and the main phases in 2-4 chat bullets.
   - Flag any assumptions (`notes` in the JSON and in chat).
   - Mention the print button / Save as PDF.
   - Do not paste the entire table into chat; the HTML is the artifact.

If the output file already exists and was not created in this session, check with the user before overwriting it.

## Schema

```json
{
  "schema_version": 1,
  "title": "Masala Chai",
  "yield": "2 cups",
  "lang": "en",
  "source": { "name": "Original home-style example" },
  "print": { "orientation": "portrait" },
  "sections": [
    {
      "name": "Chai",
      "setup": [],
      "rows": [
        "2 cups (480 mL) water",
        "1 in. (2.5 cm) ginger, crushed",
        "4 green cardamom pods, crushed",
        "2 cloves",
        "1 small cinnamon stick",
        "2 tsp (4 g) loose black tea",
        "1 cup (240 mL) whole milk",
        "2 tsp (8 g) sugar, or to taste"
      ],
      "actions": [
        { "label": "boil 5 min.", "spans": [[0, 5]] },
        { "label": "add tea", "spans": [[5, 1]] },
        { "label": "boil 2 min.", "spans": [[0, 6]] },
        { "label": "add milk and sugar", "spans": [[6, 2]] },
        { "label": "simmer 5 min.", "spans": [[0, 8]] },
        { "label": "strain", "spans": [[0, 8]] }
      ]
    }
  ],
  "layers": null,
  "notes": ["Adjust the sugar and tea strength to taste."]
}
```

### Field notes

- `title` (required): card title.
- `yield`: string, e.g. `"4-6 servings"` or `"6 parathas"`.
- `lang`: optional language code for the HTML `lang` attribute; default `en`.
- `source`: string or `{ name, author, url }`. Use the actual source when the user provides one. `url` must be `http://` or `https://`.
- `print.orientation`: `"portrait"` (default) or `"landscape"`.
- `sections` (required): one or more components. Each section becomes its own table.
  - `name`: section heading. Required when there is more than one section.
  - `setup`: strings for full-width rows above the ingredient grid (preheat, grease pan, soak skewers).
  - `rows`: ingredient strings, ordered by first use.
  - `actions`: columns, in left-to-right process order. Each action is `{ "label": "...", "spans": [[startRow, rowCount], ...] }`.
    - `spans` are zero-based row ranges. A single span is normal; multiple spans are allowed for a genuine repeat.
    - No overlaps within an action; adjacent spans should be merged.
- `layers`: optional `{ title, items: [{ label, color }] }`. List top to bottom. `color` is an optional hex color. Use only for genuinely layered dishes.
- `notes`: optional strings for assumptions, sourcing caveats, or serving advice. They render below the card.

## Quality bar

- **Every ingredient row is touched by at least one action.** A row with no action is usually a modeling mistake.
- **Every span is exact.** Do not stretch an action over an ingredient it does not touch.
- **Columns are chronological.** Parallel prep may use adjacent columns, but the final combine/bake/dum must be last. This is stricter than some CfE cards, whose global final action can appear ambiguous.
- **Sections are components, not arbitrary chunks.** Dough/filling/assembly; rice/vegetable layer/assembly; marinade/roast.
- **Divided ingredients become separate rows** with clear qualifiers.
- **Setup steps are `setup` rows**, not action columns.
- **Quantities are preserved exactly as written.** Never invent weight/metric conversions or scale the recipe. If the source gives both volume and weight, keep both.
- **Labels are imperative and concise.** Include time, temperature, or equipment when relevant: `pressure cook 3 whistles`, `bhuna until oil separates`, `dum 20 min.`, `knead 8 min.`, `roast 220°C 20 min.`. Aim for 28 characters or fewer; the validator warns above 36.
- **Cite the source.** Do not claim someone else's recipe as original. Recipe text remains the property of its source.
- **No invented steps.** If the source is vague, use its wording plus `until ...` or `as needed`, and note the assumption.

## Indian technique notes

Use the source's spelling and terminology, defaulting to Indian English when the source is ambiguous.

- **Tadka / tempering**: `heat` the fat, `temper` the whole spices, then `saute` the aromatics. These are usually separate narrow columns.
- **Bhuna**: saute the base until it darkens and the oil separates. One column can span onion + ginger-garlic + tomatoes.
- **Pressure cook**: `pressure cook 3 whistles` or `pressure cook 15 min.`. The span covers the pot contents, not the tempering ingredients added later.
- **Dum**: sealed low-heat finish. In an assembly section, `dum 20 min.` spans all assembled rows.
- **Knead / rest / roll / stuff**: dough is its own section; assembly uses `prepared dough` and `filling` as rows.
- **Marinate**: `whisk` the marinade, `coat` the protein/vegetables, then `marinate 4 hours` or `chill overnight`.
- **Layered biryani**: rice section, vegetable/chicken layer section, assembly section, and a top-to-bottom layer diagram. Repeat the layer pattern in the diagram; the assembly table only needs one `layer` action spanning rice + filling.
- **Divided herbs/rice**: keep cooking herbs and garnish herbs as separate rows when they enter at different stages.

## Common mistakes

- One column per sentence, producing a 20-column table. Group phases; split components.
- Keeping the source's ingredient order when the process uses a different order.
- Putting the final combine in an early column because it spans all rows.
- Spanning an action across a row that is merely waiting.
- Putting preheat/grease in an action column.
- Duplicating an ingredient row without saying which portion it is.
- Inventing a weight conversion, a cooking time, or a step the source does not support.
- Hand-editing the generated HTML. Edit the JSON and re-render.

## Attribution

The tabular format is inspired by the **Tabular Recipe Notation** popularized by Michael Chu at [Cooking For Engineers](https://www.cookingforengineers.com/). This skill is not affiliated with or endorsed by Cooking For Engineers. The CSS is original; no site assets are copied. Recipe content remains the property of its source.
