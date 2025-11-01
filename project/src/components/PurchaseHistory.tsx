import { useState, useEffect } from 'react';
import { supabase, Purchase, ExamPaper } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download, Calendar, DollarSign } from 'lucide-react';

type PurchaseWithPaper = Purchase & {
  exam_papers: ExamPaper;
};

export const PurchaseHistory = () => {
  const { profile } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithPaper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        exam_papers (*)
      `)
      .eq('user_id', profile?.id)
      .eq('status', 'completed')
      .order('purchased_at', { ascending: false });

    if (!error && data) {
      setPurchases(data as PurchaseWithPaper[]);
    }
    setLoading(false);
  };

  const handleDownload = async (paper: ExamPaper) => {
    try {
      const fileName = paper.file_url.split('/').pop();
      if (!fileName) throw new Error('Invalid file URL');

      const { data, error } = await supabase.storage
        .from('exam-papers')
        .download(fileName);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paper.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Purchase History</h1>

      {purchases.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <FileText size={64} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No purchases yet</p>
          <p className="text-gray-500 text-sm mt-2">Browse the marketplace to find exam papers</p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4 flex-1">
                  <div className="bg-blue-100 rounded-lg p-3">
                    <FileText className="text-blue-600" size={32} />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-900 mb-2">
                      {purchase.exam_papers.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {purchase.exam_papers.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(purchase.purchased_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />
                        {purchase.amount_paid}
                      </span>
                      <span>Subject: {purchase.exam_papers.subject}</span>
                      {purchase.exam_papers.grade_level && (
                        <span>Grade: {purchase.exam_papers.grade_level}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(purchase.exam_papers)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ml-4"
                >
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Total Purchases</h3>
        <p className="text-2xl font-bold text-blue-600">
          {purchases.length} {purchases.length === 1 ? 'paper' : 'papers'}
        </p>
        <p className="text-sm text-blue-700 mt-1">
          Total spent: ${purchases.reduce((sum, p) => sum + parseFloat(p.amount_paid.toString()), 0).toFixed(2)}
        </p>
      </div>
    </div>
  );
};
