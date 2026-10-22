import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import { Badge } from "../components/Badge";
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle2, Clock } from "lucide-react";

export const ExaminationResults: React.FC = () => {
  const { examinationId } = useParams<{ examinationId: string }>();
  const [data, setData] = useState<{ examination: any; results: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      if (!examinationId) return;
      try {
        const res = await api.getExaminationResults(examinationId);
        setData(res);
      } catch (err) {
        console.error("Results load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [examinationId]);

  const handleExportCSV = () => {
    if (!data?.results) return;

    const headers = ["Roll Number", "Student Name", "Email", "Status", "Score", "Total Marks"];
    const rows = data.results.map((r) => [
      r.student.rollNumber || "N/A",
      r.student.name,
      r.student.email,
      r.status,
      r.totalScore,
      data.examination.totalMarks,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `exam_results_${data.examination.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading assessment results...</div>;
  if (!data) return <div className="p-8 text-center text-slate-500">No results found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{data.examination.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Student Performance & Assessment Grade Summary (Total Marks: {data.examination.totalMarks})
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Results (CSV)</span>
        </button>
      </div>

      {/* Roster & Scores Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Roll Number</th>
                <th className="py-3.5 px-6">Student Name</th>
                <th className="py-3.5 px-6">University Email</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Questions Attempted</th>
                <th className="py-3.5 px-6 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.results.map((r) => (
                <tr key={r.student.id} className="hover:bg-slate-50/50">
                  <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-600">
                    {r.student.rollNumber || "—"}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-900">{r.student.name}</td>
                  <td className="py-4 px-6 text-slate-500">{r.student.email}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        r.status === "SUBMITTED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.status === "SUBMITTED" ? "Submitted" : "Not Attempted"}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-semibold">{r.submissions.length} Questions</td>
                  <td className="py-4 px-6 text-right font-bold text-slate-900">
                    {r.totalScore} / {data.examination.totalMarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
