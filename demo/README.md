# Demo data

An invented household with twelve monthly electricity readings, written as Turtle for the Solid pod. No real person, address or identifier is involved.

## What is in here

| File | What it is | Committed? |
|---|---|---|
| `generate_meter_data.py` | Builds the Turtle file. Standard library only, Python 3.8+. | yes |
| `meter-readings.ttl` | The generated readings to into the pod. | yes |
| `data/` | Where the raw UCI is | no (see `.gitignore`) |

## Run it

Without any download (invented seasonal curve):

```bash
python demo/generate_meter_data.py --synthetic
```

From the real UCI data:

```bash
# 1. Download and unzip into demo/data/
#    https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption
# 2. Generate
python demo/generate_meter_data.py --input demo/data/household_power_consumption.txt
```

Useful options: `--annual-kwh` (rescale the yearly total, `0` keeps raw values),
`--output-year` (label the months with another year), `--base` (IRI namespace,
set it to the pod resource URL), `--out`. Run with `--help` for all of them.

## Vocabulary

Readings use SOSA (W3C Recommendation, 2017) with QUDT for the unit and OWL-Time
for the period. Each month is one `sosa:Observation` made by one `sosa:Sensor`
(the meter) about one `sosa:FeatureOfInterest` (the household). The value is a
`qudt:QuantityValue` in `unit:KiloW-HR`.

- SOSA/SSN: https://www.w3.org/TR/vocab-ssn/
- QUDT kilowatt-hour: https://qudt.org/vocab/unit/KiloW-HR
- OWL-Time: https://www.w3.org/TR/owl-time/

## Source and attribution

The monthly shape comes from:

> Hebrail, G. & Berard, A. (2006). *Individual Household Electric Power
> Consumption* [Dataset]. UCI Machine Learning Repository.
> https://doi.org/10.24432/C58K54

Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Changes made by this project: minute readings for calendar year 2007 were
averaged per month and multiplied by the hours in the month to give kWh
(missing minutes are skipped); the twelve values were rescaled to a chosen
annual total; the months were relabelled to another year. Meter and household
identifiers are invented. The generator only ever reads the file, it never
redistributes it.

`meter-readings.ttl` as committed was produced with `--synthetic`, so it does
not contain UCI-derived values. If you regenerate it from the UCI file, keep the
attribution above.

The default annual total (3500 kWh) is a placeholder chosen to look like a
household, not a measured Belgian figure.
