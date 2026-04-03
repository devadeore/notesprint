import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Sliders, Layout, Download, FileText, CheckCircle, 
  ChevronRight, Loader2, Trash2, Plus, ArrowUp, ArrowDown, 
  Grid, Monitor, Smartphone, Heart, Zap, Printer, 
  MousePointer2, Edit2, ChevronLeft, Menu, Shield, X, AlertCircle,
  Eraser, Sun, Maximize, Mail, Send, User, MessageSquare
} from 'lucide-react';
import { usePdfProcessor, PDFPage } from './hooks/usePdfProcessor';
import { applyFilters } from './utils/filters';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

const STEPS = [
  { id: 1, name: 'Upload' },
  { id: 2, name: 'Merge' },
  { id: 3, name: 'Preview' },
  { id: 4, name: 'Enhance' },
  { id: 5, name: 'Process' },
  { id: 6, name: 'Download' }
];

export default function App() {
  const [view, setView] = useState('home');
  const [step, setStep] = useState(0); // 0 is landing page
  const [processingProgress, setProcessingProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAds, setShowAds] = useState([
    { id: 1, text: "Your ad could appear here", icon: <Zap size={18} /> },
    { id: 2, text: "Promote your tool here", icon: <AlertCircle size={18} /> }
  ]);
  const { 
    files, pages, setPages, loadFiles, isProcessing, 
    addBlankSlide, removeFile, reorderPages, reorderFiles 
  } = usePdfProcessor();
  
  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsMenuOpen(false); // Close menu on navigation
  }, [view, step]);

  const scrollToSection = (sectionId: string) => {
    if (view !== 'home') {
      setView('home');
      setStep(0);
      // Wait for view to change then scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      setStep(0);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Filters State
  const [filters, setFilters] = useState({
    invert: true,
    grayscale: false,
    cleanBackground: true,
    blackAndWhite: false,
    brightness: 0,
    contrast: 0,
    removeLogo: false,
    quality: 'high'
  });

  // Layout State
  const [layout, setLayout] = useState({
    rows: 3,
    cols: 1,
    orientation: 'p', // p or l
    margin: 10,
    showLines: false,
    addPageNumbers: true
  });

  // Handle processing simulation
  useEffect(() => {
    if (step === 5) {
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep(6);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsInitialLoading(true);
      setUploadProgress(0);
      try {
        await loadFiles(Array.from(e.target.files), (progress) => {
          setUploadProgress(progress);
        });
        setStep(2);
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setIsInitialLoading(false);
      }
    }
  };

  const togglePageSelection = (id: string) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, isSelected: !p.isSelected } : p));
  };

  const generateFinalPdf = async () => {
    const doc = new jsPDF({
      orientation: layout.orientation as any,
      unit: 'mm',
      format: 'a4'
    });

    const selectedPages = pages.filter(p => p.isSelected);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const itemsPerPage = layout.rows * layout.cols;
    let currentIdx = 0;
    let pageNum = 1;

    while (currentIdx < selectedPages.length) {
      if (currentIdx > 0) doc.addPage();

      for (let i = 0; i < itemsPerPage && (currentIdx + i) < selectedPages.length; i++) {
        const pageData = selectedPages[currentIdx + i];
        
        const col = i % layout.cols;
        const row = Math.floor(i / layout.cols);
        
        const cellW = (pageWidth - (layout.margin * 2)) / layout.cols;
        const cellH = (pageHeight - (layout.margin * 2)) / layout.rows;
        
        const x = layout.margin + (col * cellW);
        const y = layout.margin + (row * cellH);

        if (!pageData.isBlank && pageData.originalCanvas) {
          // Apply Filters to a temp canvas
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = pageData.originalCanvas.width;
          tempCanvas.height = pageData.originalCanvas.height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(pageData.originalCanvas, 0, 0);
          applyFilters(tempCanvas, filters);

          doc.addImage(
            tempCanvas.toDataURL('image/jpeg', filters.quality === 'high' ? 0.95 : 0.7),
            'JPEG',
            x + 2, y + 2, cellW - 4, cellH - 4
          );
        }

        if (layout.showLines) {
          doc.setDrawColor(200);
          doc.rect(x, y, cellW, cellH);
        }
      }

      if (layout.addPageNumbers) {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`${pageNum}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      currentIdx += itemsPerPage;
      pageNum++;
    }

    doc.save(`PrintableNotesAI_${new Date().getTime()}.pdf`);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#020203] text-slate-200 font-sans selection:bg-sky-500/30 overflow-x-hidden bg-noise relative">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] bg-sky-500/10 blur-[140px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[140px] rounded-full" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-[20%] left-[10%] w-[50%] h-[50%] bg-purple-500/10 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-blue-400/5 blur-[100px] rounded-full" />
      </div>

      {/* Floating Ad Placeholders */}
      <div className="fixed top-24 right-6 z-[60] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {showAds.map((ad, index) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ delay: index * 0.2, type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto w-72 p-4 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-sky-400 shrink-0">
                  {ad.icon}
                </div>
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">Ad</span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 leading-snug">
                    {ad.text}
                  </p>
                </div>
                <button 
                  onClick={() => setShowAds(prev => prev.filter(a => a.id !== ad.id))}
                  className="absolute top-0 right-0 p-1 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Uploading Overlay */}
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Printer size={32} className="text-sky-400 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-4 w-full max-w-xs">
              <h3 className="text-2xl font-bold text-white tracking-tight">Processing PDF...</h3>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="h-full bg-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold tracking-widest uppercase">
                <span className="text-sky-400">{uploadProgress}%</span>
                <span className="text-slate-500">Optimizing Pages</span>
              </div>
              <p className="text-slate-400 text-sm">Processing large files may take a moment.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50">
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl px-6 h-16 flex items-center justify-between shadow-2xl shadow-black/50">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            role="button" 
            aria-label="Home" 
            onClick={() => { setStep(0); setView('home'); }}
          >
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.3)] group-hover:scale-110 transition-transform">
              <Printer size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">NotesPrintAI</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => { setStep(0); setView('about'); }}
              className={`text-sm font-medium transition-colors ${view === 'about' ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
            >
              About
            </button>
            <div className="relative group">
              <button 
                onClick={() => { setStep(0); setView('tools'); }}
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'tools' ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
              >
                Tools
                <span className="px-1.5 py-0.5 bg-sky-500 text-[10px] font-bold text-white rounded-md leading-none">NEW</span>
              </button>
            </div>
            <button 
              onClick={() => { setStep(0); setView('blog'); }}
              className={`text-sm font-medium transition-colors ${view === 'blog' ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
            >
              Blog
            </button>
            <button 
              onClick={() => { setStep(0); setView('contact'); }}
              className={`text-sm font-medium transition-colors ${view === 'contact' ? 'text-sky-400' : 'text-slate-300 hover:text-white'}`}
            >
              Contact
            </button>
            <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5">
              <Heart size={14} className="text-rose-500" />
              Donate
            </button>
          </div>

          {/* CTA Button */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setStep(0); setView('home'); }}
              className="hidden sm:flex items-center gap-2 px-5 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-sky-400 hover:text-white transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(56,189,248,0.4)]"
            >
              Convert PDF
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors md:hidden" 
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-slate-400" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-40 md:hidden"
          >
            <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-black/50 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => scrollToSection('features')}
                  className="p-6 rounded-2xl border bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 transition-all text-left space-y-2"
                >
                  <Zap size={24} className="text-slate-500" />
                  <div className="font-bold">Features</div>
                </button>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="p-6 rounded-2xl border bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 transition-all text-left space-y-2"
                >
                  <Sliders size={24} className="text-slate-500" />
                  <div className="font-bold">How it Works</div>
                </button>
                <button 
                  onClick={() => { setStep(0); setView('about'); }}
                  className={`p-6 rounded-2xl border transition-all text-left space-y-2 ${view === 'about' ? 'bg-sky-500/20 border-sky-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <Shield size={24} className={view === 'about' ? 'text-sky-400' : 'text-slate-500'} />
                  <div className="font-bold">About</div>
                </button>
                <button 
                  onClick={() => { setStep(0); setView('tools'); }}
                  className={`p-6 rounded-2xl border transition-all text-left space-y-2 ${view === 'tools' ? 'bg-sky-500/20 border-sky-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <Grid size={24} className={view === 'tools' ? 'text-sky-400' : 'text-slate-500'} />
                  <div className="font-bold flex items-center gap-2">
                    Tools
                    <span className="px-1.5 py-0.5 bg-sky-500 text-[8px] font-bold text-white rounded-md leading-none">NEW</span>
                  </div>
                </button>
                <button 
                  onClick={() => { setStep(0); setView('blog'); }}
                  className={`p-6 rounded-2xl border transition-all text-left space-y-2 ${view === 'blog' ? 'bg-sky-500/20 border-sky-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <FileText size={24} className={view === 'blog' ? 'text-sky-400' : 'text-slate-500'} />
                  <div className="font-bold">Blog</div>
                </button>
                <button 
                  onClick={() => { setStep(0); setView('contact'); }}
                  className={`p-6 rounded-2xl border transition-all text-left space-y-2 ${view === 'contact' ? 'bg-sky-500/20 border-sky-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                >
                  <Mail size={24} className={view === 'contact' ? 'text-sky-400' : 'text-slate-500'} />
                  <div className="font-bold">Contact</div>
                </button>
              </div>
              
              <button 
                onClick={() => { setStep(0); setView('home'); }}
                className="w-full py-5 bg-white text-black rounded-2xl font-bold hover:bg-sky-400 hover:text-white transition-all shadow-xl"
              >
                Get Started
              </button>

              <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                <button className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Donate</button>
                <button className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Twitter</button>
                <button className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">GitHub</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent -z-10 pointer-events-none" />
        <AnimatePresence mode="wait">
          {view !== 'home' ? (
            <motion.div
              key="page"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`${(view === 'tools' || view === 'blog') ? 'max-w-6xl' : 'max-w-3xl'} mx-auto py-12 px-4`}
            >
              <button 
                onClick={() => setView('home')}
                className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 group"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </button>

              {view === 'about' && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <h1 className="text-5xl font-bold text-white tracking-tight">About NotesPrintAI</h1>
                    <p className="text-slate-400 text-lg">Empowering students with cleaner, smarter study materials.</p>
                  </div>
                  <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-2xl space-y-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-[80px] rounded-full -z-10 group-hover:bg-sky-500/10 transition-colors" />
                    <p className="text-xl text-slate-200 leading-relaxed font-medium">
                      NotesPrintAI was born from a simple observation: <span className="text-sky-400">classroom PDFs are often hard to read and expensive to print.</span>
                    </p>
                    <div className="space-y-6 text-slate-400 leading-relaxed">
                      <p>
                        Our advanced browser-based processing engine allows you to instantly invert dark backgrounds, enhance text clarity, and optimize layouts. This not only makes your notes more legible but also significantly reduces ink consumption.
                      </p>
                      <p>
                        Whether you're preparing for <span className="text-white font-bold">NEET, JEE</span>, or any competitive exam, our mission is to provide you with the cleanest possible study materials without ever compromising your privacy.
                      </p>
                    </div>
                    <div className="pt-4 flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-2xl">100%</span>
                        <span className="text-slate-500 text-xs uppercase tracking-widest">Private</span>
                      </div>
                      <div className="w-px h-10 bg-white/10" />
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-2xl">0</span>
                        <span className="text-slate-500 text-xs uppercase tracking-widest">Server Uploads</span>
                      </div>
                      <div className="w-px h-10 bg-white/10" />
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-2xl">∞</span>
                        <span className="text-slate-500 text-xs uppercase tracking-widest">Free Forever</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {view === 'tools' && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <h1 className="text-5xl font-bold text-white tracking-tight">Our Tools</h1>
                    <p className="text-slate-400 text-lg">Specialized tools to optimize your study materials.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      {
                        icon: <Eraser size={32} />,
                        title: "PDF Cleaner",
                        desc: "Remove unwanted artifacts, logos, and noise from your scanned PDF documents.",
                        color: "from-sky-500 to-blue-600"
                      },
                      {
                        icon: <Sun size={32} />,
                        title: "Dark to Light",
                        desc: "Instantly invert dark-themed PDFs into clean, white-background documents for printing.",
                        color: "from-amber-400 to-orange-500"
                      },
                      {
                        icon: <Maximize size={32} />,
                        title: "Page Optimizer",
                        desc: "Automatically adjust margins and scale content for the perfect A4 print layout.",
                        color: "from-emerald-400 to-teal-500"
                      }
                    ].map((tool, i) => (
                      <div key={i} className="group p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-2xl hover:bg-white/10 hover:border-sky-500/30 transition-all hover:-translate-y-2 shadow-2xl flex flex-col items-center text-center gap-6">
                        <div className={`w-20 h-20 bg-gradient-to-tr ${tool.color} rounded-[1.5rem] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                          {tool.icon}
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-bold text-white tracking-tight">{tool.title}</h3>
                          <p className="text-slate-400 leading-relaxed">{tool.desc}</p>
                        </div>
                        <button 
                          onClick={() => { setStep(0); setView('home'); }}
                          className="mt-auto w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white hover:text-black transition-all active:scale-95"
                        >
                          Use Tool
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'blog' && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <h1 className="text-5xl font-bold text-white tracking-tight">Blog</h1>
                    <p className="text-slate-400 text-lg">Latest tips and guides for students and educators.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      {
                        title: "How to Convert Dark PDFs to Printable Notes",
                        desc: "Learn the step-by-step process of inverting dark-themed lecture notes into clean, white-background documents that are easy on your eyes and your printer ink.",
                        date: "April 1, 2026",
                        readTime: "5 min read"
                      },
                      {
                        title: "Best Way to Print Coaching Notes Clearly",
                        desc: "Discover how to optimize scanned coaching materials for maximum clarity. We cover contrast adjustment, noise removal, and layout optimization for NEET & JEE aspirants.",
                        date: "March 28, 2026",
                        readTime: "4 min read"
                      }
                    ].map((post, i) => (
                      <div key={i} className="group p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-2xl hover:bg-white/10 hover:border-sky-500/30 transition-all shadow-2xl flex flex-col gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 text-xs font-bold tracking-widest uppercase text-sky-400">
                            <span>{post.date}</span>
                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                            <span className="text-slate-500">{post.readTime}</span>
                          </div>
                          <h2 className="text-2xl font-bold text-white tracking-tight group-hover:text-sky-400 transition-colors leading-tight">
                            {post.title}
                          </h2>
                          <p className="text-slate-400 leading-relaxed">
                            {post.desc}
                          </p>
                        </div>
                        <button className="mt-auto flex items-center gap-2 text-white font-bold hover:text-sky-400 transition-colors group/btn">
                          Read More
                          <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === 'contact' && (
                <div className="space-y-12 max-w-4xl mx-auto">
                  <div className="text-center space-y-4">
                    <h1 className="text-5xl font-bold text-white tracking-tight">Get in Touch</h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                      Have a question or feedback? We'd love to hear from you. 
                      <span className="block text-sky-400 font-medium mt-2">We usually respond within 24 hours.</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                    {/* Contact Info */}
                    <div className="md:col-span-2 space-y-6">
                      <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-2xl space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[40px] rounded-full -z-10" />
                        
                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 shrink-0">
                              <Mail size={24} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email Us</div>
                              <a href="mailto:noteprintai@gmail.com" className="text-lg text-white font-bold hover:text-sky-400 transition-colors">
                                noteprintai@gmail.com
                              </a>
                            </div>
                          </div>

                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                              <MessageSquare size={24} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Support</div>
                              <p className="text-slate-400 text-sm leading-relaxed">
                                For technical issues, please include your browser and OS details.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                  {String.fromCharCode(64 + i)}
                                </div>
                              ))}
                            </div>
                            <span className="text-xs text-slate-500 font-medium">Joined by 2k+ students</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Form */}
                    <div className="md:col-span-3">
                      <form className="p-8 md:p-10 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-2xl space-y-6 shadow-2xl" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 ml-1 flex items-center gap-2">
                              <User size={14} />
                              Your Name
                            </label>
                            <input 
                              type="text" 
                              placeholder="John Doe"
                              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 ml-1 flex items-center gap-2">
                              <Mail size={14} />
                              Email Address
                            </label>
                            <input 
                              type="email" 
                              placeholder="john@example.com"
                              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 ml-1 flex items-center gap-2">
                              <MessageSquare size={14} />
                              Message
                            </label>
                            <textarea 
                              rows={4}
                              placeholder="How can we help you?"
                              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all resize-none"
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-400 transition-all active:scale-[0.98] shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 group"
                        >
                          Send Message
                          <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {view === 'privacy' && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <h1 className="text-5xl font-bold text-white tracking-tight">Privacy Policy</h1>
                    <p className="text-slate-400 text-lg">Your privacy is our top priority. Here's how we protect it.</p>
                  </div>
                  <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-2xl space-y-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-[80px] rounded-full -z-10 group-hover:bg-sky-500/10 transition-colors" />
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400">
                          <Shield size={20} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Data Collection</h3>
                      </div>
                      <p className="text-slate-400 text-lg leading-relaxed">
                        NotesPrintAI is built on a <span className="text-white font-bold">privacy-first architecture.</span> We do not collect, store, or transmit any personal data or the contents of your PDF files to our servers.
                      </p>
                    </div>
                    <div className="w-full h-px bg-white/10" />
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                          <Zap size={20} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Browser-Based Processing</h3>
                      </div>
                      <p className="text-slate-400 text-lg leading-relaxed">
                        All PDF transformations, including background inversion and text enhancement, happen <span className="text-white font-bold">entirely within your web browser.</span> Your files never leave your device.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {view === 'terms' && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <h1 className="text-5xl font-bold text-white tracking-tight">Terms of Service</h1>
                    <p className="text-slate-400 text-lg">Simple terms for a simple service.</p>
                  </div>
                  <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-2xl space-y-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full -z-10 group-hover:bg-purple-500/10 transition-colors" />
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                          <FileText size={20} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Usage Policy</h3>
                      </div>
                      <p className="text-slate-400 text-lg leading-relaxed">
                        NotesPrintAI is provided as a free tool for personal and educational use. You are responsible for ensuring you have the right to process the PDF files you upload.
                      </p>
                    </div>
                    <div className="w-full h-px bg-white/10" />
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400">
                          <Shield size={20} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Disclaimer</h3>
                      </div>
                      <p className="text-slate-400 text-lg leading-relaxed">
                        The service is provided "as is" without any warranties. While we strive for the highest quality output, we are not responsible for any data loss or printing issues.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              {/* Landing Page */}
              {step === 0 && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto px-4 text-center space-y-12 py-10 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent -z-20 pointer-events-none" />
              <div className="space-y-12 relative">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-full h-full bg-sky-500/10 blur-[120px] rounded-full -z-10" />
                <div className="flex flex-col items-center gap-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-full text-sky-400 text-sm font-medium backdrop-blur-md shadow-[0_0_20px_rgba(56,189,248,0.15)] animate-pulse">
                    🛡️ Safe & Secured • 100% Private 🔒
                  </div>
                </div>

                <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tight leading-[1.05] text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]">
                  Convert Dark PDF Notes <br />
                  <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(56,189,248,0.5)]">
                    For Easy Printing
                  </span>
                </h1>

                <div className="space-y-6 max-w-4xl mx-auto">
                  <p className="text-slate-200 text-xl md:text-2xl font-medium leading-relaxed tracking-wide">
                    Transform dark-background lecture notes into clean, ink-saving PDFs. <br className="hidden md:block" />
                    Perfect for <span className="text-sky-400 font-bold">NEET & JEE</span> preparation.
                  </p>
                  <p className="text-slate-500 text-xs md:text-sm font-semibold tracking-[0.2em] uppercase opacity-80">
                    No uploads to servers. Everything runs securely in your browser.
                  </p>
                </div>

                <div className="pt-12">
                  <label className="relative inline-flex items-center gap-4 px-14 py-7 bg-white text-black rounded-[2.5rem] font-bold shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_30px_rgba(255,255,255,0.1)] hover:bg-sky-400 hover:text-white hover:scale-[1.05] transition-all cursor-pointer group overflow-hidden active:scale-95">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <input type="file" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
                    <Upload size={26} className="relative z-10" />
                    <span className="relative z-10 text-2xl">Select PDF Files</span>
                    <ChevronRight size={26} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </label>
                </div>
              </div>

              <div className="relative rounded-[4rem] overflow-hidden border border-white/10 bg-white/5 backdrop-blur-3xl aspect-video flex items-center justify-center group shadow-[0_0_120px_rgba(56,189,248,0.15)] max-w-5xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 via-transparent to-indigo-500/20 z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=2070" 
                  alt="Professional Workspace" 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 z-20" />
                <div className="absolute z-30 flex items-center gap-8">
                   <motion.div 
                     initial={{ x: -20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: 0.5 }}
                     className="w-24 h-32 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center shadow-2xl"
                   >
                      <Monitor className="text-sky-400/60" size={40} />
                   </motion.div>
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ delay: 0.7 }}
                     className="w-20 h-20 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.5)]"
                   >
                      <Printer className="text-white" size={36} />
                   </motion.div>
                   <motion.div 
                     initial={{ x: 20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ delay: 0.9 }}
                     className="w-24 h-32 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex flex-col gap-3 p-3 shadow-2xl"
                   >
                      <div className="h-2 w-full bg-sky-400/20 rounded-full" />
                      <div className="h-2 w-4/5 bg-sky-400/20 rounded-full" />
                      <div className="h-2 w-3/4 bg-sky-400/20 rounded-full" />
                      <div className="mt-auto h-10 w-full bg-sky-500/10 rounded-xl border border-sky-500/20" />
                   </motion.div>
                </div>
              </div>

              <div id="how-it-works" className="space-y-16 py-20">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">How It Works</h2>
                  <p className="text-slate-400 max-w-2xl mx-auto">Three simple steps to transform your study materials into high-quality printable notes.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { 
                      icon: <Upload className="text-sky-400" />, 
                      bg: "bg-sky-500/10",
                      title: '1. Upload PDF', 
                      desc: 'Securely select your classroom PDFs. Processing happens entirely in your browser.' 
                    },
                    { 
                      icon: <Sliders className="text-indigo-400" />, 
                      bg: "bg-indigo-500/10",
                      title: '2. Enhance', 
                      desc: 'Invert backgrounds, enhance text, and optimize layouts for efficient printing.' 
                    },
                    { 
                      icon: <Download className="text-purple-400" />, 
                      bg: "bg-purple-500/10",
                      title: '3. Download', 
                      desc: 'Get your clean, ink-saving PDF ready for high-quality printing instantly.' 
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center gap-8 p-12 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] hover:bg-white/10 hover:border-sky-500/30 transition-all group shadow-2xl hover:-translate-y-2">
                      <div className={`w-24 h-24 ${item.bg} rounded-[2.5rem] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner`}>
                        {React.cloneElement(item.icon as React.ReactElement, { size: 40 })}
                      </div>
                      <div className="space-y-4">
                        <h3 className="font-bold text-white text-3xl tracking-tight">{item.title}</h3>
                        <div className="text-lg text-slate-400 leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="features" className="space-y-12 py-20">
                <h2 className="text-4xl font-bold text-white tracking-tight">Why PRINTABLE NOTES AI?</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    'Lightning Fast', 'Privacy First', 'Ink Saver', 
                    'No Install', 'Eco-Friendly', 'Always Free'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-5 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl hover:border-sky-500/30 transition-colors">
                      <div className="w-6 h-6 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400">
                        <CheckCircle size={14} />
                      </div>
                      <span className="text-sm font-semibold text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Workflow Steps */}
          {step > 0 && step < 7 && (
            <motion.div 
              key="workflow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-5xl mx-auto px-4 space-y-8"
            >
              {/* Progress Stepper */}
              <div className="flex justify-between items-center max-w-md mx-auto relative px-4">
                <div className="absolute h-0.5 bg-white/5 w-full top-1/2 -translate-y-1/2 left-0 z-0" />
                {STEPS.map((s) => (
                  <div 
                    key={s.id} 
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 backdrop-blur-md border ${
                      step >= s.id ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/40' : 'bg-white/5 border-white/10 text-slate-500'
                    }`}
                  >
                    {step > s.id ? <CheckCircle size={16} /> : s.id}
                    {step === s.id && (
                      <div className="absolute -inset-1.5 border-2 border-sky-500 rounded-full animate-ping opacity-20" />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-[60vh]">
                {/* Step 1: Upload Files */}
                {step === 1 && (
                  <div className="text-center space-y-8 py-12">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold text-white">Upload Files</h2>
                      <p className="text-slate-400">Select PDF files from your device to begin processing.</p>
                    </div>
                    
                    <div className="max-w-xl mx-auto p-12 border border-white/10 rounded-[3rem] bg-white/5 backdrop-blur-2xl hover:bg-white/10 transition-all relative group shadow-2xl">
                      <input type="file" multiple accept=".pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="space-y-6 relative z-0">
                        <div className="w-24 h-24 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto text-white shadow-xl group-hover:scale-110 transition-transform">
                          {isProcessing ? <Loader2 className="animate-spin" size={36} /> : <Upload size={36} />}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-bold text-white">
                            {isProcessing ? 'Reading Documents...' : 'Drop your PDFs here'}
                          </p>
                          <p className="text-sm text-slate-400">
                            {isProcessing ? 'Optimizing for liquid glass processing' : 'Select multiple files to merge and enhance'}
                          </p>
                        </div>
                        <button className="px-10 py-3 bg-white/10 border border-white/10 rounded-2xl font-bold text-white hover:bg-white/20 transition-all">
                          {isProcessing ? 'Processing...' : 'Browse Files'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-slate-500 text-xs font-medium tracking-widest uppercase">
                      Upload • Process • Watch Ad • Download
                    </div>
                  </div>
                )}

                {/* Step 2: Reorder & Merge */}
                {step === 2 && (
                  <div className="space-y-8 py-12">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold text-white">Reorder & Merge</h2>
                      <p className="text-slate-400">Rearrange your documents in the desired order before merging.</p>
                    </div>

                    <div className="max-w-2xl mx-auto space-y-3">
                      {files.map((file, i) => (
                        <div key={file.id} className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-slate-400">
                            {i + 1}
                          </div>
                          <FileText className="text-sky-400" size={24} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white truncate">{file.name}</div>
                            <div className="text-xs text-slate-500">{formatSize(file.size)} • {file.pageCount} Pages</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => reorderFiles(i, i - 1)}
                              disabled={i === 0}
                              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 disabled:opacity-20"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button 
                              onClick={() => reorderFiles(i, i + 1)}
                              disabled={i === files.length - 1}
                              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 disabled:opacity-20"
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button onClick={() => removeFile(file.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}

                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/5 rounded-2xl text-sky-400 hover:bg-white/5 transition-colors cursor-pointer font-bold">
                        <input type="file" multiple accept=".pdf" onChange={handleFileUpload} className="hidden" />
                        <Plus size={20} /> Add More PDFs
                      </label>
                    </div>

                    <div className="flex justify-center pt-8">
                      <button onClick={() => setStep(3)} className="px-12 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl font-bold text-white shadow-xl hover:bg-white/20 transition-all flex items-center gap-2">
                        Continue <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Preview and Edit Pages */}
                {step === 3 && (
                  <div className="space-y-8 py-12">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold text-white">Preview and Edit Pages</h2>
                      <p className="text-slate-400">Tap a page to select or deselect. Deselected pages will be removed from final PDF.</p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                      <div className="bg-yellow-400 text-black rounded-2xl p-6 text-lg font-black text-center mb-8 shadow-[0_0_30px_rgba(250,204,21,0.3)] border-4 border-yellow-500 animate-pulse">
                        Tap a page to select or deselect. Deselected pages will be removed from final PDF.
                      </div>

                      <div className="flex justify-center gap-4 mb-8">
                        <button 
                          onClick={() => setIsReorderMode(!isReorderMode)}
                          className={`flex items-center gap-2 px-6 py-2 border rounded-xl text-sm font-bold transition-all ${
                            isReorderMode 
                              ? 'bg-sky-500 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          <Sliders size={16} /> {isReorderMode ? 'Finish Reordering' : 'Reorder Slide'}
                        </button>
                        <button onClick={() => addBlankSlide(pages.length - 1)} className="flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/5 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors text-slate-300">
                          <Plus size={16} /> Add Blank Slide
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {pages.map((page, i) => (
                          <div 
                            key={page.id} 
                            onClick={() => togglePageSelection(page.id)}
                            className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                              page.isSelected 
                                ? 'border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.2)] scale-100' 
                                : 'border-red-500/50 opacity-60 scale-95 grayscale'
                            }`}
                          >
                            {page.isBlank ? (
                              <div className="w-full h-full bg-slate-800/50 backdrop-blur-sm flex items-center justify-center text-slate-500 font-bold text-xs">
                                BLANK PAGE
                              </div>
                            ) : (
                              <img src={page.url} alt={`PDF Page ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            )}
                            
                            {/* Deletion / Selection Indicator */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${page.isSelected ? 'opacity-0' : 'opacity-100 bg-red-500/10'}`}>
                              <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
                                <Trash2 size={20} />
                              </div>
                            </div>

                            <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              {page.isSelected ? <CheckCircle size={14} className="text-sky-400" /> : <Plus size={14} />}
                            </div>
                            
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded-md text-[10px] font-bold text-white border border-white/10">
                              PAGE {i + 1}
                            </div>

                            {isReorderMode && (
                              <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-md p-2 flex justify-between items-center z-30 border-t border-white/10">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); reorderPages(i, i - 1); }}
                                  disabled={i === 0}
                                  className="p-1.5 hover:bg-sky-500 rounded-lg disabled:opacity-20 transition-colors text-white"
                                >
                                  <ArrowUp size={16} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); reorderPages(i, i + 1); }}
                                  disabled={i === pages.length - 1}
                                  className="p-1.5 hover:bg-sky-500 rounded-lg disabled:opacity-20 transition-colors text-white"
                                >
                                  <ArrowDown size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col items-center gap-4 pt-12">
                        <div className="text-slate-500 font-medium">{pages.filter(p => p.isSelected).length} of {pages.length} pages selected</div>
                        <button onClick={() => setStep(4)} className="px-12 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl font-bold text-white shadow-xl hover:bg-white/20 transition-all flex items-center gap-2">
                          Continue <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Enhance Document */}
                {step === 4 && (
                  <div className="space-y-8 py-12">
                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-bold text-white">Enhance Document</h2>
                      <p className="text-slate-400">Apply filters to improve quality and customize layout.</p>
                    </div>

                    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Controls */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">File Size</div>
                            <div className="font-bold text-white">{formatSize(files.reduce((acc, f) => acc + f.size, 0))}</div>
                          </div>
                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pages</div>
                            <div className="font-bold text-white">{pages.length}</div>
                          </div>
                          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Removed</div>
                            <div className="font-bold text-white">{pages.filter(p => !p.isSelected).length}</div>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                          <h3 className="font-bold text-white text-lg">Filters</h3>
                          <div className="space-y-4">
                            {[
                              { id: 'invert', label: 'Invert Colors', desc: 'Dark to light', checked: filters.invert },
                              { id: 'cleanBackground', label: 'Clear PDF Background', desc: 'Remove background noise', checked: filters.cleanBackground },
                              { id: 'grayscale', label: 'Grayscale', desc: 'Shades of gray', checked: filters.grayscale },
                              { id: 'blackAndWhite', label: 'Black & White', desc: 'Pure black & white', checked: filters.blackAndWhite }
                            ].map(f => (
                              <label key={f.id} className="flex items-center justify-between cursor-pointer group">
                                <div>
                                  <div className="font-bold text-white group-hover:text-sky-400 transition-colors">{f.label}</div>
                                  <div className="text-xs text-slate-500">{f.desc}</div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-colors ${f.checked ? 'bg-sky-500' : 'bg-slate-700'}`}>
                                  <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={f.checked} 
                                    onChange={(e) => setFilters({...filters, [f.id]: e.target.checked})}
                                  />
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${f.checked ? 'left-7' : 'left-1'}`} />
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                          <h3 className="font-bold text-white text-lg">Remove Logo</h3>
                          <label className="flex items-center justify-between cursor-pointer">
                            <div className="text-sm font-medium text-slate-300">Enable Logo Removal</div>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${filters.removeLogo ? 'bg-sky-500' : 'bg-slate-700'}`}>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={filters.removeLogo} 
                                onChange={(e) => setFilters({...filters, removeLogo: e.target.checked})}
                              />
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${filters.removeLogo ? 'left-7' : 'left-1'}`} />
                            </div>
                          </label>
                          <p className="text-xs text-slate-500 italic">Select region to remove (Placeholder)</p>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                          <h3 className="font-bold text-white text-lg">Output Quality</h3>
                          <div className="flex gap-4">
                            {['low', 'medium', 'high'].map(q => (
                              <label key={q} className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="quality" 
                                  className="hidden" 
                                  checked={filters.quality === q}
                                  onChange={() => setFilters({...filters, quality: q})}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${filters.quality === q ? 'border-sky-500' : 'border-slate-700'}`}>
                                  {filters.quality === q && <div className="w-2 h-2 bg-sky-500 rounded-full" />}
                                </div>
                                <span className="text-sm font-medium capitalize">{q}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Layout */}
                      <div className="space-y-6">
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                          <h3 className="font-bold text-white text-lg">Orientation</h3>
                          <div className="flex gap-4">
                            {[
                              { id: 'p', label: 'Portrait' },
                              { id: 'l', label: 'Landscape' }
                            ].map(o => (
                              <label key={o.id} className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="orientation" 
                                  className="hidden" 
                                  checked={layout.orientation === o.id}
                                  onChange={() => setLayout({...layout, orientation: o.id})}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${layout.orientation === o.id ? 'border-sky-500' : 'border-slate-700'}`}>
                                  {layout.orientation === o.id && <div className="w-2 h-2 bg-sky-500 rounded-full" />}
                                </div>
                                <span className="text-sm font-medium">{o.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                          <h3 className="font-bold text-white text-lg">Slides per Page</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs text-slate-500 uppercase tracking-wider">Rows</label>
                              <select 
                                value={layout.rows} 
                                onChange={(e) => setLayout({...layout, rows: parseInt(e.target.value)})}
                                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                              >
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs text-slate-500 uppercase tracking-wider">Columns</label>
                              <select 
                                value={layout.cols} 
                                onChange={(e) => setLayout({...layout, cols: parseInt(e.target.value)})}
                                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                              >
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                          <h3 className="font-bold text-white text-lg">Add Separation Lines</h3>
                          <div className="flex gap-4">
                            {[
                              { id: false, label: 'No' },
                              { id: true, label: 'Yes' }
                            ].map(l => (
                              <label key={String(l.id)} className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="lines" 
                                  className="hidden" 
                                  checked={layout.showLines === l.id}
                                  onChange={() => setLayout({...layout, showLines: l.id as boolean})}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${layout.showLines === l.id ? 'border-sky-500' : 'border-slate-700'}`}>
                                  {layout.showLines === l.id && <div className="w-2 h-2 bg-sky-500 rounded-full" />}
                                </div>
                                <span className="text-sm font-medium">{l.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                          <h3 className="font-bold text-white text-lg">Layout Preview</h3>
                          <div className="aspect-[3/4] max-w-[120px] mx-auto bg-white/10 rounded-lg p-2 grid gap-1" style={{
                            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`
                          }}>
                            {Array.from({ length: layout.rows * layout.cols }).map((_, i) => (
                              <div key={i} className="bg-sky-500/20 rounded-sm border border-sky-500/30" />
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                          <h3 className="font-bold text-white text-lg">Add Page Numbers</h3>
                          <div className="flex gap-4">
                            {[
                              { id: false, label: 'No' },
                              { id: true, label: 'Yes' }
                            ].map(n => (
                              <label key={String(n.id)} className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="numbers" 
                                  className="hidden" 
                                  checked={layout.addPageNumbers === n.id}
                                  onChange={() => setLayout({...layout, addPageNumbers: n.id as boolean})}
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${layout.addPageNumbers === n.id ? 'border-sky-500' : 'border-slate-700'}`}>
                                  {layout.addPageNumbers === n.id && <div className="w-2 h-2 bg-sky-500 rounded-full" />}
                                </div>
                                <span className="text-sm font-medium">{n.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button onClick={() => setStep(3)} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                            <ChevronLeft size={20} /> Back
                          </button>
                          <button onClick={() => setStep(5)} className="flex-[2] py-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl font-bold text-white shadow-xl shadow-sky-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                            <Zap size={20} /> Process File
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Processing Document */}
                {step === 5 && (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full -rotate-90">
                        <circle 
                          cx="96" cy="96" r="88" 
                          fill="none" stroke="currentColor" strokeWidth="8" 
                          className="text-white/5"
                        />
                        <circle 
                          cx="96" cy="96" r="88" 
                          fill="none" stroke="currentColor" strokeWidth="8" 
                          strokeDasharray={552.92}
                          strokeDashoffset={552.92 - (552.92 * processingProgress) / 100}
                          className="text-sky-500 transition-all duration-300 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-sky-500/40">
                          <Printer size={40} className="text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="text-center space-y-6 w-full max-w-md">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-white">Processing Document</h2>
                        <p className="text-slate-400">Please wait while we enhance your PDF.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sky-400 font-bold text-xl animate-pulse">Optimizing...</div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-sky-500 transition-all duration-300" 
                            style={{ width: `${processingProgress}%` }} 
                          />
                        </div>
                        <div className="text-xs text-slate-500">Transforming pages into enhanced notes...</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Success! */}
                {step === 6 && (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 py-12">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40">
                      <CheckCircle size={48} className="text-white" />
                    </div>

                    <div className="text-center space-y-4">
                      <h2 className="text-4xl font-extrabold text-white">Success!</h2>
                      <p className="text-slate-400 max-w-md mx-auto">
                        Your document is ready! Download cleanly formatted notes.
                      </p>
                    </div>

                    <div className="w-full max-w-md space-y-4">
                      <button className="w-full py-4 bg-white/5 border border-white/5 rounded-2xl font-bold text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-3">
                        <Smartphone size={20} className="text-sky-400" />
                        Support Us by Watching a Short Ad
                      </button>
                      
                      <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400">
                            <FileText size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-white">Enhanced PDF</div>
                            <div className="text-xs text-slate-500">Ready for download</div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={generateFinalPdf}
                          className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl font-bold text-white shadow-xl shadow-sky-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"
                        >
                          <Zap size={20} />
                          Watch Ad to Download
                        </button>
                      </div>
                    </div>

                    <button onClick={() => setStep(0)} className="text-slate-500 hover:text-white transition-colors text-sm font-medium">
                      Start New Project
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  </main>

      {/* Footer */}
      <footer className="w-full bg-gradient-to-b from-transparent to-black/40 border-t border-white/5 pt-16 pb-8 px-6 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Column 1: PRODUCT */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em]">Product</h4>
            <ul className="space-y-3">
              <li><button onClick={() => scrollToSection('features')} className="text-slate-500 hover:text-sky-400 text-sm transition-colors duration-300">Features</button></li>
              <li><button onClick={() => scrollToSection('how-it-works')} className="text-slate-500 hover:text-sky-400 text-sm transition-colors duration-300">How it Works</button></li>
            </ul>
          </div>

          {/* Column 2: COMPANY */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em]">Company</h4>
            <ul className="space-y-3">
              <li><button onClick={() => setView('about')} className="text-slate-500 hover:text-sky-400 text-sm transition-colors duration-300">About Us</button></li>
              <li><button onClick={() => setView('contact')} className="text-slate-500 hover:text-sky-400 text-sm transition-colors duration-300">Contact Us</button></li>
            </ul>
          </div>

          {/* Column 3: LEGAL */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em]">Legal</h4>
            <ul className="space-y-3">
              <li><button onClick={() => setView('privacy')} className="text-slate-500 hover:text-sky-400 text-sm transition-colors duration-300">Privacy Policy</button></li>
              <li><button onClick={() => setView('terms')} className="text-slate-500 hover:text-sky-400 text-sm transition-colors duration-300">Terms of Service</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 text-center">
          <p className="text-slate-600 text-[10px] font-medium tracking-widest uppercase">
            © 2026 NotesPrintAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
