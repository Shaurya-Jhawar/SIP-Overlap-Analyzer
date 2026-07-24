"""
sync.py

Orchestrator only -- no fund-specific parsing logic lives here.
Add a new fund by:
  1. Writing parsers/<fund>.py with a parse(file_path) -> list[dict] function
  2. Registering it in parsers/__init__.py's PARSERS dict
  3. Adding one entry to FUND_SOURCES below

Run:
  python sync.py                 -> syncs every fund in FUND_SOURCES
  python sync.py ppfas           -> syncs just one fund by key
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client

from parsers import PARSERS

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

# --------------------------------------------------------------------------
# One entry per fund. "key" must match a key in parsers/__init__.py's
# PARSERS dict. "fund_id" must match the id in your Supabase
# mutual_funds table.
# --------------------------------------------------------------------------

FUND_SOURCES = [
    {
        "key": "ppfas",
        "fund_id": 1,  # <-- confirm this matches Parag Parikh Flexi Cap's real id
        "fund_name": "Parag Parikh Flexi Cap",
        "file_path": "downloads/PPFCF_PPFAS_Monthly_Portfolio_Report_June_30_2026 (1).xlsx",
    },
    {
        "key": "hdfc",
        "fund_id": 2,   # Replace with the actual ID from your mutual_funds table
        "fund_name": "HDFC Flexi Cap",
        "file_path": "downloads/Monthly HDFC Flexi Cap Fund - 30 June 2026.xlsx",
    },
    {
        "key": "hdfc_mid",
        "fund_id": 9,
        "fund_name": "HDFC Mid Cap Fund",
        "file_path": "downloads/Monthly HDFC Mid Cap Fund - 30 June 2026.xlsx",
    },

]


def sync_fund(fund_config: dict):
    key = fund_config["key"]
    fund_id = fund_config["fund_id"]
    fund_name = fund_config["fund_name"]
    file_path = fund_config["file_path"]

    parser_fn = PARSERS.get(key)
    if parser_fn is None:
        print(f"No parser registered for key '{key}' -- skipping {fund_name}.")
        return

    print(f"Parsing {fund_name}...")
    try:
        holdings = parser_fn(file_path)
    except Exception as e:
        print(f"  FAILED to parse {fund_name}: {e}")
        return

    if not holdings:
        print(f"  No holdings parsed for {fund_name} -- skipping DB update.")
        return

    print(f"  Parsed {len(holdings)} holdings.")

    rows = [
        {
            "fund_id": fund_id,
            "stock_name": h["stock_name"],
            "isin": h["isin"],
            "sector": h["sector"],
            "allocation_percent": h["allocation_percent"],
        }
        for h in holdings
    ]

    # Wipe old holdings for this fund, then insert the fresh set --
    # keeps the table representing only the latest disclosure.
    delete_result = (
        supabase.table("fund_holdings").delete().eq(
            "fund_id", fund_id).execute()
    )
    print(f"  Deleted {len(delete_result.data)} old rows.")

    insert_result = supabase.table("fund_holdings").insert(rows).execute()
    print(f"  Inserted {len(insert_result.data)} new rows for {fund_name}.")


def main():
    args = sys.argv[1:]

    if args:
        # Sync only the funds whose key was passed on the command line
        targets = [f for f in FUND_SOURCES if f["key"] in args]
        if not targets:
            print(f"No matching fund keys found for: {args}")
            return
    else:
        targets = FUND_SOURCES

    for fund_config in targets:
        sync_fund(fund_config)

    print("Done.")


if __name__ == "__main__":
    main()
