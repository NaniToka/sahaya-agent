import fs from 'fs/promises';
import path from 'path';

interface SchemeRule {
  id: string;
  field: string;
  operator: string;
  value: any;
  explanation_en: string;
  explanation_ml: string;
  citation: string;
  requires_human_review?: boolean;
}

interface SchemeDocument {
  name_en: string;
  name_ml: string;
  citation: string;
}

interface Scheme {
  id: string;
  name_en: string;
  name_ml: string;
  description_en: string;
  benefit: string;
  source: {
    document_title: string;
    issuing_authority: string;
    date_version: string;
  };
  eligibility_criteria: SchemeRule[];
  required_documents: SchemeDocument[];
  how_to_apply: string;
  verified: boolean;
}

export default async function RulesPage() {
  const filePath = path.join(process.cwd(), 'data', 'schemes.json');
  let schemes: Scheme[] = [];
  let errorMsg = '';
  
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    schemes = JSON.parse(fileContents);
  } catch (err: any) {
    errorMsg = `Error loading schemes: ${err.message}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-2">Schemes Rulebook</h1>
        <p className="text-xl text-gray-700">Database of rules and eligibility criteria for verification.</p>
      </header>

      {errorMsg && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8" role="alert">
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-12">
        {schemes.map(scheme => (
          <section key={scheme.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            {/* Scheme Header */}
            <div className="bg-blue-800 text-white p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{scheme.name_en}</h2>
                <h3 className="text-lg text-blue-200 mb-2">{scheme.name_ml}</h3>
                <p className="text-blue-100">{scheme.description_en}</p>
              </div>
              <div className="flex-shrink-0 ml-4">
                {scheme.verified ? (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-800">
                    ✓ VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
                    ⚠️ NOT VERIFIED
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-100 p-4 rounded-xl">
                  <h4 className="font-bold text-gray-700 mb-1 uppercase text-xs tracking-wider">Benefit</h4>
                  <p className="text-lg">{scheme.benefit}</p>
                </div>
                <div className="bg-gray-100 p-4 rounded-xl">
                  <h4 className="font-bold text-gray-700 mb-1 uppercase text-xs tracking-wider">Source Document</h4>
                  <p className="font-semibold">{scheme.source.document_title}</p>
                  <p className="text-sm text-gray-600">{scheme.source.issuing_authority} • {scheme.source.date_version}</p>
                </div>
              </div>

              {/* Rules Table */}
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">Eligibility Rules</h3>
              <div className="overflow-x-auto mb-8 rounded-xl border border-gray-300">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/4">Field / Logic</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/3">Explanation (En/Ml)</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-1/3">Citation & Exact Quote</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-12">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scheme.eligibility_criteria.map((rule, idx) => (
                      <tr key={rule.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4">
                          <div className="font-mono text-sm text-blue-700 font-semibold mb-1">{rule.field}</div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                            {rule.operator}
                          </div>
                          <div className="mt-1 text-sm font-medium">
                            {Array.isArray(rule.value) ? `[${rule.value.join(', ')}]` : String(rule.value)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 mb-2 font-medium">{rule.explanation_en}</div>
                          <div className="text-sm text-gray-600 font-serif">{rule.explanation_ml}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-800 italic bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 shadow-inner">
                            {rule.citation}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {rule.requires_human_review && (
                            <span className="inline-flex items-center justify-center p-2 rounded-full bg-red-100 text-red-800" title="Requires Human Review (Ambiguous)">
                              👤
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Documents and Application */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">Required Documents</h3>
                  <ul className="space-y-3">
                    {scheme.required_documents.map((doc, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-500 mr-2">📄</span>
                        <div>
                          <div className="font-semibold text-gray-800">{doc.name_en}</div>
                          <div className="text-xs text-gray-500">{doc.citation}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">How to Apply</h3>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-900 text-sm leading-relaxed">
                    {scheme.how_to_apply}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
