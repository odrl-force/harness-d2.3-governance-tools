#!/usr/bin/env python3
"""Generate one household's monthly electricity readings as Turtle for the Solid pod.

This is a script that makes Anna's demo data for D2.3.

Input, one of two:
    --synthetic   no file needed; invents 12 values on a seasonal curve
    --input FILE  the UCI "Individual Household Electric Power Consumption" file
                  (household_power_consumption.txt), downloaded it yourself, never committed:
                  https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption

Output: demo/meter-readings.ttl, 12 monthly observations (SOSA, QUDT, OWL-Time, PROV-O)
        for an invented household and meter.

UCI mode: for each month, the mean of the valid minute readings (kW) times the hours in
the month gives kWh; missing minutes (about 1.25%) are skipped. Values are then rescaled
to a yearly total and relabelled to another year. See demo/README.md.

Needs only the standard library. Python 3.8 or later.

Examples
    python demo/generate_meter_data.py --synthetic
    python demo/generate_meter_data.py --input demo/data/household_power_consumption.txt
"""


import argparse
import calendar
import csv
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

# Seasonal shape used only with --synthetic (winter high, summer low). Invented.
# Default yearly total. An average Flemish household used 2,534 kWh of electricity in 2023,
# per the Flemish regulator (VNR, formerly VREG) as quoted by callmepower.be.

DEFAULT_ANNUAL_KWH = 2534.0

SYNTHETIC_SHAPE = [1.25, 1.15, 1.05, 0.95, 0.85, 0.78, 0.75, 0.75, 0.85, 0.95, 1.10, 1.25]


def monthly_kwh_from_uci(path: Path, year: int) -> list:
    """Read one calendar year from the UCI file and total it per month.

    Args:
        path: the UCI file, household_power_consumption.txt.
        year: the calendar year to read (2007, 2008 or 2009 are complete).

    Returns:
        12 numbers, kWh for January to December.

    Stops the script with a message if any month of that year has no readings.
    """
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
        sys.exit(f"No data for months {empty} in {year}. The UCI file starts 16 Dec 2006 and ends "
                 f"26 Nov 2010, so 2007, 2008 and 2009 are the complete calendar years.")
    kwh = []
    for m in range(12):
        mean_kw = sums[m] / counts[m]
        hours = calendar.monthrange(year, m + 1)[1] * 24
        kwh.append(mean_kw * hours)
    return kwh


def monthly_kwh_synthetic(annual_kwh: float, seed: int) -> list:
    """Invent 12 monthly values that follow a winter-high, summer-low curve.

    Args:
        annual_kwh: the yearly total the 12 values must add up to.
        seed: starting number for the random wobble; the same seed gives the same values.

    Returns:
        12 numbers, kWh for January to December, summing to annual_kwh.
    """
    rng = random.Random(seed)
    raw = [w * rng.uniform(0.93, 1.07) for w in SYNTHETIC_SHAPE]
    total = sum(raw)
    return [annual_kwh * r / total for r in raw]


def turtle(kwh: list, year: int, base: str, meter: str, household: str, synthetic: bool) -> str:
    """Write the 12 monthly values as RDF in Turtle.

    Args:
        kwh: 12 numbers, kWh for January to December.
        year: the year the readings are labelled with.
        base: start of every address in the file; the pod address of the data plus "#".
        meter: the meter's identifier, for example "meter-demo-0042".
        household: the household's identifier, for example "household-demo-01".
        synthetic: True if the values are invented; changes the provenance note.

    Returns:
        The whole Turtle file as one text, ready to save.
    """
    if synthetic:
        source_note = ["# Values invented with a seasonal curve (--synthetic). Not derived from any measurement."]
    else:
        source_note = [
            "# Monthly values derived from UCI 'Individual Household Electric Power Consumption'",
            "# (Hebrail & Berard, CC BY 4.0, https://doi.org/10.24432/C58K54). Rescaled and relabelled.",
            "# See demo/README.md.",
        ]

    def instant(y, m, d=1):
        """Return the first moment of a day as text, for example "2025-01-01T00:00:00Z" (UTC)."""
        return datetime(y, m, d, tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if synthetic:
        provenance = [
            "ex:readings a prov:Collection ;",
            '    dcterms:description "Twelve monthly readings for an invented household. Values come from an invented '
            'seasonal curve and are not derived from any measurement."@en ;',
            "    prov:hadMember " + ", ".join(f"ex:obs-{year}-{m:02d}" for m in range(1, 13)) + " .",
            "",
        ]
    else:
        provenance = [
            "ex:readings a prov:Collection ;",
            '    dcterms:description "Twelve monthly readings for an invented household, shaped on one real household '
            'in the UCI dataset, rescaled and relabelled."@en ;',
            "    prov:wasDerivedFrom <https://doi.org/10.24432/C58K54> ;",
            "    dcterms:license <https://creativecommons.org/licenses/by/4.0/> ;",
            "    prov:hadMember " + ", ".join(f"ex:obs-{year}-{m:02d}" for m in range(1, 13)) + " .",
            "",
        ]

    lines = [
        f"@prefix ex:   <{base}> .",
        "@prefix prov: <http://www.w3.org/ns/prov#> .",
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
    ] + provenance + [
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
    """Run the script from the command line.

    Input: the command-line options (see --help).
    Output: writes the Turtle file (default demo/meter-readings.ttl) and prints
            its path and the yearly total.
    """
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--input", type=Path, help="path to household_power_consumption.txt")
    p.add_argument("--synthetic", action="store_true",
                   help="skip the UCI file and invent a seasonal curve (fallback)")
    p.add_argument("--source-year", type=int, default=2007,
                   help="calendar year to read from the UCI file (2007, 2008 or 2009 are complete; default 2007)")
    p.add_argument("--output-year", type=int, default=2025,
                   help="year the readings are labelled with in the Turtle (default 2025)")
    p.add_argument("--annual-kwh", type=float, default=DEFAULT_ANNUAL_KWH,
                   help="rescale so the 12 months sum to this. 0 keeps the raw values. "
                        "Default 2534 = average Flemish household, 2023 (VNR, via callmepower.be).")
    p.add_argument("--seed", type=int, default=42, help="seed for --synthetic")
    p.add_argument("--base", default="http://localhost:3000/anna/energy/meter-readings#",
                   help="namespace for the IRIs: the pod resource URL plus #. Must match odrl:target in the policies.")
    p.add_argument("--meter-id", default="meter-demo-0042")
    p.add_argument("--household-id", default="household-demo-01")
    p.add_argument("--out", type=Path, default=Path(__file__).parent / "meter-readings.ttl")
    args = p.parse_args()

    if args.synthetic:
        kwh = monthly_kwh_synthetic(args.annual_kwh or DEFAULT_ANNUAL_KWH, args.seed)
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
