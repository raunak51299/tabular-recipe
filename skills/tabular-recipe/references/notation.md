# Notation

The tabular recipe format turns a process into a grid.

- **Rows** are ingredients, ordered by when they first enter the process.
- **Columns** are action phases, read left to right.
- **A span** is the contiguous block of ingredient rows that an action acts on.
- **A blank** means the ingredient waits through that phase. The renderer merges adjacent blanks into one empty cell.
- **A setup row** is a full-width step above the grid (preheat, grease, soak skewers).
- **A section** is a component made separately (dough, filling, rice, gravy, assembly).

The grid is not a strict timeline. The rowspan says *which ingredients* an action touches; the column order says *when* the action happens relative to the other phases. Both matter.

## Anatomy

```text
                   action A       action B       action C
ingredient 1       spans rows 1-2
ingredient 2                      spans rows 2-4
ingredient 3
ingredient 4                                     spans rows 1-4
```

Reading by column: action A applies to ingredients 1-2; action B applies to 2-4; action C applies to all four ingredients.

Reading by row: ingredient 1 is acted on by A, waits through B, then is acted on by C. Ingredient 3 waits through A and B, then joins C.

## Worked grid: Masala Chai

The model:

- rows 0-4: water, ginger, cardamom, cloves, cinnamon
- rows 5: tea
- rows 6-7: milk, sugar
- actions: boil 5 min. (0-4), add tea (5), boil 2 min. (0-5), add milk and sugar (6-7), simmer 5 min. (all), strain (all)

| Ingredient | boil 5 min. | add tea | boil 2 min. | add milk and sugar | simmer 5 min. | strain |
|---|---|---|---|---|---|---|
| water | yes |  | yes |  | yes | yes |
| ginger | yes |  | yes |  | yes | yes |
| cardamom | yes |  | yes |  | yes | yes |
| cloves | yes |  | yes |  | yes | yes |
| cinnamon | yes |  | yes |  | yes | yes |
| tea |  | yes | yes |  | yes | yes |
| milk |  |  |  | yes | yes | yes |
| sugar |  |  |  | yes | yes | yes |

The `add tea` column has blanks above it: those ingredients are already in the pot. The `add milk and sugar` column has blanks above it for the same reason. The final two columns span all rows because the whole pot is simmered and strained.

## Ordering rules

1. **Order rows by first use.** The source's ingredient list is often a shopping list, not a process order. If the sauce uses onions before the garnish uses coriander, the onion row comes first.
2. **Order columns by process stage.** Prep actions can be parallel, but a final combine, bake, dum, or chill goes in the last relevant column.
3. **Do not put a global final action before a parallel prep.** Some published CfE cards have an ambiguity here: a final action that spans all rows can appear before a parallel prep column. Our rule is to put the final action last so the table reads correctly left to right.
4. **A span must be contiguous.** If an action applies to two separated groups at the same stage, use multiple spans in one action. If the action genuinely happens again later, use a new column with the same or a more specific label.
5. **Prefer exact spans over full-height spans.** A full-height span is correct only when the action applies to the whole section. A row that is waiting should have a blank cell.

## Setup rows

Use `setup` for steps that are not attached to a single ingredient row:

- `Preheat the oven to 220°C (425°F).`
- `Line a baking tray with foil.`
- `Grease a 9-in. pan.`
- `Soak wooden skewers for 30 min.`

Setup rows render above the grid and span all action columns. They are not action columns, because they do not act on a subset of ingredient rows.

## Sections

Use one section per component that is made separately:

- Aloo paratha: **Dough**, **Filling**, **Assembly**.
- Vegetable dum biryani: **Rice**, **Vegetable layer**, **Assembly**.
- Tandoori chicken: **Marinade**, **Roast**.
- Chai: one section, **Chai**.

A component used later becomes an ingredient row in the assembly section:

```text
1 portion prepared dough
1 portion potato filling
1 tsp ghee
```

The assembly actions then span those rows normally. This is how the table shows that a component is a real ingredient, not a hidden assumption.

## Layer diagrams

Use `layers` only when the dish is genuinely assembled in visible layers: biryani, lasagna, trifle, parfait, layered cake.

- List layers **top to bottom**, matching the order in the vessel.
- Every layer needs a label. Color is optional; use a hex color if you want the swatch filled.
- The diagram is a reading aid. It does not replace the assembly table; the table still records the `layer`, `drizzle`, `sprinkle`, `dum`, or `assemble` actions.
- Repeat the pattern in the diagram (rice, vegetables, rice, vegetables, rice) rather than writing "repeat."

## Field reference

### Top level

| Field | Required | Notes |
|---|---|---|
| `schema_version` | no | Use `1`. |
| `title` | yes | Card title. |
| `yield` | no | String, e.g. `"4-6 servings"`. |
| `lang` | no | HTML language code; default `en`. |
| `source` | no | String or `{ name, author, url }`; URL must be http(s). |
| `print` | no | `{ "orientation": "portrait" \| "landscape" }`. |
| `sections` | yes | Non-empty array of components. |
| `layers` | no | `{ title, items: [{ label, color }] }`, top to bottom. |
| `notes` | no | Array of strings rendered below the card. |

### Section

| Field | Required | Notes |
|---|---|---|
| `name` | when multiple sections | Section heading. A single-section card may omit it. |
| `setup` | no | Array of full-width setup strings. |
| `rows` | yes | Non-empty array of ingredient strings. Zero-based indexes in actions refer to this array. |
| `actions` | yes | Non-empty array of action columns, left to right. |

### Action

| Field | Required | Notes |
|---|---|---|
| `label` | yes | Imperative, concise; include time/temperature/equipment when relevant. |
| `spans` | yes | Array of `[startRow, rowCount]` pairs. `startRow` is zero-based; `rowCount >= 1`. |

Rules:

- `startRow + rowCount <= rows.length`.
- Spans within one action must not overlap. Adjacent spans are allowed but should be merged.
- Every row should be touched by at least one action. The validator warns if not.
- More than 9 action columns triggers a width warning; use landscape print or split the section.

### Layer item

| Field | Required | Notes |
|---|---|---|
| `label` | yes | Layer name. |
| `color` | no | Hex color: `#rgb`, `#rrggbb`, or `#rrggbbaa`. |

## What the renderer guarantees

- The ingredient column is a row header (`th scope="row"`).
- Each action cell is emitted once, with the correct `rowspan`.
- Adjacent blank cells are merged into one `colspan` cell.
- The grid is checked row by row; a geometry error stops the render.
- The HTML is self-contained: inline CSS, no external fonts, images, or scripts. A print button uses the browser's print dialog.
- The print page size follows `print.orientation`; all other examples default to portrait.
