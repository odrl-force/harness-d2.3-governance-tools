#!/usr/bin/env python3
"""Generate one household's monthly electricity readings as Turtle for the Solid pod.

Input : the UCI "Individual Household Electric Power Consumption" file
        (household_power_consumption.txt). Download it yourself, do not commit it.
        https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption
Output: demo/meter-readings.ttl  (12 monthly observations, made-up meter and household IDs)

The raw file has one reading per minute (kW). For each month we take the mean of the
valid minutes and multiply by the hours in that month, which gives kWh and copes with
the ~1.25% of minutes that are missing. The result is optionally rescaled to a target
annual total and relabelled to another calendar year. See demo/README.md.

Only the standard library is needed. Python 3.8+.

Examples
    python demo/generate_meter_data.py --input demo/data/household_power_consumption.txt
    python demo/generate_meter_data.py --synthetic        # no download, invented seasonal curve
"""
import argparse
import calendar
import csv
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

# Seasonal shape used only with --synthetic (winter high, summer low). Invented, not measured.
SYNTHETIC_SHAPE = [1.25, 1.15, 1.05, 0.95, 0.85, 0.78, 0.75, 0.75, 0.85, 0.95, 1.10, 1.25]


def monthly_kwh_from_uci(path: Path, year: int) -> list:
    """Return 12 monthly kWh values for a calendar year of the UCI file."""
    sums = [0.0] * 12
    counts = [0] * 12
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter=";")
        header = next(reader)
        try:
            i_date = header.index("Date")
            i_power = header.index("Global_active_power")
        except ValueError:
            sys.exit(f"Unexpected header in {path}: {header}")
        for row in reader:
            if len(row) <= i_power:
                continue
            value = row[i_power].strip()
            if value in ("", "?"):
                continue  # missing minute
            # Date is dd/mm/yyyy
            day, month, yr = row[i_date].split("/")
            if int(yr) != year:
                continue
            m = int(month) - 1
            sums[m] += float(value)
            counts[m] += 1
    if any(c == 0 for c in counts):
        empty = [i + 1 for i, c in enumerate(counts) if c == 0]
        sys.exit(f"No data for months {empty} in {year}. 2007 is the only complete calendar "
                 f"year in the UCI file (it starts 16 Dec 2006 and ends 26 Nov 2010).")
    kwh = []
    for m in range(12):
        mean_kw = sums[m] / counts[m]
        hours = calendar.monthrange(year, m + 1)[1] * 24
        kwh.append(mean_kw * hours)
    return kwh


def monthly_kwh_synthetic(annual_kwh: float, year: int, seed: int) -> list:
    rng = random.Random(seed)
    raw = [w * rng.uniform(0.93, 1.07) for w in SYNTHETIC_SHAPE]
    total = sum(raw)
    return [annual_kwh * r / total for r in raw]


def turtle(kwh: list, year: int, base: str, meter: str, household: str, synthetic: bool) -> str:
    if synthetic:
        source_note = ["# Values invented with a seasonal curve (--synthetic). Not derived from any measurement."]
    else:
        source_note = [
            "# Monthly values derived from UCI 'Individual Household Electric Power Consumption'",
            "# (Hebrail & Berard, CC BY 4.0, https://doi.org/10.24432/C58K54). Rescaled and relabelled.",
            "# See demo/README.md.",
        ]

    def instant(y, m, d=1):
        return datetime(y, m, d, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    lines = [
        f"@prefix ex:   <{base}> .",
        "@prefix sosa: <http://www.w3.org/ns/sosa/> .",
        "@prefix time: <http://www.w3.org/2006/time#> .",
        "@prefix qudt: <http://qudt.org/schema/qudt/> .",
        "@prefix unit: <http://qudt.org/vocab/unit/> .",
        "@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .",
        "@prefix dcterms: <http://purl.org/dc/terms/> .",
        "",
        "# Demo data for HARNESS D2.3. No real person or address.",
    ] + source_note + [
        "",
        f"ex:{household} a sosa:FeatureOfInterest ;",
        '    dcterms:description "Demo household (invented)" .',
        "",
        f"ex:{meter} a sosa:Sensor ;",
        "    sosa:observes ex:electricalEnergyConsumption .",
        "",
        "ex:electricalEnergyConsumption a sosa:ObservableProperty ;",
        '    dcterms:description "Electrical energy consumed by the household over the observation period" .',
        "",
    ]
    for m in range(1, 13):
        start = instant(year, m)
        end = instant(year + 1, 1) if m == 12 else instant(year, m + 1)
        lines += [
            f"ex:obs-{year}-{m:02d} a sosa:Observation ;",
            f"    sosa:madeBySensor ex:{meter} ;",
            "    sosa:observedProperty ex:electricalEnergyConsumption ;",
            f"    sosa:hasFeatureOfInterest ex:{household} ;",
            "    sosa:phenomenonTime [ a time:Interval ;",
            f'        time:hasBeginning [ a time:Instant ; time:inXSDDateTimeStamp "{start}"^^xsd:dateTimeStamp ] ;',
            f'        time:hasEnd [ a time:Instant ; time:inXSDDateTimeStamp "{end}"^^xsd:dateTimeStamp ] ] ;',
            f'    sosa:resultTime "{end}"^^xsd:dateTimeStamp ;',
            "    sosa:hasResult [ a qudt:QuantityValue ;",
            f'        qudt:numericValue "{kwh[m - 1]:.2f}"^^xsd:decimal ;',
            "        qudt:unit unit:KiloW-HR ] .",
            "",
        ]
    return "\n".join(lines)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--input", type=Path, help="path to household_power_consumption.txt")
    p.add_argument("--synthetic", action="store_true",
                   help="skip the UCI file and invent a seasonal curve (fallback)")
    p.add_argument("--source-year", type=int, default=2007,
                   help="calendar year to read from the UCI file (default 2007, the only full one)")
    p.add_argument("--output-year", type=int, default=2025,
                   help="year the readings are labelled with in the Turtle (default 2025)")
    p.add_argument("--annual-kwh", type=float, default=3500.0,
                   help="rescale so the 12 months sum to this. 0 keeps the raw values. "
                        "Default 3500 is a placeholder, check it before quoting it anywhere.")
    p.add_argument("--seed", type=int, default=42, help="seed for --synthetic")
    p.add_argument("--base", default="https://pod.example/anna/energy/#",
                   help="namespace for the IRIs. Set it to your pod resource URL.")
    p.add_argument("--meter-id", default="meter-demo-0042")
    p.add_argument("--household-id", default="household-demo-01")
    p.add_argument("--out", type=Path, default=Path(__file__).parent / "meter-readings.ttl")
    args = p.parse_args()

    if args.synthetic:
        kwh = monthly_kwh_synthetic(args.annual_kwh or 3500.0, args.output_year, args.seed)
    elif args.input:
        kwh = monthly_kwh_from_uci(args.input, args.source_year)
        if args.annual_kwh > 0:
            factor = args.annual_kwh / sum(kwh)
            kwh = [v * factor for v in kwh]
    else:
        sys.exit("Give --input <path to household_power_consumption.txt> or use --synthetic.")

    args.out.write_text(turtle(kwh, args.output_year, args.base, args.meter_id, args.household_id, args.synthetic),
                        encoding="utf-8")
    print(f"Wrote {args.out}  ({sum(kwh):.0f} kWh over 12 months)")


if __name__ == "__main__":
    main()
