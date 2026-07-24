"""
parsers/ppfas.py

Parser for Parag Parikh Flexi Cap Fund monthly portfolio.

Every parser in this project must expose:

    parse(file_path) -> list[dict]

and return holdings in the format:

[
    {
        "stock_name": "...",
        "isin": "...",
        "sector": "...",
        "allocation_percent": 7.52,
    },
    ...
]

sync.py is completely parser-agnostic and simply uploads whatever this
function returns.
"""

import pandas as pd


def parse(file_path: str) -> list[dict]:
    # ------------------------------------------------------------
    # Read workbook
    # ------------------------------------------------------------
    df = pd.read_excel(
        file_path,
        sheet_name="PPFCF",
        header=3,
    )

    # ------------------------------------------------------------
    # Standardize column names
    # ------------------------------------------------------------
    df.columns = [
        "code",
        "stock_name",
        "isin",
        "sector",
        "quantity",
        "market_value",
        "allocation_percent",
        "ytm",
        "ytc",
        "extra",
    ]

    # ------------------------------------------------------------
    # Stop before the Money Market section.
    #
    # Everything below this in the PPFAS workbook consists of:
    #   - Money Market Instruments
    #   - Certificates of Deposit
    #   - Treasury Bills
    #   - Liquid Fund units
    #   - Performance statistics
    #
    # None of these belong in the overlap analyzer.
    # ------------------------------------------------------------
    cutoff = df[
        df["stock_name"]
        .astype(str)
        .str.strip()
        .eq("Money Market Instruments")
    ].index

    if len(cutoff) > 0:
        df = df.iloc[:cutoff[0]]

    # ------------------------------------------------------------
    # Convert allocation column
    # ------------------------------------------------------------
    df["allocation_percent"] = pd.to_numeric(
        df["allocation_percent"],
        errors="coerce",
    )

    df = df[df["allocation_percent"].notna()]

    # Raw file stores allocation as decimal (0.0833)
    df["allocation_percent"] *= 100

    # ------------------------------------------------------------
    # Remove headings/subtotals
    # ------------------------------------------------------------
    df = df[
        ~df["stock_name"].astype(str).str.contains(
            r"Sub Total|Grand Total|^Total$|Listed|Unlisted|Equity &",
            case=False,
            na=False,
            regex=True,
        )
    ]

    df.reset_index(drop=True, inplace=True)

    # ------------------------------------------------------------
    # Build final holdings
    # ------------------------------------------------------------
    holdings = []

    for _, row in df.iterrows():

        stock_name = str(row["stock_name"]).strip()

        isin = (
            None
            if pd.isna(row["isin"])
            else str(row["isin"]).strip()
        )

        sector = (
            "Unspecified"
            if pd.isna(row["sector"])
            else str(row["sector"]).strip()
        )

        allocation = float(row["allocation_percent"])

        if not stock_name:
            continue

        if allocation <= 0:
            continue

        holdings.append(
            {
                "stock_name": stock_name,
                "isin": isin,
                "sector": sector,
                "allocation_percent": allocation,
            }
        )

    return holdings
