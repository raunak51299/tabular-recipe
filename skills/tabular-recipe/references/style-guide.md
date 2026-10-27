# Style guide

The card is a working document, not a blog post. Keep it factual, compact, and easy to scan.

## Ingredient text

Use the source's wording and quantities. A good row is:

```text
1 large (150 g) onion, finely chopped
2 tsp (4 g) Kashmiri red chilli powder
1/2 cup (120 g) thick yogurt
1 tbsp (15 mL) mustard oil
salt to taste
```

Guidelines:

- **Preserve quantities and units.** Do not convert, scale, or invent weights. If the source says `1 cup`, write `1 cup`; if it says `1 cup (240 mL)`, keep both.
- **Keep preparation inside the row** when it describes the ingredient's state: `finely chopped`, `boiled and mashed`, `cut into 1-in. cubes`, `rinsed and soaked 30 min.` This is not an action column; it is what the ingredient is when it enters.
- **Use ASCII fractions** for searchability: `1-1/2`, `1/2`, `3/4`. Do not mix `1½` and `1-1/2` in one card.
- **Use a hyphen for ranges**: `4-6 servings`, `2-3 minutes`, `1-2 green chillies`.
- **Mark optional ingredients** with `(optional)` at the end.
- **Split divided ingredients** into separate rows with a qualifier in parentheses:
  ```text
  1/2 cup coriander leaves (for the filling)
  1/4 cup coriander leaves (for garnish)
  ```
- **Keep "to taste," "as needed," and "a pinch"** as written. Do not invent a number.
- **Prefer familiar English/Indian English names.** Keep `paneer`, `ghee`, `atta`, `besan`, `hing`, `amchur`; add a short gloss in parentheses on first use if the card is for a general audience: `atta (whole wheat flour)`.
- **Do not rename a dish's ingredients** to a different cuisine's equivalent. Paneer is not "cottage cheese" on the card unless the source itself says so.

## Action labels

Action labels are imperative, sentence case, and have no trailing period.

Good:

```text
boil 5 min.
add tea
simmer 5 min.
strain
pressure cook 3 whistles
bhuna until oil separates
dum 20 min.
knead 8 min.
rest 15 min.
roll into 8-in. discs
cook 2 min. per side
roast 220°C 20 min.
temper
saute until golden
stir in herbs
```

Avoid:

```text
cook
add
mix everything
do the needful
cook it for a while until it looks done
```

Rules:

- **Be specific.** `add tea` is better than `add`; `add yogurt and spices` is better than `add`.
- **Include time, temperature, or equipment when relevant.** `pressure cook 3 whistles`, `roast 220°C 20 min.`, `dum 20 min.`
- **Use an `until` cue for sensory stages.** `bhuna until oil separates`, `saute until golden`, `cook until 70% done`.
- **Keep it short.** Aim for 28 characters or fewer; the validator warns above 36. Long labels make very tall cells.
- **One action per label.** Do not write `chop and saute the onions and add the tomatoes`; that is three phases and should be modeled as such.
- **Use a new column for a repeat that happens later.** Use multiple spans only for a genuine parallel repeat at the same stage.

### Indian technique vocabulary

Use these terms consistently when the source uses them:

| Term | Meaning on the card |
|---|---|
| `temper` | Heat fat with whole spices (tadka). |
| `tadka` | The tempered fat/spice mixture itself; use as a noun in notes, `temper` as the action. |
| `bhuna` | Saute the base until it darkens and oil separates. |
| `dum` | Cook sealed on low heat. |
| `pressure cook 3 whistles` | Pressure-cook until three whistles; preserve the source's count. |
| `slit` | Cut a slit in a chilli or vegetable. |
| `crush` | Crush whole spices or ginger. |
| `grind` | Grind to a paste or powder. |
| `knead` | Knead dough. |
| `rest` | Let dough or a cooked dish stand. |
| `roll` | Roll dough into a disc. |
| `stuff` | Fill dough or a vegetable. |
| `layer` | Place alternating layers in a vessel. |
| `drizzle` | Pour a thin stream of ghee, saffron milk, or syrup. |
| `sprinkle` | Scatter fried onions, herbs, or chaat masala. |
| `baste` | Brush or spoon butter/marinade over a roast. |
| `serve with` | Accompaniment that is not cooked into the dish. |

## Units and spelling

- Use `tbsp`, `tsp`, `cup`, `g`, `kg`, `mL`, `L`, `in.`, `cm`.
- Use `°C` and `°F` as the source does; if the source gives both, keep both.
- Keep `1 cup` as the source defines it. Do not add a metric equivalent unless the source gives one.
- Default to Indian English spellings for Indian recipes: `chilli`, `flavour`, `yogurt` or `curd` (preserve the source's choice), `coriander`.
- Keep proper names and brand names as written.
- Temperatures and times are part of the action label, not the ingredient row.

## Notes and assumptions

Use `notes` for:

- an inferred stage: `Assumed the rice is parboiled before layering.`
- a source caveat: `The source gives a range for the biryani masala; 2 tsp is the lower end.`
- a serving suggestion: `Serve with raita and a lime wedge.`
- a technique clarification: `Dum means a sealed, low-heat finish; use a heavy pot.`

Do not put a long narrative in `notes`. One or two sentences per note.

## Table shape

- A table with **10 or more action columns** is hard to read even on a wide screen. Split the component or set `"print": { "orientation": "landscape" }`.
- A section with more than about 15 ingredient rows is long; consider whether it is really two components.
- Do not add decorative columns (photos, checkboxes, nutrition). The grid is the point.
- Do not repeat the recipe title inside every section heading.

## Source attribution

- If the user provides a source, record it in `source` with `name`, `author`, and `url` when known.
- If the recipe is the user's own, use `source: { "name": "User-provided recipe" }` or omit `source`.
- The examples in this skill are original home-style models, not authoritative versions of the dishes.
- Do not republish a copyrighted recipe's prose or photos. Formatting a recipe for personal use is one thing; publishing it is another.
