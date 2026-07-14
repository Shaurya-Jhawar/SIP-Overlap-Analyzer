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

    const stockMap = {};
    const sectorMap = {};

    // Single pass builds both the stock-overlap map and the sector map
    data.forEach((holding) => {
      const stock = holding.stock_name;
      const sector = holding.sector || "Unspecified";
      const allocation = Number(holding.allocation_percent) || 0;

      if (!stockMap[stock]) {
        stockMap[stock] = {
          stock_name: stock,
          totalAllocation: 0,
          fundCount: 0,
        };
      }
      stockMap[stock].totalAllocation += allocation;
      stockMap[stock].fundCount += 1;

      if (!sectorMap[sector]) {
        sectorMap[sector] = {
          sector: sector,
          totalAllocation: 0,
        };
      }
      sectorMap[sector].totalAllocation += allocation;
    });

    // Only stocks appearing in more than one selected fund count as "overlap"
    const overlapArray = Object.values(stockMap)
      .filter((stock) => stock.fundCount > 1)
      .sort((a, b) => b.totalAllocation - a.totalAllocation);

    const sectorArray = Object.values(sectorMap).sort(
      (a, b) => b.totalAllocation - a.totalAllocation
    );

    setOverlapData(overlapArray);
    setSectorData(sectorArray);
    setLoading(false);
  }

  const filteredFunds = funds.filter((fund) =>
    fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topSector = sectorData[0];
  const isConcentrated = topSector && topSector.totalAllocation > 35;

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
                <th className="border px-4 py-2">Funds Holding</th>
                <th className="border px-4 py-2">Combined Allocation</th>
              </tr>
            </thead>

            <tbody>
              {overlapData.map((stock) => (
                <tr key={stock.stock_name}>
                  <td className="border px-4 py-2">{stock.stock_name}</td>
                  <td className="border px-4 py-2 text-center">
                    {stock.fundCount}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {stock.totalAllocation.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sector concentration chart */}
      {sectorData.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-6 shadow-lg mt-8">
          <h2 className="text-3xl font-bold mb-6">Sector Concentration</h2>

          {isConcentrated && (
            <div className="bg-yellow-900 text-yellow-200 p-4 rounded mb-6">
              ⚠️ {topSector.sector} makes up{" "}
              {topSector.totalAllocation.toFixed(1)}% of your combined
              portfolio across the selected funds — consider diversifying.
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
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                <Bar dataKey="totalAllocation" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </main>
  );
}