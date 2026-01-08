
import React, { useState, useMemo } from 'react';
import { parseBulkInput, getPermutations } from '../utils/parser';

const BetCalculator: React.FC = () => {
    const [text, setText] = useState('');

    const parsedBets = useMemo(() => {
        return parseBulkInput(text);
    }, [text]);

    // Group by original notation
    const validationGroups = useMemo(() => {
        const groups: Record<string, { count: number; amount: number; isPerm: boolean; baseNum: string; isCompound: boolean }> = {};

        parsedBets.forEach(bet => {
            if (!groups[bet.original]) {
                const isCompound = /[Rr]/.test(bet.original) && /[-=@*]/.test(bet.original);
                const baseMatch = bet.original.match(/^(\d{3})/);
                const baseNum = baseMatch ? baseMatch[1] : bet.number;

                groups[bet.original] = {
                    count: 0,
                    amount: 0,
                    isPerm: bet.isPermutation,
                    baseNum: baseNum,
                    isCompound: isCompound
                };
            }
            groups[bet.original].count++;
            groups[bet.original].amount += bet.amount;
        });
        return Object.entries(groups);
    }, [parsedBets]);

    const totalSum = useMemo(() => {
        return parsedBets.reduce((acc, curr) => acc + curr.amount, 0);
    }, [parsedBets]);

    // Group bets by number for detailed view
    const betsByNumber = useMemo(() => {
        const grouped: Record<string, number> = {};
        parsedBets.forEach(bet => {
            grouped[bet.number] = (grouped[bet.number] || 0) + bet.amount;
        });
        return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    }, [parsedBets]);

    const handleClear = () => {
        setText('');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-calculator text-amber-600"></i>
                            ဂဏန်းတွက်စက်
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Enter notations (same as bulk entry)
                                </label>
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="E.g. 123-1000, 456R2000, 789@500"
                                    rows={8}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                />
                            </div>
                            <button
                                onClick={handleClear}
                                disabled={!text}
                                className="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-2xl font-black transition-all"
                            >
                                <i className="fa-solid fa-eraser mr-2"></i>
                                Clear
                            </button>
                        </div>

                        {/* Notation Guide */}
                        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                            <h4 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Notation Guide</h4>
                            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                <p><span className="font-mono text-amber-600">123-1000</span> = 123 တစ်လုံးထိုး 1000</p>
                                <p><span className="font-mono text-amber-600">123R1000</span> = 123 အပတ်စုံ 1000 စီ</p>
                                <p><span className="font-mono text-amber-600">123@1000</span> = 123 အပတ်စုံ 1000 စီ (R နှင့်အတူ)</p>
                                <p><span className="font-mono text-amber-600">123R1000-2000</span> = 123 ကို 2000, ကျန် 1000 စီ</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Total Summary */}
                    <div className="bg-amber-600 text-white p-6 rounded-3xl flex justify-between items-center shadow-xl">
                        <div>
                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Total Calculated Amount</p>
                            <p className="text-3xl font-black">{totalSum.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center text-2xl">
                            <i className="fa-solid fa-sigma"></i>
                        </div>
                    </div>

                    {/* Parsed Groups */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">
                                Notation Breakdown
                            </h4>
                            <span className="text-[10px] font-black text-slate-400 uppercase">{validationGroups.length} Entries</span>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-3">Notation</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Count</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {validationGroups.map(([original, data]) => (
                                        <tr key={original} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                                            <td className="px-6 py-3 font-mono text-sm">{original}</td>
                                            <td className="px-6 py-3">
                                                {data.isPerm || data.isCompound ? (
                                                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[10px] font-black rounded uppercase">
                                                        {data.isCompound ? 'Compound' : 'Permutation'}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black rounded uppercase">
                                                        Direct
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-slate-500">{data.count} bets</td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                                {data.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {validationGroups.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">
                                                Enter notations to see breakdown
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Numbers Grid */}
                    {betsByNumber.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">
                                    All Numbers ({betsByNumber.length})
                                </h4>
                            </div>
                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                    {betsByNumber.map(([number, amount]) => (
                                        <div
                                            key={number}
                                            className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-800"
                                        >
                                            <p className="text-lg font-black font-mono text-amber-600">{number}</p>
                                            <p className="text-xs font-bold text-slate-500">{amount.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BetCalculator;
