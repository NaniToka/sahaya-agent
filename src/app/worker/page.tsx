export default function WorkerDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Social Worker Dashboard</h1>
        <p className="text-lg text-gray-600 mt-2">
          Review escalated cases and manual interventions.
        </p>
      </header>

      <main>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-gray-300">
                <th className="p-4 text-xl font-semibold">Case ID</th>
                <th className="p-4 text-xl font-semibold">Name</th>
                <th className="p-4 text-xl font-semibold">District</th>
                <th className="p-4 text-xl font-semibold">Reason for escalation</th>
                <th className="p-4 text-xl font-semibold">Date</th>
                <th className="p-4 text-xl font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Empty placeholder row */}
              <tr className="border-b hover:bg-gray-100 focus-within:bg-gray-100 transition-colors">
                <td className="p-4 text-lg text-gray-500" colSpan={6} align="center">
                  No cases escalated yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
