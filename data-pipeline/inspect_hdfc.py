import pandas as pd

pd.set_option("display.max_rows", 50)
pd.set_option("display.max_columns", None)
pd.set_option("display.width", None)

file = "downloads/Monthly HDFC Flexi Cap Fund - 30 June 2026.xlsx"

df = pd.read_excel(
    file,
    sheet_name="HDFCEQ",
    header=4,
)

print(
    df[
        [
            "ISIN",
            "Name Of the Instrument",
            "Industry+ /Rating",
            "% to NAV",
        ]
    ].head(20).to_string()
)
