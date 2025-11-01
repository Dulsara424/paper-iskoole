import { useState, useEffect } from 'react';
import { supabase, ExamPaper, Purchase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Search, DollarSign, ShoppingCart, Download, Filter } from 'lucide-react';
import { PaymentModal } from './PaymentModal';

export const StudentMarketplace = () => {
  const { profile } = useAuth();
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showPurchased, setShowPurchased] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);

  useEffect(() => {
    fetchPapers();
    fetchPurchases();
  }, []);

  const fetchPapers = async () => {
    const { data, error } = await supabase
      .from('exam_papers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPapers(data);
    }
    setLoading(false);
  };

  const fetchPurchases = async () => {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', profile?.id)
      .eq('status', 'completed');

    if (!error && data) {
      setPurchases(data);
    }
  };

  const isPurchased = (paperId: string) => {
    return purchases.some(p => p.paper_id === paperId);
  };

  const handlePurchase = async (paper: ExamPaper) => {
    setSelectedPaper(paper);
  };

  const completePurchase = async () => {
    if (!selectedPaper) return;

    try {
      const { error } = await supabase
        .from('purchases')
        .insert({
          user_id: profile?.id,
          paper_id: selectedPaper.id,
          amount_paid: selectedPaper.price,
          status: 'completed',
        });

      if (error) throw error;

      await supabase
        .from('exam_papers')
        .update({ download_count: selectedPaper.download_count + 1 })
        .eq('id', selectedPaper.id);

      fetchPurchases();
      fetchPapers();
      setSelectedPaper(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Purchase failed');
    }
  };

  const handleDownload = async (paper: ExamPaper) => {
    if (!isPurchased(paper.id)) {
      alert('Please purchase this paper first');
      return;
    }

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

  const subjects = [...new Set(papers.map(p => p.subject))];
  const grades = [...new Set(papers.map(p => p.grade_level).filter(Boolean))];

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         paper.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         paper.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !filterSubject || paper.subject === filterSubject;
    const matchesGrade = !filterGrade || paper.grade_level === filterGrade;
    const matchesPurchased = !showPurchased || isPurchased(paper.id);

    return matchesSearch && matchesSubject && matchesGrade && matchesPurchased;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Paper Marketplace</h1>
        <p className="text-gray-600">Browse and purchase exam papers</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h2 className="font-semibold text-lg">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search papers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Grades</option>
            {grades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showPurchased}
              onChange={(e) => setShowPurchased(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm">My Papers Only</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPapers.map((paper) => {
          const purchased = isPurchased(paper.id);

          return (
            <div
              key={paper.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                <FileText size={48} className="mb-3" />
                <h3 className="font-bold text-xl mb-2">{paper.title}</h3>
                <div className="flex items-center gap-2 text-blue-100">
                  <DollarSign size={20} />
                  <span className="text-2xl font-bold">{paper.price}</span>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-2 mb-4">
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {paper.description || 'No description available'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {paper.subject}
                    </span>
                    {paper.grade_level && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {paper.grade_level}
                      </span>
                    )}
                    {paper.year && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        {paper.year}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {paper.download_count} downloads
                  </p>
                </div>

                {purchased ? (
                  <button
                    onClick={() => handleDownload(paper)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Download
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(paper)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={18} />
                    Purchase
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPapers.length === 0 && (
        <div className="text-center py-12">
          <FileText size={64} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No papers found</p>
        </div>
      )}

      {selectedPaper && (
        <PaymentModal
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          onSuccess={completePurchase}
        />
      )}
    </div>
  );
};
