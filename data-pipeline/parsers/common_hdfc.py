import pandas as pd


def parse_hdfc(file_path, sheet_name):
    df = pd.read_excel(
        file_path,
        sheet_name=sheet_name,
        header=4,
    )

    # Keep only listed equity holdings
    df = df[
        df["ISIN"]
        .astype(str)
        .str.startswith("INE")
    ].copy()

    df["% to NAV"] = pd.to_numeric(
        df["% to NAV"],
        errors="coerce",
    )

    holdings = []

    for _, row in df.iterrows():
        holdings.append(
            {
                "stock_name": str(row["Name Of the Instrument"]).strip(),
                "isin": str(row["ISIN"]).strip(),
                "sector": str(row["Industry+ /Rating"]).strip(),
                "allocation_percent": float(row["% to NAV"]),
            }
        )

    return holdings
