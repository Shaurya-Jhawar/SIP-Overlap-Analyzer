"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function Home() {
  const [funds, setFunds] = useState([]);
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [overlapData, setOverlapData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAllOverlap, setShowAllOverlap] = useState(false);

  // Fetch the list of all mutual funds once on page load
  useEffect(() => {
    async function fetchFunds() {
      const { data, error } = await supabase.from("mutual_funds").select("*");

      if (error) {
        console.error("Error fetching funds:", error);
      } else {
        setFunds(data);
      }
    }

    fetchFunds();
  }, []);

  function handleCheckboxChange(id) {
    if (selectedFunds.includes(id)) {
      setSelectedFunds(selectedFunds.filter((fundId) => fundId !== id));
    } else {
      setSelectedFunds([...selectedFunds, id]);
    }
  }

  async function analyzePortfolio() {
    setLoading(true);

    const { data, error } = await supabase
      .from("fund_holdings")
      .select("*")
      .in("fund_id", selectedFunds);

    if (error) {
      console.error("Error fetching holdings:", error);
      setLoading(false);
      return;
    }

    // Quick lookup so we can show fund names instead of raw IDs
    const fundNameById = {};
    funds.forEach((fund) => {
      fundNameById[fund.id] = fund.fund_name;
    });

    const stockMap = {};
    // fundSectorMap[fund_id][sector] = total allocation % of that fund in that sector
    const fundSectorMap = {};

    data.forEach((holding) => {
      const stockKey =
  holding.isin ??
  holding.stock_name.trim().toLowerCase();
      const stockName = holding.stock_name;
      const sector = holding.sector || "Unspecified";
      const allocation = Number(holding.allocation_percent) || 0;
      const fundId = holding.fund_id;

      // --- Build per-stock breakdown (which funds hold it, at what %) ---
      if (!stockMap[stockKey]) {
  stockMap[stockKey] = {
    isin: holding.isin,
    stock_name: stockName,
    sector,
    holdings: [],
  };
}

      if (
  !stockMap[stockKey].holdings.some(
    (h) => h.fund_id === fundId
  )
) {
  stockMap[stockKey].holdings.push({
    fund_id: fundId,
    fund_name: fundNameById[fundId] || "Unknown Fund",
    allocation_percent: allocation,
  });
}

      // --- Build per-fund sector totals, used for the sector average below ---
      if (!fundSectorMap[fundId]) {
        fundSectorMap[fundId] = {};
      }
      if (!fundSectorMap[fundId][sector]) {
        fundSectorMap[fundId][sector] = 0;
      }
      fundSectorMap[fundId][sector] += allocation;
    });


    Object.values(stockMap).forEach((stock) => {
  stock.holdings.sort(
    (a, b) => b.allocation_percent - a.allocation_percent
  );
});

    // Only stocks appearing in more than one selected fund count as "overlap"
    const overlapArray = Object.values(stockMap)
  .filter((stock) => stock.holdings.length > 1)
  .sort((a, b) => {
    const totalA = a.holdings.reduce(
      (sum, h) => sum + h.allocation_percent,
      0
    );

    const totalB = b.holdings.reduce(
      (sum, h) => sum + h.allocation_percent,
      0
    );

    return totalB - totalA;
  });
    // --- Sector concentration: average each fund's sector % across ALL
    // selected funds (funds with 0% in a sector still count in the average).
    // This assumes equal investment across the selected funds — see disclaimer. ---
    const allSectors = new Set();
    Object.values(fundSectorMap).forEach((sectorTotals) => {
      Object.keys(sectorTotals).forEach((sector) => allSectors.add(sector));
    });

    const sectorArray = Array.from(allSectors)
      .map((sector) => {
        const sumAcrossFunds = selectedFunds.reduce((sum, fundId) => {
          const fundTotal = fundSectorMap[fundId]?.[sector] || 0;
          return sum + fundTotal;
        }, 0);

        return {
          sector,
          averageAllocation: sumAcrossFunds / selectedFunds.length,
        };
      })
      .sort((a, b) => b.averageAllocation - a.averageAllocation);

    setOverlapData(overlapArray);
    setSectorData(sectorArray);
    setLoading(false);
  }

  const filteredFunds = funds.filter((fund) =>
    fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topSector = sectorData[0];
  const isConcentrated = topSector && topSector.averageAllocation > 35;
  const displayedOverlap = showAllOverlap
  ? overlapData
  : overlapData.slice(0, 10);

  return (
    <main className="p-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">SIP Overlap Analyzer</h1>

      {/* Fund selection */}
      <div className="bg-zinc-900 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Select Mutual Funds</h2>

        <input
          type="text"
          placeholder="Search mutual funds..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-4 rounded border border-gray-500 bg-black text-white"
        />

        {filteredFunds.map((fund) => (
          <div key={fund.id} className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              checked={selectedFunds.includes(fund.id)}
              onChange={() => handleCheckboxChange(fund.id)}
            />
            <label>{fund.fund_name}</label>
          </div>
        ))}

        <button
          onClick={analyzePortfolio}
          disabled={selectedFunds.length < 2 || loading}
          className={`mt-4 px-6 py-3 rounded text-white font-semibold ${
            selectedFunds.length < 2 || loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Analyzing..." : "Analyze Portfolio"}
        </button>

        {selectedFunds.length === 1 && (
          <p className="text-sm text-gray-400 mt-2">
            Select at least one more fund to check for overlap.
          </p>
        )}
      </div>

      {/* Overlap analysis table */}
      {overlapData.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-6 shadow-lg mt-8">
          <h2 className="text-2xl font-bold mb-4">Overlap Analysis</h2>

          <table className="table-auto border-collapse border border-gray-600 w-full">
            <thead>
              <tr>
                <th className="border px-4 py-2 text-left">Stock</th>
                <th className="border px-4 py-2 text-left">Sector</th>
                <th className="border px-4 py-2 text-left">
                  Held By (Fund — Allocation %)
                </th>
              </tr>
            </thead>

            <tbody>
              {displayedOverlap.map((stock) => (
                <tr key={stock.isin || stock.stock_name}>
                  <td className="border px-4 py-2 align-top">
                    {stock.stock_name}
                  </td>
                  <td className="border px-4 py-2 align-top">
                    {stock.sector}
                  </td>
                  <td className="border px-4 py-2">
                    <ul className="space-y-1">
                      {stock.holdings.map((h) => (
                        <li
                          key={h.fund_id}
                          className="flex justify-between gap-4"
                        >
                          <span>{h.fund_name}</span>
                          <span className="text-blue-400 font-medium">
                            {h.allocation_percent.toFixed(2)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {overlapData.length > 10 && (
  <div className="mt-6 flex justify-center">
    <button
      onClick={() => setShowAllOverlap(!showAllOverlap)}
      className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
    >
      {showAllOverlap
        ? "Show Top 10"
        : `View All (${overlapData.length})`}
    </button>
  </div>
)}
        </div>
      )}

      {/* Sector concentration chart */}
      {sectorData.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-6 shadow-lg mt-8">
          <h2 className="text-3xl font-bold mb-2">Sector Concentration</h2>
          <p className="text-xs text-white mb-6">
            *Assumes an equal amount invested across each selected fund.
            Average sector allocation is calculated across all selected
            funds, not weighted by actual investment size.
          </p>

          {isConcentrated && (
            <div className="bg-yellow-900 text-yellow-200 p-4 rounded mb-6">
              ⚠️ {topSector.sector} makes up an average of{" "}
              {topSector.averageAllocation.toFixed(1)}% across your selected
              funds — consider diversifying.
            </div>
          )}

          <div style={{ width: "100%", height: 400 }}>
            <ResponsiveContainer>
              <BarChart data={sectorData}>
                <XAxis
                  dataKey="sector"
                  angle={-25}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
  cursor={{ fill: "rgba(255,255,255,0.05)" }}
  contentStyle={{
    backgroundColor: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
  }}
  labelStyle={{
    color: "#3b82f6", // same blue as the bars
    fontWeight: 600,
  }}
  itemStyle={{
    color: "#3b82f6",
  }}
  formatter={(value) => [`${Number(value).toFixed(2)}%`, "Average Allocation"]}
/>
                <Bar dataKey="averageAllocation" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </main>
  );
}