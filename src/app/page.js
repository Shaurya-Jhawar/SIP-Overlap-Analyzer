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
  const [holdings, setHoldings] = useState([]);
  const [overlapData, setOverlapData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchFunds() {
      const { data, error } = await supabase
        .from("mutual_funds")
        .select("*");

      if (error) {
        console.error(error);
      } else {
        setFunds(data);
      }
    }

    fetchFunds();
  }, []);

  function handleCheckboxChange(id) {
    if (selectedFunds.includes(id)) {
      setSelectedFunds(
        selectedFunds.filter((fundId) => fundId !== id)
      );
    } else {
      setSelectedFunds([...selectedFunds, id]);
    }
  }
 async function analyzePortfolio() {

    const { data, error } = await supabase
        .from("fund_holdings")
        .select("*")
        .in("fund_id", selectedFunds);

   if (error) {
    console.error(error);
} else {

    setHoldings(data);

    const stockMap = {};

    data.forEach((holding) => {

        const stock = holding.stock_name;

        if (!stockMap[stock]) {

            stockMap[stock] = {
                stock_name: stock,
                totalAllocation: 0,
                fundCount: 0,
            };

        }

        stockMap[stock].totalAllocation +=
            Number(holding.allocation_percent);

        stockMap[stock].fundCount += 1;

    });

    const overlapArray = Object.values(stockMap)
    .filter((stock) => stock.fundCount > 1)
    .sort((a, b) => b.totalAllocation - a.totalAllocation);

setOverlapData(overlapArray);
const sectorMap = {};

data.forEach((holding) => {
  const sector = holding.sector;

  if (!sectorMap[sector]) {
    sectorMap[sector] = {
      sector: sector,
      totalAllocation: 0,
    };
  }

  sectorMap[sector].totalAllocation += Number(
    holding.allocation_percent
  );
});

const sectorArray = Object.values(sectorMap).sort(
  (a, b) => b.totalAllocation - a.totalAllocation
);

setSectorData(sectorArray);
}

}

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold mb-6">
        SIP Overlap Analyzer
      </h1>

    <div className="bg-zinc-900 rounded-xl p-6 shadow-lg">
      <h2 className="text-2xl mb-4">
        Select Mutual Funds
      </h2>
      

      <input
    type="text"
    placeholder="Search mutual funds..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full p-2 mb-4 mt-4 rounded border border-gray-500 bg-black text-white"
/>

      {funds
    .filter((fund) =>
        fund.fund_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    )
    .map((fund) => (
        <div
          key={fund.id}
          className="flex items-center gap-3 mb-2"
        >
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
    disabled={selectedFunds.length < 2}
    className={`px-6 py-3 rounded text-white font-semibold ${
        selectedFunds.length < 2
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
    }`}
>
    Analyze Portfolio
</button>
</div>

<div className="mt-10">

    <div className="bg-zinc-900 rounded-xl p-6 shadow-lg mt-8">
<h2 className="text-2xl font-bold mb-4">
        Overlap Analysis
    </h2>
    

    <table className="table-auto border-collapse border border-gray-600">

        <thead>

            <tr>

                <th className="border px-4 py-2">Stock</th>

                <th className="border px-4 py-2">Funds Holding</th>

                <th className="border px-4 py-2">Combined Allocation</th>

            </tr>

        </thead>

        <tbody>

            {overlapData.map((stock) => (

                <tr key={stock.stock_name}>

                    <td className="border px-4 py-2">
                        {stock.stock_name}
                    </td>

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

</div>

<div className="bg-zinc-900 rounded-xl p-6 shadow-lg mt-8">
  <h2 className="text-3xl font-bold mb-6">
    Sector Concentration
  </h2>
  </div>

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

        <Tooltip />

        <Bar
          dataKey="totalAllocation"
          fill="#3b82f6"
        />
      </BarChart>
    </ResponsiveContainer>
  </div>


    </main>
  );
}