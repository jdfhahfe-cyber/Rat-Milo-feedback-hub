import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { 
  MessageSquare, 
  Lock, 
  LogOut, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Star, 
  Send,
  Calendar,
  User,
  ShieldCheck,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Classification, Review, OperationType, FirestoreErrorInfo } from './types';

// Error Handler as per Firebase Instructions
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'review' | 'admin'>('review');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [passkey, setPasskey] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // If signed in as admin, bypass passkey or auto-unlock
      if (u?.email === 'jdfhahfe@gmail.com') {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('ratoMiloAdminAuth', 'true');
      }
    });
    return () => unsubscribe();
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    visitorName: '',
    visitDate: new Date().toISOString().split('T')[0],
    classification: '' as Classification | '',
    rating: 0,
    type: '',
    details: ''
  });

  // Check Local Auth
  useEffect(() => {
    const isAuth = sessionStorage.getItem('ratoMiloAdminAuth') === 'true';
    if (isAuth) setIsAdminAuthenticated(true);
    
    // Initial connection test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Real-time listener for admin
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const q = query(collection(db, 'reviews'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    return () => unsubscribe();
  }, [isAdminAuthenticated]);

  const handleAdminAuth = () => {
    if (passkey === 'rat123') {
      sessionStorage.setItem('ratoMiloAdminAuth', 'true');
      setIsAdminAuthenticated(true);
      setPasskey('');
    } else {
      alert('Access Denied: Invalid Passkey.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('ratoMiloAdminAuth');
    setIsAdminAuthenticated(false);
    setActiveTab('review');
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Auth Error:", error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classification || formData.rating === 0) {
      alert('Please select classification and rating.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData: Partial<Review> = {
        ...formData,
        classification: formData.classification as Classification,
        status: 'pending',
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      setSubmitSuccess(true);
      setFormData({
        visitorName: '',
        visitDate: new Date().toISOString().split('T')[0],
        classification: '',
        rating: 0,
        type: '',
        details: ''
      });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyReview = async (id: string, reply: string) => {
    if (!reply.trim()) return;
    try {
      await updateDoc(doc(db, 'reviews', id), {
        adminReply: reply,
        status: 'replied',
        repliedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reviews/${id}`);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${id}`);
    }
  };

  const purgeLogs = async () => {
    if (!confirm('SECURITY WARNING: Are you sure you want to permanently purge all recorded logs?')) return;
    try {
      // In a real app we'd use a batch, but for simplicity:
      for (const r of reviews) {
        if (r.id) await deleteDoc(doc(db, 'reviews', r.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reviews');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex flex-col md:flex-row min-h-screen">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900 text-white p-6 md:fixed md:h-full flex flex-col gap-8 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-lg">
              RM
            </div>
            <h1 className="text-xl font-bold tracking-tight">Rato_Milo</h1>
          </div>

          <nav className="flex-1 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('review')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'review' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <MessageSquare className="w-5 h-5" />
              Customer Feedback
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'admin' 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Lock className="w-5 h-5" />
              Admin Console
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xs uppercase">
                {user?.email?.substring(0, 2) || 'AD'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{isAdminAuthenticated ? 'Admin Console' : 'Guest Access'}</p>
                <p className="text-[10px] text-slate-400 truncate tracking-tight">{isAdminAuthenticated ? user?.email || 'Authenticated' : 'Login Required'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={cn(
          "flex-1 md:ml-64 flex flex-col",
          activeTab === 'admin' && isAdminAuthenticated ? "" : "pt-0"
        )}>
          {/* Dashboard Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium">{activeTab === 'review' ? 'Terminal' : 'Console'}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">{activeTab === 'review' ? 'Feedback Terminal' : 'Admin Interaction Node'}</span>
            </div>
            <div className="hidden md:flex gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                SYSTEM ONLINE
              </div>
            </div>
          </header>
          
          <AnimatePresence mode="wait">
            
            {/* Customer Review Page */}
            {activeTab === 'review' && (
              <div className="flex justify-center pt-8 md:pt-16">
                <motion.div 
                  key="review-page"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Feedback Hub</h3>
                      <p className="text-xs text-slate-500 font-medium">Customer-facing review terminal</p>
                    </div>
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100">STATION 01</span>
                  </div>

                  <div className="p-6 md:p-8">
                    <form onSubmit={handleSubmitReview} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Classification</label>
                        <div className="flex gap-4">
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, classification: 'Good', type: '' }))}
                            className={cn(
                              "flex-1 py-1 px-2 border-2 rounded font-bold text-xs transition-all duration-200",
                              formData.classification === 'Good' 
                                ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20" 
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            GOOD
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, classification: 'Bad', type: '' }))}
                            className={cn(
                              "flex-1 py-1 px-2 border-2 rounded font-bold text-xs transition-all duration-200",
                              formData.classification === 'Bad' 
                                ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20" 
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            BAD
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Customer Name</label>
                          <input 
                            required
                            type="text"
                            placeholder="John Doe"
                            value={formData.visitorName}
                            onChange={e => setFormData(p => ({ ...p, visitorName: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-slate-300"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Visit Date</label>
                          <input 
                            required
                            type="date"
                            value={formData.visitDate}
                            onChange={e => setFormData(p => ({ ...p, visitDate: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium uppercase font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Rating</label>
                        <div className="flex gap-1 flex-row-reverse justify-end">
                          {[5, 4, 3, 2, 1].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFormData(p => ({ ...p, rating: star }))}
                              className={cn(
                                "text-2xl transition-all duration-200 hover:scale-110",
                                formData.rating >= star ? "text-amber-400" : "text-slate-100"
                              )}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Report Type</label>
                        <select 
                          required
                          disabled={!formData.classification}
                          value={formData.type}
                          onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_1rem_center] bg-[length:1.2em_1.2em]"
                        >
                          <option value="">-- Select Report Type --</option>
                          {formData.classification === 'Good' ? (
                            <>
                              <option value="Excellent Taste">Delicious Food / Great Taste</option>
                              <option value="Kind Staff">Friendly & Kind Staff Service</option>
                              <option value="Clean Environment">Clean & Pleasant Environment</option>
                            </>
                          ) : (
                            <>
                              <option value="Food Quality Issue">Food Quality (Uncooked, Foreign object)</option>
                              <option value="Bad Service">Inhospitality / Bad Staff Service</option>
                              <option value="Poor Hygiene">Poor Hygiene & Cleanliness</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Details</label>
                        <textarea 
                          required
                          placeholder="Describe the experience..."
                          rows={4}
                          value={formData.details}
                          onChange={e => setFormData(p => ({ ...p, details: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-4 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium resize-none shadow-inner"
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 text-white py-3 rounded font-bold text-sm shadow-md hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wider"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                        ) : (
                          "Submit Feedback"
                        )}
                      </button>
                    </form>

                    {submitSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 p-6 bg-green-50 text-green-700 rounded-xl border border-green-100 flex flex-col items-center justify-center gap-3"
                      >
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <motion.svg 
                            viewBox="0 0 24 24" 
                            className="w-8 h-8 text-white"
                          >
                            <motion.path
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              d="M5 13l4 4L19 7"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.5 }}
                            />
                          </motion.svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">Sended! Data synchronized with Admin Node</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Real-time Firebase Synchronization Active</p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Admin Authentication */}
            {activeTab === 'admin' && !isAdminAuthenticated && (
              <div className="flex justify-center pt-12 md:pt-20 px-4">
                <motion.div 
                  key="admin-auth"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md bg-white p-8 md:p-10 rounded-xl border border-slate-200 shadow-xl flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center mb-6 shadow-indigo-500/20 shadow-lg">
                    <ShieldCheck className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Admin Gateway</h2>
                  <p className="text-slate-500 text-xs mt-2 mb-8 font-medium">Restricted console for feedback monitoring and response.</p>
                  
                  <div className="w-full space-y-4">
                    <input 
                      type="password"
                      placeholder="Security Passkey"
                      value={passkey}
                      onChange={e => setPasskey(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdminAuth()}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-3 px-6 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center font-bold tracking-[0.3em] text-lg mb-2"
                    />
                    <button 
                      onClick={handleAdminAuth}
                      className="w-full bg-indigo-600 text-white py-3 rounded font-bold text-xs hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] uppercase tracking-[0.1em]"
                    >
                      Authenticate
                    </button>

                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-slate-100"></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or system login</span>
                      <div className="flex-1 h-px bg-slate-100"></div>
                    </div>

                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full bg-white border border-slate-200 text-slate-900 py-3 rounded font-bold text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-sm uppercase tracking-wider"
                    >
                      <LogIn className="w-4 h-4 text-slate-400" />
                      Google Admin Provider
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Admin Dashboard */}
            {activeTab === 'admin' && isAdminAuthenticated && (
              <motion.div 
                key="admin-dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-4xl mx-auto space-y-6"
              >
                <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Admin" className="w-10 h-10 rounded-full border-2 border-indigo-50" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] border border-indigo-200 uppercase tracking-tighter shrink-0">AD</div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Admin Controller
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[8px] font-black rounded border border-green-100 uppercase tracking-widest">Operational</span>
                      </h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Node: <span className="text-slate-600">{user?.email || 'Authenticated User'}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={purgeLogs}
                      className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded text-[10px] font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200 uppercase tracking-wider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Purge
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="px-3 py-1.5 bg-white text-red-600 rounded text-[10px] font-bold hover:bg-red-50 transition-colors flex items-center gap-1.5 border border-red-100 uppercase tracking-wider"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Exit
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Interactions</h3>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded uppercase tracking-tighter">Live Updates</span>
                    </div>
                    <div className="p-4 space-y-4">
                      {reviews.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 italic text-sm font-medium">
                          Node interaction database is currently empty.
                        </div>
                      ) : (
                        reviews.map((review) => (
                          <motion.div 
                            layout
                            key={review.id}
                            className="bg-slate-50 p-4 rounded-lg border border-slate-200 group relative transition-all hover:border-slate-300"
                          >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                               <div className="flex items-start gap-4">
                                 <div className={cn(
                                   "w-10 h-10 rounded border flex items-center justify-center shrink-0 font-bold",
                                   review.classification === 'Good' ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"
                                 )}>
                                   {review.classification === 'Good' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                 </div>
                                 <div className="flex-1">
                                   <div className="flex items-center gap-3">
                                     <span className="font-bold text-slate-900 text-sm tracking-tight">{review.visitorName}</span>
                                     <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                        review.classification === 'Good' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                     )}>
                                       {review.classification}
                                     </span>
                                     <span className="text-amber-400 text-xs">
                                        {'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}
                                     </span>
                                   </div>
                                   <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                     <span className="text-slate-900">{review.type}</span>
                                     <span className="text-slate-300">•</span>
                                     <span>Visit: {review.visitDate}</span>
                                     <span className="text-slate-300">•</span>
                                     <span>{review.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                                 </div>
                               </div>

                               <div className="flex items-center gap-2">
                                 {review.status === 'replied' ? (
                                   <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                     Responded
                                   </div>
                                 ) : (
                                   <div className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                     Pending
                                   </div>
                                 )}
                               </div>
                            </div>

                            <p className="text-sm text-slate-600 mb-4 bg-white p-3 rounded border border-slate-100 shadow-inner font-medium leading-relaxed">
                              {review.details}
                            </p>

                            {review.adminReply ? (
                              <div className="bg-indigo-50 p-3 rounded text-[13px] border-l-4 border-indigo-500 flex flex-col gap-1.5">
                                 <div className="flex justify-between items-center">
                                   <span className="text-[9px] uppercase font-black text-indigo-900 tracking-widest flex items-center gap-1.5">
                                     <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                     Admin Response
                                   </span>
                                   <span className="text-[8px] text-indigo-300 font-bold uppercase font-mono">{review.repliedAt?.toDate().toLocaleTimeString()}</span>
                                 </div>
                                 <p className="text-indigo-700 font-medium leading-relaxed">{review.adminReply}</p>
                              </div>
                            ) : (
                              <AdminReplySection 
                                onReply={(reply) => handleReplyReview(review.id!, reply)} 
                              />
                            )}

                            <div className="absolute right-2 top-2">
                              <button 
                                onClick={() => handleDeleteReview(review.id!)}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Aesthetic Footer */}
      <footer className="md:pl-64 py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] bg-white border-t border-slate-100">
         © 2026 Rato_Milo Artisan Dining • Secure Terminal Node
      </footer>
    </div>
  );
}

function AdminReplySection({ onReply }: { onReply: (msg: string) => void }) {
  const [reply, setReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  if (!isReplying) {
    return (
      <button 
        onClick={() => setIsReplying(true)}
        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 uppercase tracking-wider"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Draft Response
      </button>
    );
  }

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
      <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center text-[8px] font-black shrink-0">A</div>
      <input 
        autoFocus
        value={reply}
        onChange={e => setReply(e.target.value)}
        placeholder="Type a professional reply..."
        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
        onKeyDown={e => e.key === 'Enter' && onReply(reply)}
      />
      <div className="flex gap-2">
        <button 
          onClick={() => {
            onReply(reply);
            setIsReplying(false);
          }}
          className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase"
        >
          SEND
        </button>
        <button 
          onClick={() => setIsReplying(false)}
          className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
