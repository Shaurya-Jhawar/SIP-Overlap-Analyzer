import pandas as pd

pd.set_option("display.max_columns", None)
pd.set_option("display.width", None)

file = "downloads/Monthly HDFC Mid Cap Fund - 30 June 2026.xlsx"

df = pd.read_excel(
    file,
    sheet_name="MIDCAP",
    header=4
)

print("\n===== COLUMNS =====")
for i, col in enumerate(df.columns):
    print(f"{i}: {repr(col)}")

print("\n===== SAMPLE ROW =====")
print(df.iloc[8].to_dict())
