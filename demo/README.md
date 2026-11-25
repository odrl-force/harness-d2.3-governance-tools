# Demo data

Twelve monthly electricity readings for each of two invented households, in Turtle: Anna's
(`meter-readings.ttl`) and Bob's (`bob-meter-readings.ttl`). Persons, addresses, meter readings 
are all synthetic.


## Make the file

Invented values, no download needed:

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

Options: `--base` (the address prefix; it must match `odrl:target` in the policies).

Bob's file:

```bash
python demo/generate_meter_data.py --synthetic --seed 7 --annual-kwh 3100 \
  --base 'http://localhost:3000/bob/energy/meter-readings#' \
  --meter-id meter-demo-0043 --household-id household-demo-02 --out demo/bob-meter-readings.ttl
```

## What the numbers are

- **The default total**, 2,534 kWh, is the average Flemish household in 2023 (Flemish
  regulator VNR, quoted by callmepower.be, read 29 October 2026).
- **Monthly on purpose.** Quarter-hour data would show when people are at home. Monthly totals
  are enough for the story and reveal less.

## Credit

If you generate from the UCI file, keep this credit with the result:

> Hebrail, G. and Berard, A. (2006). *Individual Household Electric Power Consumption*
> [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C58K54.
> Licence CC BY 4.0. Changed by this project: averaged per month, converted to kWh, rescaled
> to a chosen yearly total, relabelled to another year. Meter and household identifiers are
> invented. The UCI file itself is not redistributed.

The committed `meter-readings.ttl` contains no UCI values.
