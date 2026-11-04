# Demo data

Twelve monthly electricity readings for one invented household, in Turtle, for Anna's pod.
No real person, address or meter is involved.

## Files

| File                     | What it is                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `generate_meter_data.py` | Builds `meter-readings.ttl`. Python 3.8 or later, standard library only.                                           |
| `meter-readings.ttl`     | The readings, as stored in the pod at `http://localhost:3000/anna/energy/meter-readings`. Made with `--synthetic`. |
| `data/`                  | Put the UCI download here if you use it. Do not commit or share it.                                                |

## Make the file

Invented values, no download needed (this is how the committed file was made):

```bash
python demo/generate_meter_data.py --synthetic
```

Shaped on a real household:

```bash
# 1. Download and unzip into demo/data/
#    https://archive.ics.uci.edu/ml/datasets/individual+household+electric+power+consumption
# 2. Generate
python demo/generate_meter_data.py --input demo/data/household_power_consumption.txt
```

Options: `--annual-kwh` (the yearly total; default 2,534; `0` keeps the raw UCI values),
`--source-year` (2007, 2008 or 2009), `--output-year` (default 2025), `--base` (the address
prefix; it must match `odrl:target` in the policies), `--out`. `--help` lists them all.

## What the numbers are

- **Synthetic mode.** A fixed curve, high in winter and low in summer, with a small seeded
  random wobble, scaled to the yearly total. Invented.
- **UCI mode.** One house in Sceaux, near Paris, measured every minute from December 2006 to
  November 2010. For each month: the average power over the minutes that have a value, times
  the hours in the month, gives kWh. The twelve values are then scaled to the yearly total and
  labelled as 2025. The shape is one French household; a typical Ghent one may differ.
- **The default total**, 2,534 kWh, is the average Flemish household in 2023 (Flemish
  regulator VNR, quoted by callmepower.be, read 29 October 2026).
- **Monthly on purpose.** Quarter-hour data would show when people are at home. Monthly totals
  are enough for the story and reveal less.

  ## Vocabulary

Each month is one `sosa:Observation` made by one `sosa:Sensor` (the meter) about one
`sosa:FeatureOfInterest` (the household). The period is an OWL-Time interval; the value is a
`qudt:QuantityValue` in `unit:KiloW-HR`. A `prov:Collection` groups the twelve readings and
says where they come from.

- SOSA/SSN: https://www.w3.org/TR/vocab-ssn/
- OWL-Time: https://www.w3.org/TR/owl-time/
- QUDT kilowatt-hour: https://qudt.org/vocab/unit/KiloW-HR
- PROV-O: https://www.w3.org/TR/prov-o/


## Credit

If you generate from the UCI file, keep this credit with the result:

> Hebrail, G. and Berard, A. (2006). *Individual Household Electric Power Consumption*
> [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C58K54.
> Licence CC BY 4.0. Changed by this project: averaged per month, converted to kWh, rescaled
> to a chosen yearly total, relabelled to another year. Meter and household identifiers are
> invented. The UCI file itself is not redistributed.

The committed `meter-readings.ttl` contains no UCI values.
