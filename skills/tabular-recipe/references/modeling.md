# Modeling a recipe

The renderer can only draw what the model says. The quality of the card comes from the modeling decisions made before writing JSON.

## Mental model

Think of each section as a small process diagram:

```text
ingredient rows
      |
      |  phase 1: action on a set of rows
      |  phase 2: action on another set
      |  phase 3: action on the result
      v
```

Each phase becomes a column. Each set of ingredient rows becomes a span. If a phase acts on the whole section, its span covers every row. If it acts on one ingredient, its span covers that row only.

The reader should be able to:

- read a row left to right and see that ingredient's path through the process;
- read a column top to bottom and see exactly what that action acts on;
- see blanks as "waiting," not as missing data.

## Step-by-step

### 1. Read the whole recipe first

Do not start writing JSON after the ingredient list. Read the method to find:

- which ingredients are prepared separately;
- which ingredients are combined and when;
- which steps are parallel ("meanwhile," "while the rice soaks");
- which steps are setup (preheat, grease, soak skewers);
- whether the dish is layered.

### 2. Split into components

Use one section per component that is made separately:

- **Aloo paratha**: Dough, Filling, Assembly.
- **Vegetable dum biryani**: Rice, Vegetable layer, Assembly.
- **Tandoori chicken**: Marinade, Roast.
- **Chai**: one section.
- **Dal tadka**: either one table with `pressure cook` / `temper` / `pour` columns, or separate Dal, Tadka, and Finish sections. Choose the version that reads more clearly; do not split just to make more tables.

A prepared component becomes an ingredient row in the later section:

```text
1 portion prepared dough
1 portion potato filling
1 tsp ghee
```

### 3. Order the rows

Order by **first use**, not by the source's shopping list.

Example: if the filling uses onions, ginger, and tomatoes before the garnish uses coriander, the coriander row goes after the filling rows, not next to the onions.

If an ingredient is divided, split it:

```text
1/2 cup coriander leaves (for the filling)
1/4 cup coriander leaves (for garnish)
```

Do not write `1 cup coriander leaves, divided` as one row if the two portions enter at different stages. The table would have to lie about one of them.

### 4. Write phases as action + set

Before writing spans, draft the phases in plain text:

```text
Phase 1: boil 5 min.          -> water, ginger, cardamom, cloves, cinnamon
Phase 2: add tea              -> tea
Phase 3: boil 2 min.          -> water, ginger, cardamom, cloves, cinnamon, tea
Phase 4: add milk and sugar   -> milk, sugar
Phase 5: simmer 5 min.        -> all
Phase 6: strain               -> all
```

Then convert row names to indexes:

```json
[
  { "label": "boil 5 min.", "spans": [[0, 5]] },
  { "label": "add tea", "spans": [[5, 1]] },
  { "label": "boil 2 min.", "spans": [[0, 6]] },
  { "label": "add milk and sugar", "spans": [[6, 2]] },
  { "label": "simmer 5 min.", "spans": [[0, 8]] },
  { "label": "strain", "spans": [[0, 8]] }
]
```

This is the safest way to avoid off-by-one spans.

### 5. Put the final action last

If the last phase applies to everything, it should be the last column. This is true even though its row span starts at row 0. The span is a set of ingredients; the column position is the time.

Do not copy a published card's column order blindly if a global action appears before a parallel prep. Reorder it so the table reads chronologically.

### 6. Add setup rows

Use `setup` for steps that are not attached to an ingredient row:

```json
"setup": [
  "Preheat the oven to 220°C (425°F).",
  "Line a baking tray with foil."
]
```

Do not make a one-row action column called `preheat`; that implies preheating an ingredient.

### 7. Add a layer diagram only when it helps

Use `layers` for biryani, lasagna, trifle, parfait, or a layered cake. List top to bottom. The diagram is a visual aid; the assembly table still carries the actions.

## Indian technique patterns

### Tadka / tempering

A tadka is a small, fast preparation of fat + whole spices + aromatics.

- `heat` spans the ghee/oil row.
- `temper` spans the whole spices (cumin, mustard, curry leaves, dried chilli).
- `saute` spans the aromatics (onion, ginger-garlic, green chilli).
- If the tadka is poured over a dal or vegetable, a `pour` or `stir in` action can span both the tadka rows and the target rows, or the whole section.

Keep the tempering ingredients as separate rows when they enter at different moments. If they are ground into a paste first, make `grind` a prep column.

### Bhuna

`bhuna` means sauteing the base until it darkens and the oil separates.

- The `bhuna` span usually covers onion + ginger-garlic + tomatoes (the base), not the vegetables added later.
- The onion may already have its own `saute until golden` column before the ginger-garlic and tomatoes are added.
- Do not stretch `bhuna` over the yogurt or vegetables; those are added after the base is ready.

### Pressure cooking

Labels:

- `pressure cook 3 whistles`
- `pressure cook 15 min.`
- `pressure cook until soft`

Spans:

- The action covers the pot contents: dal/chana/rice, water, turmeric, salt.
- Tempering ingredients added afterward are not in that span.
- If the source says "pressure cook for 3 whistles, then release pressure," either include the release in the same label or add a separate `release pressure` column if it matters.

### Dum

`dum` is a sealed, low-heat finish.

- Use it in the assembly section after `layer`, `drizzle`, and `sprinkle`.
- The span covers all assembled rows.
- Add `rest 10 min.` after `dum` if the source calls for it.
- Do not use `dum` for a regular covered simmer.

### Dough: knead, rest, roll, stuff

- Dough section: `mix` dry ingredients, `add` liquid/fat, `knead`, `rest`.
- Filling section: `boil and mash`, `heat`, `temper`, `saute`, `mix`.
- Assembly section: `stuff`, `roll`, `brush`, `cook`.
- Prepared dough and filling are rows in the assembly table, not hidden assumptions.

### Marinade: whisk, coat, rest

- `whisk` spans the marinade ingredients (yogurt, lemon, ginger-garlic, spices, oil).
- `coat` spans the protein/vegetables and the marinade.
- `marinate 4 hours` or `chill overnight` spans all.
- The roast/grill section uses `marinated chicken` or `marinated paneer` as a row, then `baste`, `roast`, `sprinkle`, `serve`.

### Layered biryani

- **Rice section**: rinse/soak, boil water with spices, add rice, cook until 70% done, drain.
- **Vegetable/chicken layer**: heat, temper, saute, add, bhuna, add vegetables, add yogurt/spices, simmer, stir in herbs.
- **Assembly**: layer rice and filling, drizzle saffron milk/ghee, sprinkle fried onions/herbs, dum, rest.
- **Layer diagram**: top-to-bottom bands. Repeat rice/vegetable bands rather than writing "repeat."

The biryani example has a 9-column vegetable table; it uses landscape print. If a table grows past 9 columns, split the component or use landscape.

### Divided ingredients

Common Indian divisions:

- coriander/mint: some for cooking, some for garnish;
- rice: some for the bottom layer, some for the top;
- yogurt: some for the marinade, some for the gravy;
- ghee: some for tempering, some for drizzling;
- lemon: some for the marinade, some for serving.

Use separate rows with qualifiers. This is more truthful than one row with a full amount.

### "To taste" and "as needed"

Keep these in the ingredient text:

- `salt to taste`
- `water as needed`
- `a pinch of asafoetida (hing)`
- `1-2 green chillies, slit`

Do not invent a number. If the source gives a range, keep the range.

## Worked example: Aloo Paratha

```text
Dough rows
0  2 cups whole wheat flour
1  1/2 tsp salt
2  1 tbsp oil
3  about 3/4 cup water

Dough actions
mix               [0, 2]
add oil and water [2, 2]
knead 8 min.      [0, 4]
rest 15 min.      [0, 4]
```

The oil and water rows are both added to the flour; the `add` column spans both. Kneading and resting apply to the whole dough.

```text
Filling rows
0  3 medium potatoes
1  1 tbsp oil
2  1 tsp cumin seeds
3  1 medium onion
4  2 green chillies
5  1 tsp amchur
6  1/2 tsp salt
7  1/4 cup coriander leaves

Filling actions
boil and mash      [0, 1]
heat               [1, 1]
temper             [2, 1]
saute until soft   [3, 2]
mix                [0, 8]
```

The potatoes are boiled and mashed; the oil is heated; the cumin is tempered; the onion and chillies are sauteed; then everything is mixed. The final `mix` spans all filling rows because all of them end up in the filling.

```text
Assembly rows
0  1 portion prepared dough
1  1 portion potato filling
2  1 tsp ghee

Assembly actions
stuff                 [0, 2]
roll                  [0, 2]
brush                 [0, 3]
cook 2 min. per side  [0, 3]
```

The dough and filling are stuffed and rolled together. Brushing and cooking apply to the assembled paratha, so those spans cover all three rows (dough, filling, ghee).

## Ambiguity

- Make the simplest model that matches the source. Do not invent a step to make the table prettier.
- If the source is vague about when an ingredient is added, place it at the most plausible stage and record the assumption in `notes` and in chat.
- If the source gives an optional ingredient, include it with `(optional)` only if it is part of the process. Otherwise leave it out or note it separately.
- If the source is a CfE recipe card, use it to cross-check your model, but do not copy the site's HTML or CSS.
- If the source is an image or PDF, transcribe the quantities and steps. If a quantity is unreadable, ask.
- If the recipe has two independent components that are served together but never combined (e.g. paratha + raita), use two cards or two clearly separated sections with a `serve with` note.

## Final checklist

- [ ] Rows are in first-use order.
- [ ] Divided ingredients are separate rows.
- [ ] Every section has a clear component name.
- [ ] Every row is touched by at least one action.
- [ ] Every span covers only the rows the action touches.
- [ ] Full-height spans are genuinely whole-section actions.
- [ ] Final combine/bake/dum is the last column.
- [ ] Setup steps are in `setup`.
- [ ] Layer diagram, if any, is top to bottom.
- [ ] Quantities are unchanged; no invented conversions.
- [ ] Labels are short, imperative, and include time/temperature where needed.
- [ ] Source attribution is present.
- [ ] `--check` is clean (or every warning is understood).
