# Nationality Analysis (updated 2025-07-04)

This document compares the GOV.UK nationality list (`govuk_nationalities_list.md`) with the HESA *ValidEntries* extract (`HESA ValidEntries_24053_NATION_2025741250.csv`).  
Files analysed on **2025-07-04**.

---

## 1. Source snapshots

### GOV.UK list
* Total items: **197** (including the header comment).  
* Format: simple bullet list, one *adjectival* nationality per line.  
* Example rows: `Afghan`, `Brazilian`, `Zimbabwean`.

### HESA – NATION extract (2024/25 full list*)
| Code | Label |
|------|-----------------------------|
| AF | Afghanistan |
| AL | Albania |
| DZ | Algeria |
| AS | American Samoa |
| AD | Andorra |

*(excerpt – file contains many more rows)*

* Total distinct rows (excluding header): **230**  
* Format: tab-separated values with columns `Code` and `Label` (first row is header `Code\tLabel`).

---

## 2. Quick statistics
| Metric | GOV.UK | HESA |
|--------|--------|------|
| Distinct entries | 197 | 230 |
| Direct text matches | 0 | (n/a) |
| Approx. semantic overlaps (see §3) | ~190 | ~190 |

> *Note*: Direct matches are case- and punctuation-sensitive; therefore none of the HESA labels match the adjectival forms in the GOV.UK list exactly.

---

## 3. Potential semantic overlaps
The following rows likely refer to the same underlying nationality/country but use different naming conventions:

| GOV.UK entry | HESA label | Notes |
|--------------|------------|-------|
| British | United Kingdom | Adjectival vs sovereign-state name. |
| Serbian | Serbia and Montenegro (n.o.s.) | Historical state (1992-2006). Might map to `Serbian`. |
| Slovak / Czech | Czechoslovakia (n.o.s.) | Historical state (dissolved 1993). |
| Russian | Union of Soviet Socialist Republics (n.o.s.) | Historic multi-state entity. |
| – | Stateless | No direct equivalent; GOV.UK list only covers nationalities, not status. |

---

## 4. Items missing from each list

### Present in GOV.UK but not referenced by HESA extract
Because the HESA slice only contains *historic / special* codes, essentially **all 197 GOV.UK items** are absent from this particular HESA excerpt.

### Present in HESA but not present in GOV.UK list (selected)
* **Stateless** – represents lack of nationality (no adjectival form).
* **American Samoa**, **British Virgin Islands**, **Falkland Islands**, etc. – territories without distinct adjectival nationalities.
* **Channel Islands not otherwise specified**, **Cyprus (EU / Non-EU variants)** – administrative splits.
* Historic or defunct states such as **Serbia and Montenegro (n.o.s.)**, **Czechoslovakia (n.o.s.)**, **USSR (n.o.s.)**, **Yugoslavia (n.o.s.)**.

_(HESA list is territory/state-oriented, so several entries have no simple adjectival equivalent.)_

---

## 5. Observations & recommendations
1. The newly-imported HESA file now appears to be the **full 2024/25 `NATION` lookup (≈230 codes)** rather than the previous historic-codes subset.
2. GOV.UK uses *adjectival* forms (`French`, `German`) whereas HESA uses *sovereign entity names* (`France`, `Germany`). When harmonising, decide which representation you need and create a mapping table.
3. Handle *stateless* and *historic* codes explicitly—they do not have straightforward adjectival equivalents.

---

## 6. Next steps
* Request full HESA nationality lookup (including current ISO-aligned codes) and rerun comparison.
* Build a mapping table with these columns:
  * HESA `Code`
  * HESA `Label`
  * Standard country name (ISO-3166-1 English short)
  * Adjectival nationality (GOV.UK form)
* Flag any cases where multiple GOV.UK entries might map to one HESA code (or vice-versa).

---

## 7. Mapping statistics (auto-generated)
*(Columns now include Territory flag and Match_Source indicating Direct/Special/Morph)*
| Metric | Count |
|--------|-------|
| Total HESA codes | 458 |
| GOV.UK adjectival entries | 197 |
| HESA codes with a GOV.UK match | 329 |
| HESA codes without match | 129 |
| Coverage | 71.8 % |

> Matching performed by simple lexical heuristics; manual review recommended for unmatched or ambiguous cases.

---

*Document generated automatically by analysis script.*
