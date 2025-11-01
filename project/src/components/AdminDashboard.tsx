import { useState, useEffect } from 'react';
import { supabase, ExamPaper } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, FileText, DollarSign, Trash2 } from 'lucide-react';

export const AdminDashboard = () => {
  const { profile } = useAuth();
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade_level: '',
    year: new Date().getFullYear(),
    price: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    const { data, error } = await supabase
      .from('exam_papers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPapers(data);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please select a PDF file');
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('exam-papers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exam-papers')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('exam_papers')
        .insert({
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          grade_level: formData.grade_level,
          year: parseInt(formData.year.toString()),
          price: parseFloat(formData.price),
          file_url: publicUrl,
          uploaded_by: profile?.id,
        });

      if (insertError) throw insertError;

      setSuccess('Exam paper uploaded successfully!');
      setFormData({
        title: '',
        description: '',
        subject: '',
        grade_level: '',
        year: new Date().getFullYear(),
        price: '',
      });
      setFile(null);
      fetchPapers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('exam-papers').remove([fileName]);
      }

      const { error } = await supabase
        .from('exam_papers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchPapers();
      setSuccess('Paper deleted successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete paper');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Upload size={24} />
          Upload New Exam Paper
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grade Level
              </label>
              <input
                type="text"
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center gap-2"
          >
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Upload Paper'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Uploaded Papers ({papers.length})</h2>
        <div className="space-y-4">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <FileText className="text-blue-600 mt-1" size={24} />
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{paper.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{paper.description}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        <span>Subject: {paper.subject}</span>
                        {paper.grade_level && <span>Grade: {paper.grade_level}</span>}
                        {paper.year && <span>Year: {paper.year}</span>}
                        <span className="flex items-center gap-1">
                          <DollarSign size={14} />
                          {paper.price}
                        </span>
                        <span>Downloads: {paper.download_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(paper.id, paper.file_url)}
                  className="text-red-600 hover:text-red-700 p-2"
                  title="Delete paper"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
