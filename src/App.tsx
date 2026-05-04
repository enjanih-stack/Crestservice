import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Droplets, 
  ClipboardCheck, 
  ArrowRight, 
  LogOut, 
  User, 
  Lock,
  Menu,
  X,
  CheckCircle2,
  Upload,
  FileText,
  Loader2,
  Building,
  MapPin,
  Mail,
  Phone,
  Search,
  AlertCircle,
  Clock,
  CreditCard,
  Users,
  Home,
  Plus,
  Trash2,
  Edit3,
  Printer,
  ChevronRight,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Megaphone,
  Calendar,
  Download,
  FileUp,
  Eye,
  Sparkles,
  MousePointer2,
  Star,
  Send,
  MessageSquare,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
  deleteDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

interface Inquiry {
  id: string;
  time: string;
  name: string;
  company?: string;
  location?: string;
  email?: string;
  phone?: string;
  product: string;
  subService?: string;
  status: 'New' | 'In Progress' | 'Completed';
  fullDate: Date;
  message?: string;
  summary?: string;
  files?: { url: string; name: string; }[];
  userEmail?: string;
  assignedTo?: string;
  assignedToName?: string;
  tenantInfo?: {
    tenantType: 'New' | 'Old' | '';
    tenancyEndDate?: string;
    oldTenantAction?: 'Renewal' | 'Payment' | 'Termination' | '';
    agreementAccepted?: boolean;
    propertyAddress: string;
    currentAddress: string;
    maritalStatus: string;
    occupation: string;
    employerName: string;
    employerAddress: string;
    stateOfOrigin: string;
    lga: string;
    relocationReason: string;
    hasBeenEvicted: string;
    evictionDetails: string;
    intendedUse: string;
    plannedMoveInDate: string;
    currentLandlordName: string;
    currentLandlordAddress: string;
    currentLandlordPhone: string;
    currentLandlordEmail: string;
    referralSource: string;
    hasPets: string;
    apartmentsInterested: string;
    familySize: string;
    dailySchedule: string;
    lateHours: string;
    hostMeetings: string;
    livingExperience: string;
    noisyNeighbors: string;
    maintenanceRating: string;
    selfDescription: string;
    referee1: { name: string; address: string; email: string; phone: string; occupation: string; relationship: string; };
    referee2: { name: string; address: string; email: string; phone: string; occupation: string; relationship: string; };
  };
}

interface RentalRecord {
  id: string;
  unit: string;
  tenant: string;
  email: string;
  amount: number;
  start: string;
  expiry: string;
  notes: string;
  createdAt: Date;
  lastExpiryNotificationSent?: any;
}

interface AvailableProperty {
  id: string;
  address: string;
  rent: number;
  unitType: string;
  description: string;
  images: string[];
  features: string[];
  isAvailable: boolean;
  createdAt: Date;
}

interface Worksheet {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: Date;
}

interface Advert {
  id: string;
  type: 'Vacant Property' | 'Equipment Sale' | 'Property for Sale';
  content: string;
  status: 'Active' | 'Paused';
  lastActionDate: any;
  createdAt: any;
  lastWarningSent?: any;
  lastPauseSent?: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoURL: string;
  address: string;
  bio: string;
  role?: string;
  updatedAt: any;
}

const FACILITY_MANAGEMENT_OPTIONS = [
  "Mechanical Systems: HVAC (heating, ventilation, and air conditioning), Boiler, air heaters installation and maintenance",
  "Electrical Systems(High Voltage): Power distribution, lighting, and electrical maintenance",
  "Plumbing: Water systems, pipes, and sanitation maintenance",
  "Building Fabric Maintenance: Repairs to walls, roofs, floors, and doors",
  "Fire Safety Systems: Maintenance of sprinklers, smoke detectors, and fire alarms",
  "Cleaning Services: Daily cleaning, deep cleaning, window cleaning, and sanitization",
  "Security Services: Security personnel, CCTV monitoring, access control, and visitor management",
  "Grounds Maintenance: Landscaping, gardening, and snow removal",
  "Catering and Vending: Cafeteria management and office refreshment services",
  "Waste Management: Recycling, waste disposal, and recycling programs",
  "Space Management: Workplace strategy, space optimization, and office reconfiguration",
  "Energy Management: Monitoring utility consumption and improving sustainability",
  "Health & Safety Compliance: Ensuring compliance with occupational health and safety regulations",
  "Project Management: Managing office moves, renovations, and upgrades",
  "Property rental & Management: Property letting, sales, management and consultancy",
  "Find a Property"
];

const WATER_SOLUTION_OPTIONS = [
  "Water sourcing (ground water or deep or shallow borehole)",
  "Water Treatment",
  "Waste water treatment"
];

const TURNKEY_PROJECT_OPTIONS = [
  "Renewable Energy solutions",
  "Engineering Equipment design, procurement, installation and commissioning",
  "Health grade production equipment",
  "Multipurpose production equipment",
  "Others"
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [custName, setCustName] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custLocation, setCustLocation] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [chosenProduct, setChosenProduct] = useState('');
  const [chosenSubService, setChosenSubService] = useState('');
  const [custMsg, setCustMsg] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needAccountInfo, setNeedAccountInfo] = useState(false);
  
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackForm, setFeedbackForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [interactionCount, setInteractionCount] = useState(0);
  const [siteVisitCount, setSiteVisitCount] = useState(0);
  
  const [isImporting, setIsImporting] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(`[IMPORT DEBUG] ${msg}`);
    setDebugLog(prev => [msg, ...prev].slice(0, 50));
  };

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInquiryForDetails, setSelectedInquiryForDetails] = useState<Inquiry | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [waterHygieneInfo, setWaterHygieneInfo] = useState({
    sourcing: '',
    treatment: '',
    wastewater: '',
    results: '',
    siteVisitCount: 0
  });
  const [waterHygieneSuccess, setWaterHygieneSuccess] = useState(false);

  const [rentalRecords, setRentalRecords] = useState<RentalRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [availableProperties, setAvailableProperties] = useState<AvailableProperty[]>([]);
  const [showPropertyFinder, setShowPropertyFinder] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<AvailableProperty | null>(null);
  
  const [editingProperty, setEditingProperty] = useState<AvailableProperty | null>(null);
  const [propertyForm, setPropertyForm] = useState({
    address: '',
    rent: '',
    unitType: '',
    description: '',
    isAvailable: true,
    images: [] as string[]
  });

  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [isUploadingPropertyImages, setIsUploadingPropertyImages] = useState(false);
  const [isUploadingWorksheet, setIsUploadingWorksheet] = useState(false);

  const [showRentalDashboard, setShowRentalDashboard] = useState(false);
  const [rentalPassword, setRentalPassword] = useState('');
  const [isRentalAuth, setIsRentalAuth] = useState(false);
  const [editingRentalRecord, setEditingRentalRecord] = useState<RentalRecord | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'rental' | 'property' } | null>(null);
  const [rentalForm, setRentalForm] = useState({
    unit: '',
    tenant: '',
    email: '',
    amount: '',
    start: '',
    expiry: '',
    notes: ''
  });

  const [tenantInfo, setTenantInfo] = useState({
    tenantType: '' as 'New' | 'Old' | '',
    tenancyEndDate: '',
    oldTenantAction: '' as 'Renewal' | 'Payment' | 'Termination' | '',
    agreementAccepted: false,
    propertyAddress: '',
    currentAddress: '',
    maritalStatus: '',
    occupation: '',
    employerName: '',
    employerAddress: '',
    stateOfOrigin: '',
    lga: '',
    relocationReason: '',
    hasBeenEvicted: 'No',
    evictionDetails: '',
    intendedUse: 'Residential',
    plannedMoveInDate: '',
    currentLandlordName: '',
    currentLandlordAddress: '',
    currentLandlordPhone: '',
    currentLandlordEmail: '',
    referralSource: '',
    hasPets: 'No',
    apartmentsInterested: '',
    familySize: '',
    dailySchedule: '',
    lateHours: 'No',
    hostMeetings: 'No',
    livingExperience: '',
    noisyNeighbors: 'No',
    maintenanceRating: '5',
    selfDescription: '',
    referee1: { name: '', address: '', email: '', phone: '', occupation: '', relationship: '' },
    referee2: { name: '', address: '', email: '', phone: '', occupation: '', relationship: '' }
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    phoneNumber: '',
    address: '',
    bio: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [advertisements, setAdvertisements] = useState<Advert[]>([]);
  const [showAdvertForm, setShowAdvertForm] = useState(false);
  const [editingAdvert, setEditingAdvert] = useState<Advert | null>(null);
  const [advertForm, setAdvertForm] = useState({
    type: 'Vacant Property' as Advert['type'],
    content: '',
    status: 'Active' as Advert['status']
  });

  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const activeAds = advertisements.filter(ad => ad.status === 'Active');

  useEffect(() => {
    if (activeAds.length > 1) {
      const timer = setInterval(() => {
        setCurrentAdIndex(prev => (prev + 1) % activeAds.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeAds.length]);

  const inquiryRef = useRef<HTMLElement>(null);

  // Site Stats & View Counter
  useEffect(() => {
    const statsRef = doc(db, 'siteStats', 'counters');
    
    // Increment view count on load
    const incrementStats = async () => {
      try {
        await updateDoc(statsRef, {
          views: increment(1)
        });
      } catch (e) {
        // If doc doesn't exist, create it
        try {
          await setDoc(statsRef, { views: 1, interactions: 0, siteVisits: 0 }, { merge: true });
        } catch (err) {
          console.error("Error updating stats:", err);
        }
      }
    };
    
    incrementStats();

    // Listen to stats
    const unsubscribe = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setViewCount(data.views || 0);
        setInteractionCount(data.interactions || 0);
        setSiteVisitCount(data.siteVisits || 0);
      }
    });

    return () => unsubscribe();
  }, []);

  // Feedbacks listener
  useEffect(() => {
    const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeedbacks(feedbackData);
    });
    return () => unsubscribe();
  }, []);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.comment.trim()) return;
    
    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        ...feedbackForm,
        createdAt: serverTimestamp()
      });
      
      // Increment interaction count
      await updateDoc(doc(db, 'siteStats', 'counters'), {
        interactions: increment(1)
      });

      // Automatic response (simulated or via email)
      if (feedbackForm.email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: feedbackForm.email,
              subject: "Thank you for your feedback!",
              body: `Dear ${feedbackForm.name || 'Valued Customer'},\n\nThank you for taking the time to share your feedback with us. We truly appreciate your input and will use it to improve our services.\n\nBest regards,\nCrestechnologies Team`
            })
          });
        } catch (emailErr) {
          console.error("Failed to send appreciation email:", emailErr);
        }
      }

      setFeedbackSuccess(true);
      setFeedbackForm({ name: '', email: '', rating: 5, comment: '' });
      setTimeout(() => setFeedbackSuccess(false), 5000);
    } catch (err) {
      console.error("Error submitting feedback:", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    const config = firebaseConfig as any;
    addLog(`[SYSTEM] App initialized. Connected to project: ${config.projectId}, Database: ${config.firestoreDatabaseId || '(default)'}`);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Real-time available properties listener (Public)
    const propertiesQ = query(collection(db, 'availableProperties'), orderBy('createdAt', 'desc'));
    const unsubscribeProperties = onSnapshot(propertiesQ, (snapshot) => {
      const properties: AvailableProperty[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          address: data.address,
          rent: data.rent,
          unitType: data.unitType,
          description: data.description,
          images: data.images || [],
          features: data.features || [],
          isAvailable: data.isAvailable !== false,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
        };
      });
      setAvailableProperties(properties);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'availableProperties');
    });

    // Real-time inquiries listener for admin
    let unsubscribeInquiries: () => void;
    let unsubscribeRental: () => void;
    let unsubscribeWorksheets: () => void;
    let unsubscribeProfile: () => void;
    let unsubscribeUsers: () => void;
    
    if (user) {
      unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setUserProfile({ ...data, uid: docSnap.id });

          // Automatic role upgrade for internal staff
          const email = user.email?.toLowerCase() || '';
          const isAdminEmail = email.includes('enjanih') || 
                              email.includes('crestechnology') || 
                              email.includes('crestiton');

          if (isAdminEmail && data.role !== 'admin') {
            updateDoc(doc(db, 'users', user.uid), { 
              role: 'admin',
              updatedAt: serverTimestamp()
            }).catch(e => console.error("[AUTH] Self-promotion failed:", e));
          }

          setProfileForm({
            displayName: data.displayName || '',
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            bio: data.bio || ''
          });
        } else {
          const email = user.email?.toLowerCase() || '';
          const isAdminEmail = email.includes('enjanih') || 
                              email.includes('crestechnology') || 
                              email.includes('crestiton');

          const initialProfile = {
            displayName: user.displayName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            photoURL: user.photoURL || '',
            address: '',
            bio: '',
            role: isAdminEmail ? 'admin' : 'user',
            updatedAt: serverTimestamp()
          };
          setDoc(doc(db, 'users', user.uid), initialProfile).catch(err => {
            console.error("Error initializing profile:", err);
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });
    } else {
      setUserProfile(null);
    }

    if (isRentalAuth) {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      unsubscribeInquiries = onSnapshot(q, (snapshot) => {
        const inquiryData: Inquiry[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            time: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toLocaleTimeString() : new Date().toLocaleTimeString(),
            name: data.name,
            company: data.company,
            location: data.location,
            email: data.email,
            phone: data.phone,
            product: data.product,
            subService: data.subService,
            status: data.status || 'New',
            fullDate: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            message: data.message,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            userEmail: data.userEmail,
            assignedTo: data.assignedTo,
            assignedToName: data.assignedToName,
            tenantInfo: data.tenantInfo
          };
        });
        setInquiries(inquiryData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'inquiries');
      });

      // Real-time rental records listener
      const rentalQ = query(collection(db, 'rentalRecords'), orderBy('createdAt', 'desc'));
      unsubscribeRental = onSnapshot(rentalQ, (snapshot) => {
        const records: RentalRecord[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            unit: data.unit,
            tenant: data.tenant,
            email: data.email || '',
            amount: data.amount,
            start: data.start,
            expiry: data.expiry,
            notes: data.notes,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            lastExpiryNotificationSent: data.lastExpiryNotificationSent
          };
        });
        setRentalRecords(records);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rentalRecords');
      });

      // Real-time worksheets listener
      const worksheetQ = query(collection(db, 'worksheets'), orderBy('uploadedAt', 'desc'));
      unsubscribeWorksheets = onSnapshot(worksheetQ, (snapshot) => {
        const sheets: Worksheet[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            url: data.url,
            type: data.type,
            uploadedAt: data.uploadedAt instanceof Timestamp ? data.uploadedAt.toDate() : new Date()
          };
        });
        setWorksheets(sheets);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'worksheets');
      });

      // Real-time users listener for assignment
      const usersQ = query(collection(db, 'users'), orderBy('displayName', 'asc'));
      unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
        const usersData: UserProfile[] = snapshot.docs.map(doc => ({
          ...doc.data() as UserProfile,
          uid: doc.id
        }));
        setAllUsers(usersData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
    }

    return () => {
      unsubscribeAuth();
      unsubscribeProperties();
      if (unsubscribeInquiries) unsubscribeInquiries();
      if (unsubscribeRental) unsubscribeRental();
      if (unsubscribeWorksheets) unsubscribeWorksheets();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [isRentalAuth, user]);

  useEffect(() => {
    const q = query(collection(db, 'advertisements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ads: Advert[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          content: data.content,
          status: data.status,
          lastActionDate: data.lastActionDate,
          createdAt: data.createdAt,
          lastWarningSent: data.lastWarningSent,
          lastPauseSent: data.lastPauseSent
        };
      });
      setAdvertisements(ads);

      // Check for 14/15 days logic if admin is logged in
      if (isRentalAuth) {
        ads.forEach(async (ad) => {
          if (ad.status === 'Active') {
            const lastAction = ad.lastActionDate instanceof Timestamp ? ad.lastActionDate.toDate() : new Date(ad.lastActionDate);
            const diffDays = Math.floor((new Date().getTime() - lastAction.getTime()) / (1000 * 3600 * 24));
            
            // 14 days warning
            if (diffDays >= 14 && !ad.lastWarningSent) {
              try {
                await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: 'crestechnologies@gmail.com, crestiton@gmail.com',
                    subject: 'Advertisement Warning: 14 Days Spent',
                    body: `The advertisement "${ad.content}" (${ad.type}) has been active for 14 days without action. It will be paused in 24 hours.`
                  })
                });
                await updateDoc(doc(db, 'advertisements', ad.id), {
                  lastWarningSent: serverTimestamp()
                });
              } catch (e) {
                console.error("Failed to send 14-day warning email", e);
              }
            } 
            
            // 15 days auto-pause
            if (diffDays >= 15 && ad.status === 'Active') {
              try {
                await updateDoc(doc(db, 'advertisements', ad.id), {
                  status: 'Paused',
                  lastActionDate: serverTimestamp(),
                  lastPauseSent: serverTimestamp()
                });
                await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: 'crestechnologies@gmail.com, crestiton@gmail.com',
                    subject: 'Advertisement Auto-Paused: 15 Days Spent',
                    body: `The advertisement "${ad.content}" (${ad.type}) has been automatically paused because no action was taken after 15 days.`
                  })
                });
              } catch (e) {
                console.error("Failed to auto-pause advertisement", e);
              }
            }
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'advertisements');
    });
    return () => unsubscribe();
  }, [isRentalAuth]);

  const handleRentalLogin = () => {
    if (rentalPassword === '1206') {
      setIsRentalAuth(true);
      setRentalPassword('');
      setDashboardError(null);
      addLog(`[AUTH] Rental Dashboard unlocked with password.`);
    } else {
      setDashboardError('Incorrect Password');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      addLog(`[AUTH] Logged in as ${result.user.email}`);
    } catch (error) {
      console.error("Login failed", error);
      addLog(`[AUTH] Login FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await signOut(auth);
      addLog(`[AUTH] Logged out from Google.`);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const promoteToAdmin = async () => {
    if (!user) return;
    try {
      addLog(`[AUTH] Promoting ${user.email} to Admin...`);
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'admin',
        updatedAt: serverTimestamp()
      });
      addLog(`[AUTH] Promotion successful.`);
      setDashboardError("Authorized as Admin! You may need to refresh if permissions don't update immediately.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleRentalLogout = () => {
    setIsRentalAuth(false);
    setRentalRecords([]);
    addLog(`[AUTH] Rental Dashboard logged out. Records cleared from view.`);
  };

  const addRentalRecord = async (importedRecord?: any) => {
    const data = importedRecord || {
      unit: rentalForm.unit,
      tenant: rentalForm.tenant,
      email: rentalForm.email,
      amount: parseFloat(rentalForm.amount),
      start: rentalForm.start,
      expiry: rentalForm.expiry,
      notes: rentalForm.notes
    };

    const amountNum = typeof data.amount === 'number' ? data.amount : parseFloat(data.amount);

    if (!data.unit || !data.tenant || (data.amount === undefined || data.amount === null || data.amount === '')) {
      const msg = 'Please fill in all required fields (Unit, Tenant, Amount)';
      if (!importedRecord) setDashboardError(msg);
      else throw new Error(msg);
      return;
    }

    if (isNaN(amountNum) || amountNum < 0) {
      const msg = 'Rent amount must be a valid number';
      if (!importedRecord) setDashboardError(msg);
      else throw new Error(msg);
      return;
    }

    if (!importedRecord) {
      if (data.email && !isValidEmail(data.email)) {
        setDashboardError('Please enter a valid tenant email address');
        return;
      }
      if (data.start && data.expiry && new Date(data.expiry) <= new Date(data.start)) {
        setDashboardError('Expiry date must be after the start date');
        return;
      }
    }
    
    if (!importedRecord) setDashboardError(null);
    
    try {
      addLog(`[DB] Attempting addDoc for ${data.tenant}...`);
      
      if (userProfile?.role !== 'admin' && !["enjanih@gmail.com", "crestechnologiesltd@gmail.com", "crestiton@gmail.com"].includes(user?.email?.toLowerCase() || '')) {
         addLog(`[WARN] You do not appear to have Admin privileges. This write will likely fail.`);
      }
      
      // Add a longer timeout to addDoc
      const addDocPromise = addDoc(collection(db, 'rentalRecords'), {
        ...data,
        amount: amountNum,
        createdAt: serverTimestamp()
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timed out after 60 seconds')), 60000)
      );

      await Promise.race([addDocPromise, timeoutPromise]);
      
      addLog(`[DB] addDoc successful for ${data.tenant}`);
      
      if (!importedRecord) {
        setRentalForm({ unit: '', tenant: '', email: '', amount: '', start: '', expiry: '', notes: '' });
      }
    } catch (error) {
      addLog(`[DB] addDoc FAILED for ${data.tenant}: ${error instanceof Error ? error.message : String(error)}`);
      if (importedRecord) throw error;
      handleFirestoreError(error, OperationType.CREATE, 'rentalRecords');
    }
  };

  const updateRentalRecord = async () => {
    if (!editingRentalRecord) return;

    const amountNum = parseFloat(rentalForm.amount);
    if (!rentalForm.unit || !rentalForm.tenant || !rentalForm.amount) {
      setDashboardError('Please fill in all required fields (Unit, Tenant, Amount)');
      return;
    }
    if (rentalForm.email && !isValidEmail(rentalForm.email)) {
      setDashboardError('Please enter a valid tenant email address');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setDashboardError('Rent amount must be a valid number greater than zero');
      return;
    }
    if (rentalForm.start && rentalForm.expiry && new Date(rentalForm.expiry) <= new Date(rentalForm.start)) {
      setDashboardError('Expiry date must be after the start date');
      return;
    }

    try {
      await updateDoc(doc(db, 'rentalRecords', editingRentalRecord.id), {
        ...rentalForm,
        amount: parseFloat(rentalForm.amount)
      });
      setEditingRentalRecord(null);
      setRentalForm({ unit: '', tenant: '', email: '', amount: '', start: '', expiry: '', notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rentalRecords/${editingRentalRecord.id}`);
    }
  };

  const deleteRentalRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'rentalRecords', id));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rentalRecords/${id}`);
    }
  };

  const addAdvert = async () => {
    if (!advertForm.content) {
      setDashboardError('Please provide advert content');
      return;
    }
    try {
      if (editingAdvert) {
        await updateDoc(doc(db, 'advertisements', editingAdvert.id), {
          ...advertForm,
          lastActionDate: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'advertisements'), {
          ...advertForm,
          lastActionDate: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      setAdvertForm({ type: 'Vacant Property', content: '', status: 'Active' });
      setEditingAdvert(null);
      setShowAdvertForm(false);
      setDashboardError(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'advertisements');
    }
  };

  const deleteAdvert = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'advertisements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `advertisements/${id}`);
    }
  };

  const toggleAdvertStatus = async (ad: Advert) => {
    try {
      await updateDoc(doc(db, 'advertisements', ad.id), {
        status: ad.status === 'Active' ? 'Paused' : 'Active',
        lastActionDate: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `advertisements/${ad.id}`);
    }
  };

  const renewAdvert = async (id: string) => {
    try {
      await updateDoc(doc(db, 'advertisements', id), {
        lastActionDate: serverTimestamp(),
        status: 'Active',
        lastWarningSent: null,
        lastPauseSent: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `advertisements/${id}`);
    }
  };

  const startEditRental = (record: RentalRecord) => {
    setEditingRentalRecord(record);
    setRentalForm({
      unit: record.unit,
      tenant: record.tenant,
      email: record.email || '',
      amount: record.amount.toString(),
      start: record.start,
      expiry: record.expiry,
      notes: record.notes
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addAvailableProperty = async () => {
    const rentNum = parseFloat(propertyForm.rent);
    if (!propertyForm.address || !propertyForm.rent || !propertyForm.unitType) {
      setDashboardError('Please fill in all required fields (Address, Rent, Unit Type)');
      return;
    }
    if (isNaN(rentNum) || rentNum <= 0) {
      setDashboardError('Rent amount must be a valid number greater than zero');
      return;
    }
    if (!propertyForm.description || propertyForm.description.length < 20) {
      setDashboardError('Please provide a detailed description (at least 20 characters)');
      return;
    }
    if (!propertyForm.images || propertyForm.images.length === 0) {
      setDashboardError('Please upload at least one property image');
      return;
    }
    setDashboardError(null);
    try {
      await addDoc(collection(db, 'availableProperties'), {
        ...propertyForm,
        rent: parseFloat(propertyForm.rent),
        createdAt: serverTimestamp()
      });
      setPropertyForm({ address: '', rent: '', unitType: '', description: '', isAvailable: true, images: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'availableProperties');
    }
  };

  const updateAvailableProperty = async () => {
    if (!editingProperty) return;

    const rentNum = parseFloat(propertyForm.rent);
    if (!propertyForm.address || !propertyForm.rent || !propertyForm.unitType) {
      setDashboardError('Please fill in all required fields (Address, Rent, Unit Type)');
      return;
    }
    if (isNaN(rentNum) || rentNum <= 0) {
      setDashboardError('Rent amount must be a valid number greater than zero');
      return;
    }
    if (!propertyForm.description || propertyForm.description.length < 20) {
      setDashboardError('Please provide a detailed description (at least 20 characters)');
      return;
    }
    if (!propertyForm.images || propertyForm.images.length === 0) {
      setDashboardError('Please upload at least one property image');
      return;
    }

    try {
      await updateDoc(doc(db, 'availableProperties', editingProperty.id), {
        ...propertyForm,
        rent: parseFloat(propertyForm.rent)
      });
      setEditingProperty(null);
      setPropertyForm({ address: '', rent: '', unitType: '', description: '', isAvailable: true, images: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `availableProperties/${editingProperty.id}`);
    }
  };

  const updateUserProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileForm,
        updatedAt: serverTimestamp()
      });
      setIsEditingProfile(false);
      setDashboardError(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const deleteAvailableProperty = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'availableProperties', id));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `availableProperties/${id}`);
    }
  };

  const startEditProperty = (property: AvailableProperty) => {
    setEditingProperty(property);
    setPropertyForm({
      address: property.address,
      rent: property.rent.toString(),
      unitType: property.unitType,
      description: property.description,
      isAvailable: property.isAvailable,
      images: property.images || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePropertyImageUpload = async (files: FileList | null) => {
    if (!files) return;
    setIsUploadingPropertyImages(true);
    const uploadedUrls: string[] = [...propertyForm.images];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `properties/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }
      setPropertyForm({ ...propertyForm, images: uploadedUrls });
    } catch (error) {
      console.error("Error uploading property images:", error);
      setDashboardError("Failed to upload images");
    } finally {
      setIsUploadingPropertyImages(false);
    }
  };

  const handleWorksheetUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingWorksheet(true);
    
    try {
      const storageRef = ref(storage, `worksheets/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      await addDoc(collection(db, 'worksheets'), {
        name: file.name,
        url: url,
        type: file.type,
        uploadedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error uploading worksheet:", error);
      setDashboardError("Failed to upload worksheet");
    } finally {
      setIsUploadingWorksheet(false);
    }
  };

  const deleteWorksheet = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this worksheet?')) {
      try {
        await deleteDoc(doc(db, 'worksheets', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `worksheets/${id}`);
      }
    }
  };

  const generateReceipt = (record: RentalRecord) => {
    const rNum = Math.floor(10000 + Math.random() * 90000);
    const rDate = new Date().toLocaleDateString();
    const rWords = numberToWords(record.amount) + " Naira Only";

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${record.tenant}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; }
              .receipt-box { border: 4px double #333; padding: 40px; max-width: 700px; margin: auto; background: white; color: #000; }
              h1 { text-align: center; color: #27ae60; margin-bottom: 5px; }
              p { margin: 10px 0; }
              hr { border: 1px solid #eee; margin: 20px 0; }
              .amount-box { margin-top: 40px; font-size: 1.8em; border: 2px solid #000; display: inline-block; padding: 15px; }
            </style>
          </head>
          <body>
            <div class="receipt-box">
              <h1>RENT RECEIPT</h1>
              <p style="text-align: center; font-weight: bold;">CRESTECHNOLOGIES I S LTD</p>
              <hr>
              <div style="display: flex; justify-content: space-between;">
                <p><strong>Date:</strong> ${rDate}</p>
                <p><strong>Receipt No:</strong> ${rNum}</p>
              </div>
              <p>Received from: <strong>${record.tenant.toUpperCase()}</strong></p>
              <p>The sum of: <strong>${rWords}</strong></p>
              <p>Being payment for: <strong>${record.unit}</strong></p>
              <p>Current rent expires on: <strong>${record.expiry || 'N/A'}</strong></p>
              <div class="amount-box">
                ₦ ${record.amount.toLocaleString()}
              </div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const numberToWords = (num: number) => {
    if (num === 0) return "Zero";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += (parseInt(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (parseInt(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Million ' : '';
    str += (parseInt(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (parseInt(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (parseInt(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
  };

  const selectService = (name: string) => {
    if (name === 'Property rental & Management') {
      setChosenProduct('Facility Management');
      setChosenSubService('Property rental & Management: Property letting, sales, management and consultancy');
    } else if (name === 'Water Hygiene & Care') {
      setChosenProduct('Water Hygiene & Care');
      setChosenSubService('');
    } else {
      setChosenProduct(name);
      setChosenSubService('');
    }
    inquiryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateInquiryStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inquiries/${id}`);
    }
  };

  const assignInquiry = async (inquiryId: string, userId: string, userName: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), {
        assignedTo: userId,
        assignedToName: userName
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inquiries/${inquiryId}`);
    }
  };

  const summarizeInquiry = async (inquiry: Inquiry) => {
    if (!inquiry.message || inquiry.message.length < 20) return;
    
    setSummarizingId(inquiry.id);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize the following customer inquiry message concisely in 2-3 sentences: "${inquiry.message}"`,
        config: {
          systemInstruction: "You are a helpful assistant that summarizes customer inquiries for property management staff.",
        }
      });
      
      const summary = response.text?.trim();
      if (summary) {
        await updateDoc(doc(db, 'inquiries', inquiry.id), { summary });
        if (selectedInquiryForDetails?.id === inquiry.id) {
          setSelectedInquiryForDetails({ ...selectedInquiryForDetails, summary });
        }
      }
    } catch (error) {
      console.error("Error summarizing inquiry:", error);
    } finally {
      setSummarizingId(null);
    }
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesStatus = filterStatus === 'All' || inquiry.status === filterStatus;
    const matchesDate = !filterDate || inquiry.fullDate.toISOString().split('T')[0] === filterDate;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      inquiry.name.toLowerCase().includes(searchLower) || 
      (inquiry.company?.toLowerCase().includes(searchLower) || false) || 
      (inquiry.message?.toLowerCase().includes(searchLower) || false);

    return matchesStatus && matchesDate && matchesSearch;
  });

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setFormError(null);

    // Basic Validation
    if (!custName.trim() || custName.length < 2) {
      setFormError("Please enter your full name (at least 2 characters).");
      setIsUploading(false);
      return;
    }
    if (!custEmail.trim() || !isValidEmail(custEmail)) {
      setFormError("Please enter a valid email address.");
      setIsUploading(false);
      return;
    }
    if (!custPhone.trim() || custPhone.replace(/\D/g, '').length < 10) {
      setFormError("Please enter a valid phone number (at least 10 digits).");
      setIsUploading(false);
      return;
    }
    if (!chosenProduct) {
      setFormError("Please select a service you are interested in.");
      setIsUploading(false);
      return;
    }
    
    try {
      const uploadedFiles: { url: string; name: string; }[] = [];

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileRef = ref(storage, `inquiries/${Date.now()}_${file.name}`);
          const uploadResult = await uploadBytes(fileRef, file);
          const url = await getDownloadURL(uploadResult.ref);
          uploadedFiles.push({ url, name: file.name });
        }
      }

      const isPropertyRent = chosenSubService.startsWith('Property rental');
      
      if (isPropertyRent) {
        if (!tenantInfo.tenantType) {
          setFormError("Please specify if you are a New or Old tenant.");
          setIsUploading(false);
          return;
        }
        if (tenantInfo.tenantType === 'Old' && tenantInfo.oldTenantAction === 'Renewal') {
          if (!tenantInfo.agreementAccepted) {
            setFormError("Please accept the Tenancy Renewal Agreement terms before submitting.");
            setIsUploading(false);
            return;
          }
          if (!tenantInfo.tenancyEndDate) {
            setFormError("Please provide your current tenancy end date.");
            setIsUploading(false);
            return;
          }
          const endDate = new Date(tenantInfo.tenancyEndDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (endDate < today) {
            setFormError("Tenancy end date must be in the future for renewals. If your tenancy has already expired, please contact management directly.");
            setIsUploading(false);
            return;
          }
        }
        if (tenantInfo.tenantType === 'Old' && tenantInfo.oldTenantAction === 'Payment' && selectedFiles.length === 0) {
          setFormError("Please upload your payment receipt before submitting.");
          setIsUploading(false);
          return;
        }

        // Additional Tenant Info Validation
        if (tenantInfo.tenantType === 'New') {
          if (!tenantInfo.currentAddress.trim()) {
            setFormError("Please provide your current address.");
            setIsUploading(false);
            return;
          }
          if (!tenantInfo.occupation.trim()) {
            setFormError("Please provide your occupation.");
            setIsUploading(false);
            return;
          }
          if (tenantInfo.currentLandlordEmail && !isValidEmail(tenantInfo.currentLandlordEmail)) {
            setFormError("Please provide a valid email for your current landlord.");
            setIsUploading(false);
            return;
          }
        }
      }

      if (!isPropertyRent && (!custMsg.trim() || custMsg.length < 10)) {
        setFormError("Please provide a brief message about your inquiry (at least 10 characters).");
        setIsUploading(false);
        return;
      }

      const inquiryData: any = {
        name: custName,
        company: custCompany,
        location: custLocation,
        email: custEmail,
        phone: custPhone,
        product: chosenProduct,
        subService: chosenSubService,
        status: 'New',
        message: custMsg,
        files: uploadedFiles,
        userId: user?.uid || null,
        userEmail: user?.email || null,
        needAccountInfo: needAccountInfo,
        createdAt: serverTimestamp()
      };

      if (isPropertyRent) {
        inquiryData.tenantInfo = tenantInfo;
      }

      if (chosenProduct === 'Water Hygiene & Care') {
        inquiryData.waterHygieneInfo = waterHygieneInfo;
      }

      await addDoc(collection(db, 'inquiries'), inquiryData);
      
      // Increment interaction count and site visits if applicable
      const statsUpdates: any = {
        interactions: increment(1)
      };
      if (chosenProduct === 'Water Hygiene & Care' && waterHygieneInfo.siteVisitCount > 0) {
        statsUpdates.siteVisits = increment(waterHygieneInfo.siteVisitCount);
      }

      await updateDoc(doc(db, 'siteStats', 'counters'), statsUpdates);

      if (chosenProduct === 'Water Hygiene & Care') {
        setWaterHygieneSuccess(true);
      } else {
        setShowSuccess(true);
      }

      setCustName('');
      setCustCompany('');
      setCustLocation('');
      setCustEmail('');
      setCustPhone('');
      setChosenProduct('');
      setChosenSubService('');
      setCustMsg('');
      setSelectedFiles([]);
      setNeedAccountInfo(false);
      setWaterHygieneInfo({
        sourcing: '',
        treatment: '',
        wastewater: '',
        results: '',
        siteVisitCount: 0
      });
      setTenantInfo({
        tenantType: '',
        tenancyEndDate: '',
        oldTenantAction: '',
        agreementAccepted: false,
        propertyAddress: '',
        currentAddress: '',
        maritalStatus: '',
        occupation: '',
        employerName: '',
        employerAddress: '',
        stateOfOrigin: '',
        lga: '',
        relocationReason: '',
        hasBeenEvicted: 'No',
        evictionDetails: '',
        intendedUse: 'Residential',
        plannedMoveInDate: '',
        currentLandlordName: '',
        currentLandlordAddress: '',
        currentLandlordPhone: '',
        currentLandlordEmail: '',
        referralSource: '',
        hasPets: 'No',
        apartmentsInterested: '',
        familySize: '',
        dailySchedule: '',
        lateHours: 'No',
        hostMeetings: 'No',
        livingExperience: '',
        noisyNeighbors: 'No',
        maintenanceRating: '5',
        selfDescription: '',
        referee1: { name: '', address: '', email: '', phone: '', occupation: '', relationship: '' },
        referee2: { name: '', address: '', email: '', phone: '', occupation: '', relationship: '' }
      });

      setTimeout(() => {
        setShowSuccess(false);
        setWaterHygieneSuccess(false);
      }, 7000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inquiries');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/Logo2.png" alt="Crestechnologies Logo" className="h-10 w-auto" referrerPolicy="no-referrer" />
          <div className="text-xl font-black text-slate-900 tracking-tighter uppercase">
            <span className="text-blue-600">CRESTECHNOLOGIES</span> <span className="text-slate-700">I S LTD</span>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8 font-medium text-sm text-slate-600 uppercase tracking-widest items-center">
          <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
          <a href="#products" className="hover:text-blue-600 transition-colors">Products</a>
          <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          <a 
            href="#inquiry" 
            className="bg-blue-600 text-white px-6 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            Enquire Now
          </a>
          <button 
            onClick={() => setShowRentalDashboard(true)} 
            className="text-slate-400 hover:text-red-600 text-[10px] font-bold transition-colors"
          >
            ADMIN
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[73px] bg-white z-40 border-b shadow-xl p-6 flex flex-col gap-4 md:hidden"
          >
            <a href="#services" onClick={() => setIsMenuOpen(false)} className="font-bold text-slate-700">Services</a>
            <a href="#products" onClick={() => setIsMenuOpen(false)} className="font-bold text-slate-700">Products</a>
            <a href="#contact" onClick={() => setIsMenuOpen(false)} className="font-bold text-slate-700">Contact</a>
            <a 
              href="#inquiry" 
              onClick={() => setIsMenuOpen(false)} 
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-center font-bold"
            >
              Enquire Now
            </a>
            <button 
              onClick={() => {
                setIsMenuOpen(false);
                setShowRentalDashboard(true);
              }} 
              className="text-slate-400 font-bold text-xs"
            >
              ADMIN ACCESS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advertisement Banner */}
      <div className="bg-slate-900 border-b border-slate-800">
        <AnimatePresence mode="wait">
          {activeAds.length > 0 && (
            <div className="py-2">
              <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">
                <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 animate-pulse">
                  <Megaphone className="w-3 h-3" />
                  ADVERT
                </div>
                <div className="flex-1 overflow-hidden relative h-6 flex items-center">
                  <motion.div
                    key={currentAdIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="flex items-center gap-4 whitespace-nowrap"
                  >
                    <span className="font-bold text-xs text-blue-400 uppercase tracking-tighter">
                      {activeAds[currentAdIndex]?.type}:
                    </span>
                    <span className="text-xs font-medium text-slate-300">
                      {activeAds[currentAdIndex]?.content}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({activeAds[currentAdIndex]?.lastActionDate instanceof Timestamp 
                        ? activeAds[currentAdIndex]?.lastActionDate.toDate().toLocaleDateString() 
                        : activeAds[currentAdIndex]?.lastActionDate 
                          ? new Date(activeAds[currentAdIndex]?.lastActionDate).toLocaleDateString()
                          : new Date().toLocaleDateString()})
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Hero Section */}
      <header className="hero-gradient min-h-[70vh] flex items-center justify-center text-center text-white px-6 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl z-10"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
            Simple, Effective <br />
            <span className="text-blue-400">Engineering Compliance</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-200 mb-10 leading-relaxed max-w-2xl mx-auto">
            Industrial-grade solutions for Facility Management, Water Hygiene, and Process Optimization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#services" 
              className="bg-blue-600 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:scale-105"
            >
              Our Services
            </a>
            <a 
              href="#inquiry" 
              className="bg-white/10 backdrop-blur-md border border-white/20 px-10 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all"
            >
              Contact Us
            </a>
          </div>
        </motion.div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
      </header>

      {/* Services Section */}
      <section id="services" className="py-24 bg-slate-900 text-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">How we can help you</h2>
              <p className="text-slate-400 text-lg max-w-xl">Specialized engineering services tailored for industrial and commercial excellence.</p>
            </div>
            <div className="hidden md:block h-1 w-32 bg-blue-600 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[
              { id: '01', title: 'Facility Management', desc: 'Predictive maintenance and operations following CBRE global frameworks.', icon: <Shield className="w-8 h-8 text-blue-500" /> },
              { id: '02', title: 'Water Hygiene & Care', desc: 'Advanced wastewater treatment and industrial water sourcing solutions.', icon: <Droplets className="w-8 h-8 text-blue-500" /> },
              { id: '03', title: 'Risk Assessment', desc: 'Technical audits to ensure site compliance with 18th Edition and Safety codes.', icon: <ClipboardCheck className="w-8 h-8 text-blue-500" /> },
              { id: '04', title: 'Property rental & Management', desc: 'Comprehensive property management and rental services for landlords and tenants.', icon: <Building className="w-8 h-8 text-blue-500" /> }
            ].map((service, index) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group border-t border-slate-700 pt-8 card-hover"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-5xl font-black text-slate-800 group-hover:text-slate-700 transition-colors">{service.id}</span>
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold mt-2 group-hover:text-blue-400 transition-colors">{service.title}</h3>
                <p className="text-slate-400 mt-4 text-base leading-relaxed mb-6">{service.desc}</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => selectService(service.title)} 
                    className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Request Quote <ArrowRight className="w-4 h-4" />
                  </button>
                  {service.title === 'Property rental & Management' && (
                    <button 
                      onClick={() => {
                        selectService(service.title);
                        setTimeout(() => setShowPropertyFinder(true), 500);
                      }} 
                      className="flex items-center gap-2 text-green-400 font-bold text-sm uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Find a Property <Search className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-10 w-2 bg-blue-600 rounded-full"></div>
            <h2 className="text-4xl font-bold text-slate-900">Engineering Products</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10">
            {[
              { 
                title: 'Industrial Water Solution', 
                desc: 'Custom-built water treatment solutions and consultation', 
                image: '/Industrial-fluid-filtration-systems-Innovations-News-Fluid-Handling-Pro.jpeg' 
              },
              { 
                title: 'Sustainable Turnkey Project', 
                desc: 'Sustainable range of cost effective engineering solutions', 
                image: '/beverage-turnkey-project_Processing Plant.webp',
                secondaryImage: '/beverage-turnkey-project-solutions_Filler.webp'
              }
            ].map((product, index) => (
              <motion.div 
                key={product.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 hover:shadow-xl transition-all group"
              >
                <div className="h-56 bg-slate-100 rounded-xl mb-6 overflow-hidden relative flex gap-2">
                  <img 
                    src={product.image} 
                    alt={product.title}
                    className={`h-full object-cover group-hover:scale-110 transition-transform duration-500 ${product.secondaryImage ? 'w-1/2' : 'w-full'}`}
                    referrerPolicy="no-referrer"
                  />
                  {product.secondaryImage && (
                    <img 
                      src={product.secondaryImage} 
                      alt={`${product.title} detail`}
                      className="w-1/2 h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-transparent transition-colors"></div>
                </div>
                <h3 className="font-bold text-2xl text-slate-900 mb-2">{product.title}</h3>
                <p className="text-slate-500 text-lg mb-8">{product.desc}</p>
                <button 
                  onClick={() => selectService(product.title)} 
                  className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-bold text-lg shadow-sm"
                >
                  Inquire Now
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Showcase Section */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-2">Projects in Action</h2>
              <p className="text-slate-500 text-lg">Watch our engineering solutions solving real-world challenges.</p>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
              <span className="text-blue-600 font-bold">Featured: Water Treatment Project</span>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-50 bg-slate-100 relative group"
          >
            <iframe 
              src="https://drive.google.com/file/d/1uCGYQQfmX-1AhXfMO_nzLQK4RV9soBpd/preview" 
              className="w-full h-full"
              allow="autoplay"
              title="Water Project Video"
            ></iframe>
            <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-2xl"></div>
          </motion.div>
          
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-6 rounded-2xl">
              <h4 className="font-bold text-slate-900 mb-2">Efficiency</h4>
              <p className="text-sm text-slate-600">Optimized flow rates and reduced energy consumption across the plant.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl">
              <h4 className="font-bold text-slate-900 mb-2">Compliance</h4>
              <p className="text-sm text-slate-600">Fully compliant with international water quality and safety standards.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl">
              <h4 className="font-bold text-slate-900 mb-2">Sustainability</h4>
              <p className="text-sm text-slate-600">Integrated waste-reduction systems for long-term environmental care.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Section */}
      <section id="inquiry" ref={inquiryRef} className="bg-slate-900 py-24 px-6 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-2xl relative z-10 border border-slate-100">
          {!chosenProduct && !showSuccess && !waterHygieneSuccess ? (
            <div className="text-center py-16 px-6">
              <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 transition-transform hover:rotate-0">
                <Send className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Need an Engineering Solution?</h2>
              <p className="text-slate-500 text-xl mb-12 max-w-lg mx-auto leading-relaxed">
                To start your enquiry, please select one of our specialized services or products from our catalog.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md mx-auto">
                <a 
                  href="#services" 
                  className="group p-6 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 transition-all text-center shadow-lg hover:shadow-blue-200"
                >
                  <Shield className="w-6 h-6 mx-auto mb-3 opacity-50 group-hover:opacity-100" />
                  <span className="block font-bold uppercase tracking-widest text-xs">Browse Services</span>
                </a>
                <a 
                  href="#products" 
                  className="group p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-blue-600 transition-all text-center"
                >
                  <Droplets className="w-6 h-6 mx-auto mb-3 text-slate-300 group-hover:text-blue-600" />
                  <span className="block font-bold text-slate-800 uppercase tracking-widest text-xs">View Products</span>
                </a>
              </div>
              
              <div className="mt-12 pt-12 border-t border-slate-100">
                <button 
                  onClick={() => setChosenProduct('General Inquiry')}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Or click here for a General Engineering Inquiry
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-10 flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Service Inquiry Form</h2>
                  <p className="text-slate-500 text-lg">Engineering response within 24 hours.</p>
                </div>
                {chosenProduct && (
                  <button 
                    onClick={() => {
                      setChosenProduct('');
                      setChosenSubService('');
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors p-2"
                    title="Clear Selection"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
              
              {showSuccess || waterHygieneSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 text-center"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-4xl font-black text-slate-900 mb-4">ENQUIRY SENT!</h3>
                  <p className="text-slate-600 text-lg mb-8">Our expert engineers will review your request and get back to you within 24 hours.</p>
                  <button 
                    onClick={() => {
                      setShowSuccess(false);
                      setWaterHygieneSuccess(false);
                      setChosenProduct('');
                    }}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                  >
                    Close
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                          type="text" 
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          placeholder="Your Name" 
                          className="w-full p-4 pl-12 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Company Name</label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                          type="text" 
                          value={custCompany}
                          onChange={(e) => setCustCompany(e.target.value)}
                          placeholder="Company Name" 
                          className="w-full p-4 pl-12 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                          type="email" 
                          value={custEmail}
                          onChange={(e) => setCustEmail(e.target.value)}
                          placeholder="email@example.com" 
                          className="w-full p-4 pl-12 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Phone Contact</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                          type="tel" 
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000" 
                          className="w-full p-4 pl-12 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Project Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input 
                        type="text" 
                        value={custLocation}
                        onChange={(e) => setCustLocation(e.target.value)}
                        placeholder="City, Country or Site Address" 
                        className="w-full p-4 pl-12 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Service of Interest</label>
                    <input 
                      type="text" 
                      value={chosenProduct}
                      readOnly
                      placeholder="Select a service above" 
                      className="w-full p-4 bg-blue-50 border border-blue-100 rounded-xl font-bold text-blue-800 cursor-default" 
                    />
                  </div>

            {chosenProduct === 'Facility Management' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Specific Facility Service</label>
                <select 
                  value={chosenSubService}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChosenSubService(val);
                    if (val === 'Find a Property') {
                      setShowPropertyFinder(true);
                    }
                  }}
                  className="w-full p-4 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">-- Select specialized service --</option>
                  {FACILITY_MANAGEMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </motion.div>
            )}

            {chosenSubService.startsWith('Property rental') || chosenSubService === 'Find a Property' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-blue-50/50 border-2 border-blue-200 rounded-3xl space-y-8"
              >
                <div className="border-b border-blue-200 pb-4">
                  <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">Tenancy Status</h3>
                  <p className="text-blue-600 text-sm font-medium">Please specify your current status</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <button
                    type="button"
                    onClick={() => setShowPropertyFinder(true)}
                    className="p-6 rounded-2xl border-2 bg-blue-600 border-blue-600 text-white hover:bg-blue-700 transition-all flex flex-col items-center gap-3 shadow-lg shadow-blue-500/20"
                  >
                    <Search className="w-8 h-8" />
                    <span className="font-black uppercase tracking-widest text-center text-sm">Find a Property</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenantInfo({...tenantInfo, tenantType: 'New'})}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                      tenantInfo.tenantType === 'New' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                        : 'bg-white border-blue-100 text-blue-900 hover:border-blue-300'
                    }`}
                  >
                    <User className="w-8 h-8" />
                    <span className="font-bold uppercase tracking-widest text-center">New Tenant</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenantInfo({...tenantInfo, tenantType: 'Old'})}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                      tenantInfo.tenantType === 'Old' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                        : 'bg-white border-blue-100 text-blue-900 hover:border-blue-300'
                    }`}
                  >
                    <Building className="w-8 h-8" />
                    <span className="font-bold uppercase tracking-widest text-center">Old Tenant</span>
                  </button>
                </div>

                {tenantInfo.tenantType === 'New' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="border-b border-blue-200 pb-4">
                      <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">Pre-Rental Questionnaire</h3>
                      <p className="text-blue-600 text-sm font-medium">Know Your Tenant (KYT) - Required for New Tenants</p>
                    </div>

                    {/* Section 1: Property & Personal */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b pb-1">1. Property & Personal Information</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Property Address Interested In</label>
                          <input 
                            type="text" 
                            value={tenantInfo.propertyAddress}
                            onChange={(e) => setTenantInfo({...tenantInfo, propertyAddress: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Current Residential Address</label>
                          <input 
                            type="text" 
                            value={tenantInfo.currentAddress}
                            onChange={(e) => setTenantInfo({...tenantInfo, currentAddress: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Marital Status</label>
                          <select 
                            value={tenantInfo.maritalStatus}
                            onChange={(e) => setTenantInfo({...tenantInfo, maritalStatus: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Occupation / Nature of Business</label>
                          <input 
                            type="text" 
                            value={tenantInfo.occupation}
                            onChange={(e) => setTenantInfo({...tenantInfo, occupation: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Employment */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b pb-1">2. Employment Details</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Name of Employer/Business</label>
                          <input 
                            type="text" 
                            value={tenantInfo.employerName}
                            onChange={(e) => setTenantInfo({...tenantInfo, employerName: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Address of Employer/Business</label>
                          <input 
                            type="text" 
                            value={tenantInfo.employerAddress}
                            onChange={(e) => setTenantInfo({...tenantInfo, employerAddress: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Origin & History */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b pb-1">3. Origin & Tenancy History</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">State of Origin</label>
                          <input 
                            type="text" 
                            value={tenantInfo.stateOfOrigin}
                            onChange={(e) => setTenantInfo({...tenantInfo, stateOfOrigin: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Local Government Area (LGA)</label>
                          <input 
                            type="text" 
                            value={tenantInfo.lga}
                            onChange={(e) => setTenantInfo({...tenantInfo, lga: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-700 uppercase">Why are you relocating from present location?</label>
                        <textarea 
                          value={tenantInfo.relocationReason}
                          onChange={(e) => setTenantInfo({...tenantInfo, relocationReason: e.target.value})}
                          className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          required
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Ever been evicted or in eviction proceedings?</label>
                          <select 
                            value={tenantInfo.hasBeenEvicted}
                            onChange={(e) => setTenantInfo({...tenantInfo, hasBeenEvicted: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                        {tenantInfo.hasBeenEvicted === 'Yes' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-blue-700 uppercase">Please state reasons/details</label>
                            <input 
                              type="text" 
                              value={tenantInfo.evictionDetails}
                              onChange={(e) => setTenantInfo({...tenantInfo, evictionDetails: e.target.value})}
                              className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 4: Current Landlord */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b pb-1">4. Current Landlord Information</h4>
                      <div className="p-4 bg-white rounded-2xl border border-blue-100 space-y-4 shadow-sm">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Landlord Name</label>
                            <input 
                              type="text" 
                              placeholder="Full Name"
                              value={tenantInfo.currentLandlordName}
                              onChange={(e) => setTenantInfo({...tenantInfo, currentLandlordName: e.target.value})}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Landlord Phone</label>
                            <input 
                              type="text" 
                              placeholder="Phone Number"
                              value={tenantInfo.currentLandlordPhone}
                              onChange={(e) => setTenantInfo({...tenantInfo, currentLandlordPhone: e.target.value})}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Landlord Email</label>
                            <input 
                              type="email" 
                              placeholder="Email Address"
                              value={tenantInfo.currentLandlordEmail}
                              onChange={(e) => setTenantInfo({...tenantInfo, currentLandlordEmail: e.target.value})}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Landlord Address</label>
                            <input 
                              type="text" 
                              placeholder="Residential Address"
                              value={tenantInfo.currentLandlordAddress}
                              onChange={(e) => setTenantInfo({...tenantInfo, currentLandlordAddress: e.target.value})}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Preferences & Lifestyle */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b pb-1">5. Preferences & Lifestyle</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Intended Use of Premises</label>
                          <select 
                            value={tenantInfo.intendedUse}
                            onChange={(e) => setTenantInfo({...tenantInfo, intendedUse: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="Residential">Residential</option>
                            <option value="Commercial">Commercial</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Planned Move-in Date</label>
                          <input 
                            type="date" 
                            value={tenantInfo.plannedMoveInDate}
                            onChange={(e) => setTenantInfo({...tenantInfo, plannedMoveInDate: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">How did you hear about vacancy?</label>
                          <input 
                            type="text" 
                            value={tenantInfo.referralSource}
                            onChange={(e) => setTenantInfo({...tenantInfo, referralSource: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Do you have or intend to bring PETS?</label>
                          <select 
                            value={tenantInfo.hasPets}
                            onChange={(e) => setTenantInfo({...tenantInfo, hasPets: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Apartment Interest (No. of units)</label>
                          <input 
                            type="number" 
                            value={tenantInfo.apartmentsInterested}
                            onChange={(e) => setTenantInfo({...tenantInfo, apartmentsInterested: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Family Size (Persons sharing property)</label>
                          <input 
                            type="text" 
                            value={tenantInfo.familySize}
                            onChange={(e) => setTenantInfo({...tenantInfo, familySize: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Daily Schedule (Leave/Return time)</label>
                          <input 
                            type="text" 
                            value={tenantInfo.dailySchedule}
                            onChange={(e) => setTenantInfo({...tenantInfo, dailySchedule: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Do you keep late hours outside?</label>
                          <select 
                            value={tenantInfo.lateHours}
                            onChange={(e) => setTenantInfo({...tenantInfo, lateHours: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Host periodic meetings at residence?</label>
                          <select 
                            value={tenantInfo.hostMeetings}
                            onChange={(e) => setTenantInfo({...tenantInfo, hostMeetings: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Experience living with neighbors?</label>
                          <input 
                            type="text" 
                            value={tenantInfo.livingExperience}
                            onChange={(e) => setTenantInfo({...tenantInfo, livingExperience: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Would you like to live with noisy neighbors?</label>
                          <select 
                            value={tenantInfo.noisyNeighbors}
                            onChange={(e) => setTenantInfo({...tenantInfo, noisyNeighbors: e.target.value})}
                            className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-blue-700 uppercase">Maintenance Culture Rating (1-10)</label>
                          <input 
                            type="range" 
                            min="1" 
                            max="10"
                            value={tenantInfo.maintenanceRating}
                            onChange={(e) => setTenantInfo({...tenantInfo, maintenanceRating: e.target.value})}
                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="text-center font-bold text-blue-600">{tenantInfo.maintenanceRating} / 10</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-700 uppercase">How would you describe yourself?</label>
                        <textarea 
                          value={tenantInfo.selfDescription}
                          onChange={(e) => setTenantInfo({...tenantInfo, selfDescription: e.target.value})}
                          className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          required
                        />
                      </div>
                    </div>

                    {/* Section 6: Referees */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b pb-1">6. Referees</h4>
                      
                      <div className="p-4 bg-white rounded-2xl border border-blue-100 space-y-4 shadow-sm">
                        <h5 className="font-bold text-blue-700 text-xs uppercase">Referee 1</h5>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input type="text" placeholder="Name" value={tenantInfo.referee1.name} onChange={(e) => setTenantInfo({...tenantInfo, referee1: {...tenantInfo.referee1, name: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Phone" value={tenantInfo.referee1.phone} onChange={(e) => setTenantInfo({...tenantInfo, referee1: {...tenantInfo.referee1, phone: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="email" placeholder="Email" value={tenantInfo.referee1.email} onChange={(e) => setTenantInfo({...tenantInfo, referee1: {...tenantInfo.referee1, email: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Occupation" value={tenantInfo.referee1.occupation} onChange={(e) => setTenantInfo({...tenantInfo, referee1: {...tenantInfo.referee1, occupation: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Relationship" value={tenantInfo.referee1.relationship} onChange={(e) => setTenantInfo({...tenantInfo, referee1: {...tenantInfo.referee1, relationship: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Address" value={tenantInfo.referee1.address} onChange={(e) => setTenantInfo({...tenantInfo, referee1: {...tenantInfo.referee1, address: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-blue-100 space-y-4 shadow-sm">
                        <h5 className="font-bold text-blue-700 text-xs uppercase">Referee 2</h5>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input type="text" placeholder="Name" value={tenantInfo.referee2.name} onChange={(e) => setTenantInfo({...tenantInfo, referee2: {...tenantInfo.referee2, name: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Phone" value={tenantInfo.referee2.phone} onChange={(e) => setTenantInfo({...tenantInfo, referee2: {...tenantInfo.referee2, phone: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="email" placeholder="Email" value={tenantInfo.referee2.email} onChange={(e) => setTenantInfo({...tenantInfo, referee2: {...tenantInfo.referee2, email: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Occupation" value={tenantInfo.referee2.occupation} onChange={(e) => setTenantInfo({...tenantInfo, referee2: {...tenantInfo.referee2, occupation: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Relationship" value={tenantInfo.referee2.relationship} onChange={(e) => setTenantInfo({...tenantInfo, referee2: {...tenantInfo.referee2, relationship: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                          <input type="text" placeholder="Address" value={tenantInfo.referee2.address} onChange={(e) => setTenantInfo({...tenantInfo, referee2: {...tenantInfo.referee2, address: e.target.value}})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" required />
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-blue-400 italic">
                      Please make sure all information provided is correct, as falsehood discovered at any time could disqualify your tenancy application.
                    </p>
                  </motion.div>
                )}

                {tenantInfo.tenantType === 'Old' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="border-b border-blue-200 pb-4">
                      <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">Existing Tenancy Details</h3>
                      <p className="text-blue-600 text-sm font-medium">Manage your current rental contract</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-700 uppercase">When is your tenancy expected to end?</label>
                        <input 
                          type="date" 
                          value={tenantInfo.tenancyEndDate}
                          onChange={(e) => setTenantInfo({...tenantInfo, tenancyEndDate: e.target.value})}
                          min={tenantInfo.oldTenantAction === 'Renewal' ? new Date().toISOString().split('T')[0] : undefined}
                          className={`w-full p-3 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${
                            tenantInfo.oldTenantAction === 'Renewal' && tenantInfo.tenancyEndDate && new Date(tenantInfo.tenancyEndDate) < new Date(new Date().setHours(0,0,0,0))
                              ? 'border-red-500' 
                              : 'border-blue-200'
                          }`}
                          required
                        />
                        {tenantInfo.oldTenantAction === 'Renewal' && tenantInfo.tenancyEndDate && new Date(tenantInfo.tenancyEndDate) < new Date(new Date().setHours(0,0,0,0)) && (
                          <p className="text-red-500 text-[10px] font-bold">Renewal requires a future end date.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-blue-700 uppercase">What would you like to do?</label>
                        <select 
                          value={tenantInfo.oldTenantAction}
                          onChange={(e) => setTenantInfo({...tenantInfo, oldTenantAction: e.target.value})}
                          className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Action</option>
                          <option value="Renewal">Apply for Tenancy Renewal</option>
                          <option value="Payment">Make Payment (Attach Receipt)</option>
                          <option value="Termination">Terminate Rent Contract</option>
                        </select>
                      </div>
                    </div>

                    {tenantInfo.oldTenantAction === 'Renewal' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-6 bg-white rounded-2xl border border-blue-100 space-y-4"
                      >
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            id="accept-agreement"
                            checked={tenantInfo.agreementAccepted}
                            onChange={(e) => setTenantInfo({...tenantInfo, agreementAccepted: e.target.checked})}
                            className="mt-1 w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                            required
                          />
                          <label htmlFor="accept-agreement" className="text-sm text-blue-900 font-bold uppercase tracking-tight">
                            I accept the Tenancy Renewal Agreement
                          </label>
                        </div>

                        <AnimatePresence>
                          {tenantInfo.agreementAccepted && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-4 overflow-hidden"
                            >
                              <div className="flex items-center gap-2 text-blue-900 font-bold mb-2 pt-2 border-t border-blue-50">
                                <Shield className="w-5 h-5" />
                                <h4 className="uppercase tracking-tight">Tenancy Renewal Agreement (Draft)</h4>
                              </div>
                              <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl max-h-60 overflow-y-auto leading-relaxed space-y-4">
                                <p className="font-bold text-center underline">TENANCY AGREEMENT</p>
                                <p>THIS TENANCY AGREEMENT is made this day of 20...</p>
                                <p>BETWEEN: The Landlord (represented by the Agent) AND The Tenant.</p>
                                <p>1. THE LANDLORD agrees to let and the TENANT agrees to take the premises for a further term...</p>
                                <p>2. THE TENANT COVENANTS WITH THE LANDLORD AS FOLLOWS:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>To pay the rent in advance.</li>
                                  <li>To keep the interior of the premises in good repair.</li>
                                  <li>Not to make any structural alterations without consent.</li>
                                  <li>To use the premises for residential/commercial purposes only.</li>
                                </ul>
                                <p>3. REQUIRED DOCUMENTS: Please attach your updated ID and proof of income in the attachments section below.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}

                    {tenantInfo.oldTenantAction === 'Payment' && (
                      <div className="p-6 bg-green-50 rounded-2xl border border-green-100 space-y-4">
                        <div className="flex items-center gap-4 text-green-800">
                          <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                          <p className="text-sm font-medium">Please upload your payment receipt for verification.</p>
                        </div>
                        
                        <div className="space-y-3">
                          <input 
                            type="file" 
                            id="receipt-upload"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setSelectedFiles(prev => [...prev, ...files]);
                            }}
                            className="hidden" 
                          />
                          <label 
                            htmlFor="receipt-upload"
                            className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-green-200 bg-white rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group"
                          >
                            <div className="flex items-center gap-2 text-green-600 group-hover:text-green-700">
                              <Upload className="w-5 h-5" />
                              <span className="font-bold text-sm uppercase">Upload Receipt</span>
                            </div>
                          </label>
                          <p className="text-[10px] text-green-600 text-center font-medium italic">
                            You can also manage all attachments in the section below.
                          </p>
                        </div>
                      </div>
                    )}

                    {tenantInfo.oldTenantAction === 'Termination' && (
                      <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-4 text-amber-800">
                        <X className="w-6 h-6 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase">Notice Period Required</p>
                          <p className="text-sm">Please note that a one-month notice is required for termination. Please state your reason for termination in the <strong>Project Scope</strong> box below.</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ) : null}

            {chosenProduct === 'Industrial Water Solution' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Specific Water Service</label>
                <select 
                  value={chosenSubService}
                  onChange={(e) => setChosenSubService(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">-- Select water service --</option>
                  {WATER_SOLUTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </motion.div>
            )}

            {chosenProduct === 'Sustainable Turnkey Project' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Specific Project Option</label>
                <select 
                  value={chosenSubService}
                  onChange={(e) => setChosenSubService(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="">-- Select project option --</option>
                  {TURNKEY_PROJECT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </motion.div>
            )}

            {chosenProduct === 'Water Hygiene & Care' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-blue-50/50 border-2 border-blue-200 rounded-3xl space-y-8"
              >
                <div className="border-b border-blue-200 pb-4">
                  <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight">Water Sourcing & Treatment Request</h3>
                  <p className="text-[10px] font-bold text-blue-600 uppercase mt-1 tracking-widest">
                    Based on Physical, Analytical or Laboratory Results
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Water Sourcing Details</label>
                    <textarea 
                      value={waterHygieneInfo.sourcing}
                      onChange={(e) => setWaterHygieneInfo({...waterHygieneInfo, sourcing: e.target.value})}
                      placeholder="Details about ground water, deep or shallow borehole..." 
                      className="w-full p-4 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment Needs</label>
                    <textarea 
                      value={waterHygieneInfo.treatment}
                      onChange={(e) => setWaterHygieneInfo({...waterHygieneInfo, treatment: e.target.value})}
                      placeholder="Describe water treatment requirements..." 
                      className="w-full p-4 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wastewater Solutions</label>
                    <textarea 
                      value={waterHygieneInfo.wastewater}
                      onChange={(e) => setWaterHygieneInfo({...waterHygieneInfo, wastewater: e.target.value})}
                      placeholder="Describe wastewater solution requirements..." 
                      className="w-full p-4 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 text-center p-6 bg-white rounded-2xl border border-blue-100 shadow-inner">
                    <label className="text-sm font-bold text-slate-700 block mb-4">Site Visit Count</label>
                    <div className="flex items-center justify-center gap-6">
                      <button 
                        type="button"
                        onClick={() => setWaterHygieneInfo(prev => ({ ...prev, siteVisitCount: Math.max(0, prev.siteVisitCount - 1) }))}
                        className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-all font-black text-xl"
                      >
                        -
                      </button>
                      <span className="text-4xl font-black text-blue-900 w-16">{waterHygieneInfo.siteVisitCount}</span>
                      <button 
                        type="button"
                        onClick={() => setWaterHygieneInfo(prev => ({ ...prev, siteVisitCount: prev.siteVisitCount + 1 }))}
                        className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all font-black text-xl shadow-lg shadow-blue-200"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analytical / Lab Results</label>
                    <textarea 
                      value={waterHygieneInfo.results}
                      onChange={(e) => setWaterHygieneInfo({...waterHygieneInfo, results: e.target.value})}
                      placeholder="Paste your physical, analytical or laboratory results here for professional advice..." 
                      className="w-full p-4 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>

                  <div className="p-4 bg-blue-100/50 rounded-xl border border-blue-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Please include document, image or video attachments in the section below for a more comprehensive solution request.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Project Scope</label>
              <textarea 
                value={custMsg}
                onChange={(e) => setCustMsg(e.target.value)}
                placeholder="Describe your project requirements..." 
                className="w-full p-4 bg-gray-50 border border-slate-200 rounded-xl h-40 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              ></textarea>
            </div>

            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="need-account"
                  checked={needAccountInfo}
                  onChange={(e) => setNeedAccountInfo(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="need-account" className="text-sm font-bold text-blue-900 uppercase tracking-tight cursor-pointer">
                  Do you need the company's account details for payment?
                </label>
              </div>
              
              <AnimatePresence>
                {needAccountInfo && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-2 shadow-sm">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Official Account Details</span>
                      </div>
                      <p className="text-sm font-black text-slate-900">Account Number: <span className="text-blue-600 select-all">1017095658</span></p>
                      <p className="text-sm font-bold text-slate-700">Name: Crestechnologies Ideal Solution Ltd</p>
                      <p className="text-sm font-bold text-slate-700">Bank: Zenith Bank</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Attachments (Optional)</label>
              <div className="space-y-3">
                <input 
                  type="file" 
                  id="file-upload"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setSelectedFiles(prev => [...prev, ...files]);
                  }}
                  className="hidden" 
                />
                <label 
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex flex-col items-center gap-1 text-slate-500 group-hover:text-blue-600">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="font-bold">Click to add files</span>
                    <span className="text-xs">PDF, JPG, PNG, DOCX (Max 10MB each)</span>
                  </div>
                </label>

                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs truncate">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {user && (
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">
                  Linked to: {user.email}
                </p>
              )}
            </div>
            
            {formError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{formError}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isUploading}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/20 text-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Submit Request to Engineering'
              )}
            </button>
          </form>
        )}
      </>
    )}
  </div>
</section>

      {/* Tenant Details Modal */}
      <AnimatePresence>
        {selectedInquiryForDetails && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiryForDetails(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Inquiry Details</h2>
                  <p className="text-slate-500 text-sm font-medium">From {selectedInquiryForDetails.name} • {selectedInquiryForDetails.time}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Assigned To</p>
                    <select 
                      value={selectedInquiryForDetails.assignedTo || ''}
                      onChange={(e) => {
                        const selectedUser = allUsers.find(u => u.uid === e.target.value);
                        const userName = selectedUser ? selectedUser.displayName : 'Unassigned';
                        assignInquiry(selectedInquiryForDetails.id, e.target.value, userName);
                        setSelectedInquiryForDetails({
                          ...selectedInquiryForDetails, 
                          assignedTo: e.target.value,
                          assignedToName: userName
                        });
                      }}
                      className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer bg-white"
                    >
                      <option value="">Unassigned</option>
                      {allUsers.map(u => (
                        <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status</p>
                    <select 
                      value={selectedInquiryForDetails.status}
                      onChange={(e) => {
                        updateInquiryStatus(selectedInquiryForDetails.id, e.target.value);
                        setSelectedInquiryForDetails({...selectedInquiryForDetails, status: e.target.value as any});
                      }}
                      className={`text-xs font-black uppercase px-4 py-2 rounded-xl border outline-none transition-colors cursor-pointer ${
                        selectedInquiryForDetails.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
                        selectedInquiryForDetails.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                      }`}
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <button onClick={() => setSelectedInquiryForDetails(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors mt-4">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {/* Basic Contact Info */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Email Address</p>
                    <p className="text-slate-900 font-bold truncate">{selectedInquiryForDetails.email || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Phone Number</p>
                    <p className="text-slate-900 font-bold">{selectedInquiryForDetails.phone || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Company / Location</p>
                    <p className="text-slate-900 font-bold truncate">{selectedInquiryForDetails.company || selectedInquiryForDetails.location || 'N/A'}</p>
                  </div>
                </div>

                {/* Service Info */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">Service Requested</h4>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Main Service</p>
                      <p className="text-slate-900 font-black text-lg uppercase tracking-tighter">{selectedInquiryForDetails.product}</p>
                    </div>
                    {selectedInquiryForDetails.subService && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sub-Service / Facility</p>
                        <p className="text-blue-900 font-bold">{selectedInquiryForDetails.subService}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-1">
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Message / Project Scope</h4>
                      {selectedInquiryForDetails.message && selectedInquiryForDetails.message.length > 20 && !selectedInquiryForDetails.summary && (
                        <button
                          onClick={() => summarizeInquiry(selectedInquiryForDetails)}
                          disabled={summarizingId === selectedInquiryForDetails.id}
                          className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {summarizingId === selectedInquiryForDetails.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Summarize
                        </button>
                      )}
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 min-h-[100px]">
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedInquiryForDetails.message || 'No additional message provided.'}
                      </p>
                    </div>
                    {selectedInquiryForDetails.summary && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <p className="text-[10px] uppercase font-black text-amber-600 tracking-widest">AI Summary</p>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed italic">
                          {selectedInquiryForDetails.summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tenant Questionnaire (Conditional) */}
                {selectedInquiryForDetails.tenantInfo && (
                  <div className="space-y-10 pt-10 border-t border-slate-100">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className={`p-3 rounded-xl ${selectedInquiryForDetails.tenantInfo.tenantType === 'New' ? 'bg-blue-600 text-white' : 'bg-blue-900 text-white'}`}>
                        {selectedInquiryForDetails.tenantInfo.tenantType === 'New' ? <User className="w-6 h-6" /> : <Building className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest">Tenancy Status</p>
                        <p className="text-blue-900 font-bold text-lg uppercase tracking-tighter">
                          {selectedInquiryForDetails.tenantInfo.tenantType === 'New' ? 'New Tenant Application' : 'Existing Tenant Management'}
                        </p>
                      </div>
                    </div>

                    {selectedInquiryForDetails.tenantInfo.tenantType === 'Old' ? (
                      <div className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">Tenancy Details</h4>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expected End Date</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.tenancyEndDate}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">Requested Action</h4>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Action Type</p>
                              <p className="text-blue-900 font-black text-lg uppercase tracking-tighter">{selectedInquiryForDetails.tenantInfo.oldTenantAction}</p>
                            </div>
                          </div>
                        </div>

                        {selectedInquiryForDetails.tenantInfo.oldTenantAction === 'Renewal' && (
                          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                            <div className="flex items-center gap-2 text-blue-900 font-bold">
                              <Shield className="w-5 h-5" />
                              <h4 className="uppercase tracking-tight">Agreement Status</h4>
                            </div>
                            <div className={`flex items-center gap-3 p-4 rounded-xl ${selectedInquiryForDetails.tenantInfo.agreementAccepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {selectedInquiryForDetails.tenantInfo.agreementAccepted ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                              <p className="font-bold">
                                {selectedInquiryForDetails.tenantInfo.agreementAccepted 
                                  ? 'Tenant has accepted the Tenancy Renewal Agreement terms.' 
                                  : 'Tenant has NOT accepted the agreement terms.'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Basic Info */}
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">Property Details</h4>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Interested Property</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.propertyAddress}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Address</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.currentAddress}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">Personal Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Marital Status</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.maritalStatus}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupation</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.occupation}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Origin / LGA</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.stateOfOrigin} / {selectedInquiryForDetails.tenantInfo.lga}</p>
                            </div>
                          </div>
                        </div>

                        {/* Employment */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">Employment Information</h4>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Employer Name</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.employerName}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Employer Address</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.employerAddress}</p>
                            </div>
                          </div>
                        </div>

                        {/* Tenancy History */}
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest border-b pb-1">Tenancy History</h4>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Relocation Reason</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.relocationReason}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Eviction History</p>
                              <p className={`font-bold ${selectedInquiryForDetails.tenantInfo.hasBeenEvicted === 'Yes' ? 'text-red-600' : 'text-green-600'}`}>
                                {selectedInquiryForDetails.tenantInfo.hasBeenEvicted}
                                {selectedInquiryForDetails.tenantInfo.hasBeenEvicted === 'Yes' && ` - ${selectedInquiryForDetails.tenantInfo.evictionDetails}`}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">Current Landlord</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Name</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.currentLandlordName}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.currentLandlordPhone}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email / Address</p>
                              <p className="text-slate-900 font-bold text-xs">{selectedInquiryForDetails.tenantInfo.currentLandlordEmail} / {selectedInquiryForDetails.tenantInfo.currentLandlordAddress}</p>
                            </div>
                          </div>
                        </div>

                        {/* Lifestyle */}
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="bg-blue-50 p-4 rounded-xl space-y-2">
                            <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Intended Use</p>
                            <p className="text-blue-900 font-bold">{selectedInquiryForDetails.tenantInfo.intendedUse}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-xl space-y-2">
                            <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Move-in Date</p>
                            <p className="text-blue-900 font-bold">{selectedInquiryForDetails.tenantInfo.plannedMoveInDate}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-xl space-y-2">
                            <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Pets</p>
                            <p className="text-blue-900 font-bold">{selectedInquiryForDetails.tenantInfo.hasPets}</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-1">Household & Lifestyle</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Apartments</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.apartmentsInterested}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Family Size</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.familySize}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daily Schedule</p>
                              <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.dailySchedule}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Late Hours</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.lateHours}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Host Meetings</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.hostMeetings}</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b pb-1">Preferences & Self</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Noisy Neighbors</p>
                                <p className="text-slate-900 font-bold">{selectedInquiryForDetails.tenantInfo.noisyNeighbors}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Maintenance (1-10)</p>
                                <p className="text-blue-600 font-black">{selectedInquiryForDetails.tenantInfo.maintenanceRating}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Self Description</p>
                              <p className="text-slate-900 font-medium text-sm italic">"{selectedInquiryForDetails.tenantInfo.selfDescription}"</p>
                            </div>
                          </div>
                        </div>

                        {/* Referees */}
                        <div className="space-y-6">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1">Referees</h4>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Referee 1</p>
                              <p className="font-bold text-slate-900">{selectedInquiryForDetails.tenantInfo.referee1.name}</p>
                              <div className="text-xs space-y-1 text-slate-600">
                                <p>{selectedInquiryForDetails.tenantInfo.referee1.phone} | {selectedInquiryForDetails.tenantInfo.referee1.email}</p>
                                <p>{selectedInquiryForDetails.tenantInfo.referee1.occupation} ({selectedInquiryForDetails.tenantInfo.referee1.relationship})</p>
                                <p>{selectedInquiryForDetails.tenantInfo.referee1.address}</p>
                              </div>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Referee 2</p>
                              <p className="font-bold text-slate-900">{selectedInquiryForDetails.tenantInfo.referee2.name}</p>
                              <div className="text-xs space-y-1 text-slate-600">
                                <p>{selectedInquiryForDetails.tenantInfo.referee2.phone} | {selectedInquiryForDetails.tenantInfo.referee2.email}</p>
                                <p>{selectedInquiryForDetails.tenantInfo.referee2.occupation} ({selectedInquiryForDetails.tenantInfo.referee2.relationship})</p>
                                <p>{selectedInquiryForDetails.tenantInfo.referee2.address}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedInquiryForDetails.waterHygieneInfo && (
                      <div className="space-y-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <Droplets className="w-5 h-5 text-blue-600" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-1 w-full">Water Hygiene Details</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Water Sourcing</p>
                            <p className="text-slate-900 font-bold whitespace-pre-wrap text-sm">{selectedInquiryForDetails.waterHygieneInfo.sourcing || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Treatment Needs</p>
                            <p className="text-slate-900 font-bold whitespace-pre-wrap text-sm">{selectedInquiryForDetails.waterHygieneInfo.treatment || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wastewater Solutions</p>
                            <p className="text-slate-900 font-bold whitespace-pre-wrap text-sm">{selectedInquiryForDetails.waterHygieneInfo.wastewater || 'N/A'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Site Visit Count</p>
                            <p className="text-blue-600 font-black text-2xl">{selectedInquiryForDetails.waterHygieneInfo.siteVisitCount || 0}</p>
                          </div>
                        </div>
                        <div className="space-y-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Analytical / Lab Results</p>
                          <p className="text-blue-900 font-bold text-sm whitespace-pre-wrap italic">
                            {selectedInquiryForDetails.waterHygieneInfo.results || 'No results provided.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments Section in Modal */}
                {selectedInquiryForDetails.files && selectedInquiryForDetails.files.length > 0 && (
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-1">Attached Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedInquiryForDetails.files.map((file, idx) => (
                        <a 
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                        >
                          <div className="p-2 bg-white rounded-lg text-blue-600 group-hover:text-blue-700 shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Click to view</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedInquiryForDetails(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {/* Feedback & Reviews Section */}
      <section className="py-24 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Feedback Form */}
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-slate-100">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Customer Feedback</h2>
                <p className="text-slate-500">Your experience helps us grow and improve.</p>
              </div>
              
              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Name</label>
                    <input 
                      type="text" 
                      value={feedbackForm.name}
                      onChange={(e) => setFeedbackForm({...feedbackForm, name: e.target.value})}
                      placeholder="Your Name"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email (Optional)</label>
                    <input 
                      type="email" 
                      value={feedbackForm.email}
                      onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})}
                      placeholder="For appreciation response"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackForm({...feedbackForm, rating: star})}
                        className={`p-2 transition-all ${feedbackForm.rating >= star ? 'text-amber-400' : 'text-slate-200'}`}
                      >
                        <Star className={`w-8 h-8 ${feedbackForm.rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Review</label>
                  <textarea 
                    value={feedbackForm.comment}
                    onChange={(e) => setFeedbackForm({...feedbackForm, comment: e.target.value})}
                    placeholder="Tell us about your experience..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-32 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                  ></textarea>
                </div>
                
                <button 
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Feedback
                </button>
                
                <AnimatePresence>
                  {feedbackSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-green-50 text-green-700 rounded-xl font-bold text-center border border-green-100"
                    >
                      Thank you! We've received your feedback.
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
            
            {/* Reviews Display */}
            <div className="space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">What Clients Say</h2>
                  <p className="text-slate-500">Real reviews from our engineering partners.</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-4xl font-black text-blue-600">{feedbacks.length}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Reviews</p>
                </div>
              </div>
              
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {feedbacks.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold italic">No reviews yet. Be the first to leave one!</p>
                  </div>
                ) : (
                  feedbacks.map((fb, idx) => (
                    <motion.div 
                      key={fb.id}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black">
                            {fb.name ? fb.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{fb.name || 'Anonymous Client'}</p>
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < fb.rating ? 'fill-current' : 'text-slate-200'}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {fb.createdAt instanceof Timestamp ? fb.createdAt.toDate().toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm italic leading-relaxed">"{fb.comment}"</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-white py-16 border-t text-center px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/Logo2.png" alt="Crestechnologies Logo" className="h-12 w-auto" referrerPolicy="no-referrer" />
            <div className="text-lg font-black text-slate-900 tracking-tighter uppercase">
              CRESTECHNOLOGIES <span className="text-slate-500 font-medium">I S LTD</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-10 mb-10 text-left">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase tracking-widest text-sm border-b pb-2">Head Office</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                11 Jibewa Somorin Close,<br />
                Ojodu, Lagos Nigeria
              </p>
              <p className="text-slate-900 font-bold text-sm">
                Phone: +2349069425552
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 uppercase tracking-widest text-sm border-b pb-2">Branch Office</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Erith, London,<br />
                DA8 2PW, United Kingdom
              </p>
              <p className="text-slate-900 font-bold text-sm">
                Phone: +447957247904
              </p>
            </div>
          </div>

          <div className="mb-10">
            <h4 className="font-bold text-slate-900 uppercase tracking-widest text-sm mb-4">Email Addresses</h4>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-blue-600">
              <a href="mailto:crestiton@gmail.com" className="hover:underline">crestiton@gmail.com</a>
              <span className="text-slate-300 hidden md:inline">|</span>
              <a href="mailto:Crestechnologies@Outlook.com" className="hover:underline">Crestechnologies@Outlook.com</a>
              <span className="text-slate-300 hidden md:inline">|</span>
              <a href="mailto:Crestechnologiesltd@gmail.com" className="hover:underline">Crestechnologiesltd@gmail.com</a>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">Engineering Excellence & Compliance</p>
            <p className="text-slate-400 text-[10px]">© 2024 Crestechnologies I S Ltd. All rights reserved.</p>
            <button 
              onClick={() => setShowRentalDashboard(true)}
              className="mt-4 text-[10px] text-slate-300 hover:text-slate-500 uppercase tracking-widest font-bold transition-colors"
            >
              Admin Login
            </button>
          </div>
        </div>
      </footer>

      <RentalDashboard 
        isOpen={showRentalDashboard} 
        onClose={() => { setShowRentalDashboard(false); setDashboardError(null); setDeleteConfirm(null); }}
        isAuth={isRentalAuth}
        onLogin={handleRentalLogin}
        password={rentalPassword}
        setPassword={setRentalPassword}
        records={rentalRecords}
        onAdd={addRentalRecord}
        onUpdate={updateRentalRecord}
        onDelete={deleteRentalRecord}
        onEdit={startEditRental}
        onReceipt={generateReceipt}
        form={rentalForm}
        setForm={setRentalForm}
        editingRecord={editingRentalRecord}
        setEditingRecord={setEditingRentalRecord}
        onLogout={handleRentalLogout}
        // Property Management Props
        availableProperties={availableProperties}
        onAddProperty={addAvailableProperty}
        onUpdateProperty={updateAvailableProperty}
        onDeleteProperty={deleteAvailableProperty}
        onEditProperty={startEditProperty}
        propertyForm={propertyForm}
        setPropertyForm={setPropertyForm}
        editingProperty={editingProperty}
        setEditingProperty={setEditingProperty}
        error={dashboardError}
        setError={setDashboardError}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        // Worksheet Management Props
        worksheets={worksheets}
        onWorksheetUpload={handleWorksheetUpload}
        onDeleteWorksheet={deleteWorksheet}
        isUploadingWorksheet={isUploadingWorksheet}
        // Property Image Upload Props
        onPropertyImageUpload={handlePropertyImageUpload}
        isUploadingPropertyImages={isUploadingPropertyImages}
        // Inquiry Management Props
        inquiries={inquiries}
        updateInquiryStatus={updateInquiryStatus}
        setSelectedInquiryForDetails={setSelectedInquiryForDetails}
        // Advertisement Management Props
        advertisements={advertisements}
        onAddAdvert={addAdvert}
        onDeleteAdvert={deleteAdvert}
        onToggleAdvertStatus={toggleAdvertStatus}
        onRenewAdvert={renewAdvert}
        advertForm={advertForm}
        setAdvertForm={setAdvertForm}
        editingAdvert={editingAdvert}
        setEditingAdvert={setEditingAdvert}
        showAdvertForm={showAdvertForm}
        setShowAdvertForm={setShowAdvertForm}
        allUsers={allUsers}
        // Import Props
        isImporting={isImporting}
        setIsImporting={setIsImporting}
        debugLog={debugLog}
        setDebugLog={setDebugLog}
        addLog={addLog}
        viewCount={viewCount}
        interactionCount={interactionCount}
        siteVisitCount={siteVisitCount}
        handleGoogleLogin={handleGoogleLogin}
        promoteToAdmin={promoteToAdmin}
        // Profile Props
        user={user}
        userProfile={userProfile}
        isEditingProfile={isEditingProfile}
        setIsEditingProfile={setIsEditingProfile}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        updateUserProfile={updateUserProfile}
        isSavingProfile={isSavingProfile}
      />

      <PropertyFinder 
        isOpen={showPropertyFinder}
        onClose={() => setShowPropertyFinder(false)}
        properties={availableProperties.filter(p => p.isAvailable)}
        onSelect={(property: AvailableProperty) => {
          setSelectedProperty(property);
          setChosenProduct('Facility Management');
          setChosenSubService('Property rental & Management: Property letting, sales, management and consultancy');
          setTenantInfo({
            ...tenantInfo,
            tenantType: 'New',
            propertyAddress: property.address,
            apartmentsInterested: property.unitType
          });
          setShowPropertyFinder(false);
          setTimeout(() => {
            inquiryRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      />
    </div>
  );
}

function RentalDashboard({ 
  isOpen, 
  onClose, 
  isAuth, 
  onLogin, 
  password, 
  setPassword, 
  records, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onEdit, 
  onReceipt,
  form,
  setForm,
  editingRecord,
  setEditingRecord,
  onLogout,
  // Property Management Props
  availableProperties,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onEditProperty,
  propertyForm,
  setPropertyForm,
  editingProperty,
  setEditingProperty,
  error,
  setError,
  deleteConfirm,
  setDeleteConfirm,
  // Worksheet Management Props
  worksheets,
  onWorksheetUpload,
  onDeleteWorksheet,
  isUploadingWorksheet,
  // Property Image Upload Props
  onPropertyImageUpload,
  isUploadingPropertyImages,
  // Inquiry Management Props
  inquiries,
  updateInquiryStatus,
  setSelectedInquiryForDetails,
  // Advertisement Management Props
  advertisements,
  onAddAdvert,
  onDeleteAdvert,
  onToggleAdvertStatus,
  onRenewAdvert,
  advertForm,
  setAdvertForm,
  editingAdvert,
  setEditingAdvert,
  showAdvertForm,
  setShowAdvertForm,
  allUsers,
  // Profile Props
  user,
  userProfile,
  isEditingProfile,
  setIsEditingProfile,
  profileForm,
  setProfileForm,
  updateUserProfile,
  isSavingProfile,
  // Import Props
  isImporting,
  setIsImporting,
  debugLog,
  setDebugLog,
  addLog,
  viewCount,
  interactionCount,
  siteVisitCount,
  handleGoogleLogin,
  promoteToAdmin
}: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants', 'properties', 'inquiries', or 'adverts'
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  
  // Inquiry Filters
  const [inquirySearchTerm, setInquirySearchTerm] = useState('');
  const [inquiryFilterStatus, setInquiryFilterStatus] = useState('All');
  const [inquiryFilterAssignedTo, setInquiryFilterAssignedTo] = useState('All');
  const [inquiryFilterDate, setInquiryFilterDate] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const arrearsTotal = records.reduce((acc: number, r: any) => {
    const isArrears = r.expiry && new Date(r.expiry) < new Date();
    return isArrears ? acc + r.amount : acc;
  }, 0);

  const annualRevenue = records.reduce((acc: number, r: any) => acc + r.amount, 0);

  const filteredRecords = records.filter((r: any) => 
    r.unit.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.tenant.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInquiries = inquiries.filter((inquiry: any) => {
    const matchesSearch = 
      inquiry.name.toLowerCase().includes(inquirySearchTerm.toLowerCase()) ||
      inquiry.company.toLowerCase().includes(inquirySearchTerm.toLowerCase()) ||
      inquiry.message?.toLowerCase().includes(inquirySearchTerm.toLowerCase());
    
    const matchesStatus = inquiryFilterStatus === 'All' || inquiry.status === inquiryFilterStatus;
    
    const matchesAssignedTo = inquiryFilterAssignedTo === 'All' || 
                             (inquiryFilterAssignedTo === 'Unassigned' ? !inquiry.assignedTo : inquiry.assignedTo === inquiryFilterAssignedTo);

    const matchesDate = !inquiryFilterDate || 
      (inquiry.fullDate && inquiry.fullDate.toISOString().split('T')[0] === inquiryFilterDate);

    return matchesSearch && matchesStatus && matchesAssignedTo && matchesDate;
  });

  // Chart data
  const locationDataMap: Record<string, number> = {};
  filteredRecords.forEach((r: any) => {
    const loc = r.unit.split(',').pop()?.trim() || 'Unknown';
    locationDataMap[loc] = (locationDataMap[loc] || 0) + r.amount;
  });

  const chartData = Object.entries(locationDataMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900 flex flex-col overflow-hidden">
      {!isAuth ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md text-center space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Admin Dashboard</h2>
              <p className="text-slate-500 text-sm">Enter access code</p>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="****"
              className={`w-full p-4 bg-slate-50 border-2 rounded-2xl text-center text-2xl font-black tracking-[1em] outline-none transition-all ${error ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-slate-100 focus:border-green-500'}`}
              maxLength={4}
            />
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs font-bold uppercase tracking-widest"
              >
                {error}
              </motion.p>
            )}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={onLogin}
                  className="flex-1 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
                >
                  Unlock
                </button>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Or authorized access</p>
                {user ? (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 text-left">
                      <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                      <div>
                        <p className="text-xs font-black text-slate-900 truncate max-w-[150px]">{user.displayName || user.email}</p>
                        <p className="text-[10px] text-slate-500 font-bold">Signed in</p>
                      </div>
                    </div>
                    <button onClick={() => auth.signOut()} className="text-[10px] font-black text-red-500 hover:underline uppercase">Sign Out</button>
                  </div>
                ) : (
                  <button 
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 border-2 border-slate-200 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Header */}
          <header className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="bg-green-500 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter">Unified Admin Dashboard</h1>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <Clock className="w-3 h-3" />
                  {currentTime.toLocaleString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onLogout}
                className="bg-slate-800 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
              <button 
                onClick={onClose}
                className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Exit Dashboard
              </button>
            </div>
          </header>

          <div className="bg-slate-100 px-6 py-2 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized As:</p>
              {user ? (
                <div className="flex items-center gap-2">
                  <img src={user.photoURL || ''} alt="" className="w-5 h-5 rounded-full border border-slate-300" referrerPolicy="no-referrer" />
                  <span className="text-xs font-bold text-slate-700">{user.email} (UID: {user.uid.slice(0,5)}...)</span>
                  {userProfile?.role === 'admin' ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-widest">Admin Privilege</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[8px] font-black uppercase tracking-widest">Guest Access</span>
                      <button 
                        onClick={promoteToAdmin}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-md"
                      >
                        Activate Admin
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 italic">No Google Account linked</span>
                  <button 
                    onClick={handleGoogleLogin}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                  >
                    Link Admin Email
                  </button>
                </div>
              )}
            </div>
            {user && (
              <button 
                onClick={() => auth.signOut()}
                className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest"
              >
                Sign Out
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="bg-white border-b border-slate-200 px-6 flex gap-8 overflow-x-auto">
            <button 
              onClick={() => { setActiveTab('inquiries'); setError(null); setDeleteConfirm(null); }}
              className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'inquiries' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Inquiries
            </button>
            <button 
              onClick={() => { setActiveTab('tenants'); setError(null); setDeleteConfirm(null); }}
              className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'tenants' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Tenant Records
            </button>
            <button 
              onClick={() => { setActiveTab('properties'); setError(null); setDeleteConfirm(null); }}
              className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'properties' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Available Properties
            </button>
            <button 
              onClick={() => { setActiveTab('worksheets'); setError(null); setDeleteConfirm(null); }}
              className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'worksheets' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Worksheets
            </button>
            <button 
              onClick={() => { setActiveTab('adverts'); setError(null); setDeleteConfirm(null); }}
              className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'adverts' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Adverts
            </button>
            <button 
              onClick={() => { setActiveTab('profile'); setError(null); setDeleteConfirm(null); }}
              className={`py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'profile' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              My Profile
            </button>
          </div>

          <main className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Views</p>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <p className="text-2xl font-black text-slate-900">{viewCount}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Interactions</p>
                <div className="flex items-center gap-2">
                  <MousePointer2 className="w-4 h-4 text-green-600" />
                  <p className="text-2xl font-black text-slate-900">{interactionCount}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Site Visits</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                  <p className="text-2xl font-black text-slate-900">{siteVisitCount}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Inquiries</p>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <p className="text-2xl font-black text-slate-900">{inquiries.length}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Tenants</p>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <p className="text-2xl font-black text-slate-900">{records.length}</p>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-bold">{error}</span>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {importSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-bold">{importSuccess}</span>
                </div>
                <button onClick={() => setImportSuccess(null)} className="text-green-400 hover:text-green-600">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {debugLog.length > 0 && (
              <div className="p-4 bg-slate-900 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Import Debug Log</h4>
                  <button onClick={() => setDebugLog([])} className="text-[10px] font-bold text-slate-500 hover:text-slate-300">Clear</button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[10px]">
                  {debugLog.map((log, i) => (
                    <div key={i} className="text-slate-300 border-l-2 border-slate-700 pl-2 py-0.5">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deleteConfirm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-white border-2 border-red-100 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-red-100 p-3 rounded-2xl">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Confirm Deletion</h4>
                    <p className="text-sm text-slate-500 font-medium">This action is permanent and cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 md:flex-none px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (deleteConfirm.type === 'rental') onDelete(deleteConfirm.id);
                      else onDeleteProperty(deleteConfirm.id);
                    }}
                    className="flex-1 md:flex-none px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                  >
                    Delete Permanently
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'inquiries' && (
              <div className="space-y-8">
                {/* Inquiry Filters */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-6 items-end">
                  <div className="flex-1 min-w-[250px] space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Inquiries</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search name, company, or message..."
                        value={inquirySearchTerm}
                        onChange={(e) => setInquirySearchTerm(e.target.value)}
                        className="block w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                    <select 
                      value={inquiryFilterStatus}
                      onChange={(e) => setInquiryFilterStatus(e.target.value)}
                      className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="All">All Statuses</option>
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</label>
                    <select 
                      value={inquiryFilterAssignedTo}
                      onChange={(e) => setInquiryFilterAssignedTo(e.target.value)}
                      className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="All">All Team</option>
                      <option value="Unassigned">Unassigned</option>
                      {allUsers.map(u => (
                        <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                    <input 
                      type="date" 
                      value={inquiryFilterDate}
                      onChange={(e) => setInquiryFilterDate(e.target.value)}
                      className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => { 
                      setInquiryFilterStatus('All'); 
                      setInquiryFilterAssignedTo('All');
                      setInquiryFilterDate(''); 
                      setInquirySearchTerm(''); 
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors pb-4"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-xl mb-6 border-b pb-4 text-slate-800 flex items-center gap-2">
                      <ClipboardCheck className="text-blue-500" /> Task Queue
                    </h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {filteredInquiries.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <p className="text-slate-400 font-bold italic">No inquiries match your filters.</p>
                        </div>
                      ) : (
                        filteredInquiries.map((inquiry: any) => (
                          <motion.div 
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            key={inquiry.id}
                            className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Inquiry from</span>
                                <h4 className="font-black text-slate-900 text-lg leading-tight">{inquiry.name}</h4>
                              </div>
                              <select 
                                value={inquiry.status}
                                onChange={(e) => updateInquiryStatus(inquiry.id, e.target.value)}
                                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border outline-none transition-colors cursor-pointer ${
                                  inquiry.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
                                  inquiry.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                  'bg-blue-100 text-blue-700 border-blue-200'
                                }`}
                              >
                                <option value="New">New</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Service</p>
                                <p className="font-bold text-slate-700">{inquiry.product}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Assigned To</p>
                                <p className={`font-bold ${inquiry.assignedToName ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                                  {inquiry.assignedToName || 'Unassigned'}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {inquiry.tenantInfo ? (
                                <button 
                                  onClick={() => setSelectedInquiryForDetails(inquiry)}
                                  className="flex-1 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                >
                                  <ClipboardCheck className="w-4 h-4" />
                                  Questionnaire
                                </button>
                              ) : null}
                              <button 
                                onClick={() => setSelectedInquiryForDetails(inquiry)}
                                className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Details
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-xl mb-6 border-b pb-4 text-slate-800 flex items-center gap-2">
                      <Shield className="text-slate-400" /> History Log
                    </h3>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {filteredInquiries.map((inquiry: any) => (
                        <div key={inquiry.id} className="p-3 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors rounded-xl">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{inquiry.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black">{inquiry.time} | {inquiry.fullDate.toLocaleDateString()}</span>
                          </div>
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">{inquiry.product}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tenants' && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Units</p>
                      <p className="text-3xl font-black text-slate-900">{records.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-6">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Arrears Total</p>
                      <p className="text-3xl font-black text-red-600">₦ {arrearsTotal.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-6">
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Annual Revenue</p>
                      <p className="text-3xl font-black text-green-600">₦ {annualRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Entry Form */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-green-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <Plus className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                      {editingRecord ? 'Update Tenant Record' : 'New Tenant & Property Entry'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property & Location</label>
                      <input 
                        type="text" 
                        value={form.unit}
                        onChange={(e) => setForm({...form, unit: e.target.value})}
                        placeholder="e.g. 2BDR Flat, Ojodu"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Tenant Name</label>
                      <input 
                        type="text" 
                        value={form.tenant}
                        onChange={(e) => setForm({...form, tenant: e.target.value})}
                        placeholder="Name"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenant Email</label>
                      <input 
                        type="email" 
                        value={form.email}
                        onChange={(e) => setForm({...form, email: e.target.value})}
                        placeholder="tenant@example.com"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rent Amount (₦)</label>
                      <input 
                        type="number" 
                        value={form.amount}
                        onChange={(e) => setForm({...form, amount: e.target.value})}
                        placeholder="0.00"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                      <input 
                        type="date" 
                        value={form.start}
                        onChange={(e) => setForm({...form, start: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</label>
                      <input 
                        type="date" 
                        value={form.expiry}
                        onChange={(e) => setForm({...form, expiry: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</label>
                      <input 
                        type="text" 
                        value={form.notes}
                        onChange={(e) => setForm({...form, notes: e.target.value})}
                        placeholder="Notes"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                    {editingRecord ? (
                      <>
                        <button 
                          onClick={onUpdate}
                          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                        >
                          Apply Changes
                        </button>
                        <button 
                          onClick={() => {
                            setEditingRecord(null);
                            setForm({ unit: '', tenant: '', amount: '', start: '', expiry: '', notes: '' });
                          }}
                          className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                        >
                          Cancel Edit
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={onAdd}
                        className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
                      >
                        Save New Record
                      </button>
                    )}
                    <button 
                      onClick={() => setForm({ unit: '', tenant: '', amount: '', start: '', expiry: '', notes: '' })}
                      className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Clear Fields
                    </button>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Revenue Comparison</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [`₦ ${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Tenant Records</h3>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const csvData = records.map((r: any) => ({
                              Unit: r.unit,
                              Tenant: r.tenant,
                              Email: r.email || '',
                              Amount: r.amount,
                              Start: r.start,
                              Expiry: r.expiry,
                              Notes: r.notes
                            }));
                            const csv = Papa.unparse(csvData);
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.setAttribute("href", url);
                            link.setAttribute("download", `tenant_records_${new Date().toISOString().split('T')[0]}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          title="Export to CSV"
                        >
                          <Download className="w-3 h-3" /> Export
                        </button>
                        <label className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer ${isImporting ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
                          {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />} 
                          {isImporting ? 'Importing...' : 'Import'}
                          <input 
                            type="file" 
                            accept=".csv,text/csv" 
                            className="hidden" 
                            disabled={isImporting}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                addLog(`File selected: ${file.name} (${file.size} bytes)`);
                                setIsImporting(true);
                                setError(null);
                                setImportSuccess(null);

                                Papa.parse(file, {
                                  header: true,
                                  skipEmptyLines: true,
                                  complete: async (results) => {
                                    const rows = results.data as any[];
                                    addLog(`Parse complete. Starting import for ${rows.length} rows.`);
                                    let count = 0;
                                    let errors = 0;
                                    let errorMessages: string[] = [];

                                    for (let i = 0; i < rows.length; i++) {
                                      const row = rows[i];
                                      const rowNum = i + 1;
                                      try {
                                        addLog(`Processing row ${rowNum}...`);
                                        const record: any = {};
                                        Object.keys(row).forEach(key => {
                                          let normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                                          
                                          if (normalizedKey.includes('unit') || normalizedKey.includes('property') || normalizedKey.includes('location')) {
                                            normalizedKey = 'unit';
                                          } else if (normalizedKey.includes('tenant') || normalizedKey.includes('name')) {
                                            normalizedKey = 'tenant';
                                          } else if (normalizedKey.includes('amount') || normalizedKey.includes('rent') || normalizedKey.includes('price')) {
                                            normalizedKey = 'amount';
                                          } else if (normalizedKey.includes('expiry') || normalizedKey.includes('end')) {
                                            normalizedKey = 'expiry';
                                          } else if (normalizedKey.includes('start') || normalizedKey.includes('lastpayment')) {
                                            normalizedKey = 'start';
                                          } else if (normalizedKey.includes('note')) {
                                            normalizedKey = 'notes';
                                          } else if (normalizedKey.includes('email')) {
                                            normalizedKey = 'email';
                                          }

                                          record[normalizedKey] = row[key]?.trim();
                                        });

                                        if (record.amount !== undefined && record.amount !== null) {
                                          const cleanAmount = String(record.amount).replace(/[^0-9.]/g, '');
                                          const parsedAmount = cleanAmount === '' ? 0 : parseFloat(cleanAmount);
                                          record.amount = isNaN(parsedAmount) ? 0 : parsedAmount;
                                        } else {
                                          record.amount = 0;
                                        }

                                        record.unit = record.unit || '';
                                        record.tenant = record.tenant || '';
                                        record.email = record.email || '';
                                        record.start = record.start || '';
                                        record.expiry = record.expiry || '';
                                        record.notes = record.notes || '';

                                        if (record.unit && record.tenant) {
                                          addLog(`Saving ${record.tenant} (${record.unit})...`);
                                          await onAdd(record);
                                          count++;
                                          addLog(`Row ${rowNum} saved successfully.`);
                                          // Small delay to prevent overwhelming the connection
                                          await new Promise(resolve => setTimeout(resolve, 200));
                                        } else {
                                          errors++;
                                          const reason = !record.unit ? 'Missing Unit' : 'Missing Tenant';
                                          addLog(`Row ${rowNum} skipped: ${reason}`);
                                          errorMessages.push(`Row ${rowNum}: ${reason}`);
                                        }
                                      } catch (err: any) {
                                        errors++;
                                        const errMsg = err.message || 'Unknown error';
                                        addLog(`Error on row ${rowNum}: ${errMsg}`);
                                        errorMessages.push(`Row ${rowNum}: ${errMsg}`);
                                      }
                                    }

                                    setIsImporting(false);
                                    if (count > 0) {
                                      let msg = `Successfully imported ${count} records.`;
                                      if (errors > 0) {
                                        msg += ` ${errors} rows failed.`;
                                      }
                                      addLog(`IMPORT FINISHED: ${msg}`);
                                      setImportSuccess(msg);
                                      setTimeout(() => setImportSuccess(null), 10000);
                                    } else if (errors > 0) {
                                      const finalErr = `Failed to import records. ${errorMessages[0]}`;
                                      addLog(`IMPORT FAILED: ${finalErr}`);
                                      setError(finalErr);
                                    } else {
                                      addLog("IMPORT FINISHED: No records found.");
                                      setError("No valid records found in the CSV file.");
                                    }
                                    e.target.value = '';
                                  },
                                  error: (err) => {
                                    setIsImporting(false);
                                    const errMsg = `CSV Parsing Error: ${err.message}`;
                                    addLog(errMsg);
                                    setError(errMsg);
                                    e.target.value = '';
                                  }
                                });
                              }
                            }}
                          />
                        </label>
                        <button 
                          onClick={() => window.print()}
                          className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          title="Print Table"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                      </div>
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Filter by location or tenant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-6">Unit & Location / Tenant</th>
                          <th className="p-6">Rent</th>
                          <th className="p-6">Expiry</th>
                          <th className="p-6">Status</th>
                          <th className="p-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRecords.map((record: any) => {
                          const isArrears = record.expiry && new Date(record.expiry) < new Date();
                          return (
                            <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-6">
                                <p className="font-black text-slate-900">{record.unit}</p>
                                <p className="text-xs text-slate-500 font-medium">{record.tenant}</p>
                              </td>
                              <td className="p-6 font-bold text-slate-900">₦ {record.amount.toLocaleString()}</td>
                              <td className="p-6 text-xs text-slate-600 font-bold">{record.expiry || 'N/A'}</td>
                              <td className="p-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isArrears ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                  {isArrears ? 'Overdue' : 'Active'}
                                </span>
                              </td>
                              <td className="p-6">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => onEdit(record)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Edit"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => onReceipt(record)}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                    title="Receipt"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirm({ id: record.id, type: 'rental' })}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'properties' && (
              <>
                {/* Available Properties Management */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-blue-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <Building className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                      {editingProperty ? 'Update Property Listing' : 'Add Available Property'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Address</label>
                      <input 
                        type="text" 
                        value={propertyForm.address}
                        onChange={(e) => setPropertyForm({...propertyForm, address: e.target.value})}
                        placeholder="e.g. 12 Jibewa Somorin Close, Ojodu"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rent (₦)</label>
                        <input 
                          type="number" 
                          value={propertyForm.rent}
                          onChange={(e) => setPropertyForm({...propertyForm, rent: e.target.value})}
                          placeholder="0.00"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Type</label>
                        <input 
                          type="text" 
                          value={propertyForm.unitType}
                          onChange={(e) => setPropertyForm({...propertyForm, unitType: e.target.value})}
                          placeholder="e.g. 3BDR Flat"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Description</label>
                      <textarea 
                        value={propertyForm.description}
                        onChange={(e) => setPropertyForm({...propertyForm, description: e.target.value})}
                        placeholder="Describe the property features, amenities, etc."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Images</label>
                      <div className="flex flex-wrap gap-4">
                        {propertyForm.images.map((url, idx) => (
                          <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                            <img src={url} alt={`Property ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => {
                                const newImages = [...propertyForm.images];
                                newImages.splice(idx, 1);
                                setPropertyForm({ ...propertyForm, images: newImages });
                              }}
                              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                          {isUploadingPropertyImages ? (
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-6 h-6 text-slate-400" />
                              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Add Image</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => onPropertyImageUpload(e.target.files)}
                            disabled={isUploadingPropertyImages}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-8">
                    {editingProperty ? (
                      <>
                        <button 
                          onClick={onUpdateProperty}
                          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                        >
                          Update Listing
                        </button>
                        <button 
                          onClick={() => {
                            setEditingProperty(null);
                            setPropertyForm({ address: '', rent: '', unitType: '', description: '', isAvailable: true });
                          }}
                          className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={onAddProperty}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                      >
                        Publish Listing
                      </button>
                    )}
                  </div>
                </div>

                {/* Properties List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Available Listings</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-6">Property Address / Type</th>
                          <th className="p-6">Rent</th>
                          <th className="p-6">Status</th>
                          <th className="p-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {availableProperties.map((prop: any) => (
                          <tr key={prop.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-6">
                              <p className="font-black text-slate-900">{prop.address}</p>
                              <p className="text-xs text-slate-500 font-medium">{prop.unitType}</p>
                            </td>
                            <td className="p-6 font-bold text-slate-900">₦ {prop.rent.toLocaleString()}</td>
                            <td className="p-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${prop.isAvailable ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                {prop.isAvailable ? 'Listed' : 'Hidden'}
                              </span>
                            </td>
                            <td className="p-6">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => onEditProperty(prop)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm({ id: prop.id, type: 'property' })}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'worksheets' && (
              <>
                {/* Worksheet Upload */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-orange-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <FileText className="w-6 h-6 text-orange-600" />
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Upload Worksheet Data</h3>
                  </div>
                  <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-orange-100 rounded-3xl bg-orange-50/30">
                    <label className="flex flex-col items-center gap-4 cursor-pointer group">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isUploadingWorksheet ? (
                          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-orange-600" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Click to upload worksheet</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">Excel, CSV, or PDF files accepted</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => onWorksheetUpload(e.target.files?.[0] || null)}
                        disabled={isUploadingWorksheet}
                      />
                    </label>
                  </div>
                </div>

                {/* Worksheets List */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Uploaded Worksheets</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-6">File Name</th>
                          <th className="p-6">Type</th>
                          <th className="p-6">Upload Date</th>
                          <th className="p-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {worksheets.map((sheet) => (
                          <tr key={sheet.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-slate-400" />
                                <span className="font-bold text-slate-900">{sheet.name}</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {sheet.type.split('/')[1] || 'FILE'}
                              </span>
                            </td>
                            <td className="p-6 text-xs text-slate-600 font-bold">
                              {sheet.uploadedAt.toLocaleDateString()}
                            </td>
                            <td className="p-6">
                              <div className="flex gap-2">
                                <a 
                                  href={sheet.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Download"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </a>
                                <button 
                                  onClick={() => onDeleteWorksheet(sheet.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {worksheets.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-10 text-center text-slate-400 font-bold italic">
                              No worksheets uploaded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'adverts' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-6 h-6 text-red-600" />
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Rolling Advertisements</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingAdvert(null);
                      setAdvertForm({ type: 'Vacant Property', content: '', status: 'Active' });
                      setShowAdvertForm(true);
                    }}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Create Advert
                  </button>
                </div>

                {showAdvertForm && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl shadow-xl border-2 border-red-500/20 mb-8"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        {editingAdvert ? 'Edit Advertisement' : 'New Advertisement'}
                      </h4>
                      <button onClick={() => setShowAdvertForm(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advert Type</label>
                        <select 
                          value={advertForm.type}
                          onChange={(e) => setAdvertForm({...advertForm, type: e.target.value as any})}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="Vacant Property">Vacant Property</option>
                          <option value="Equipment Sale">Equipment Sale</option>
                          <option value="Property for Sale">Property for Sale</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                        <select 
                          value={advertForm.status}
                          onChange={(e) => setAdvertForm({...advertForm, status: e.target.value as any})}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="Active">Active</option>
                          <option value="Paused">Paused</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advert Content</label>
                        <textarea 
                          value={advertForm.content}
                          onChange={(e) => setAdvertForm({...advertForm, content: e.target.value})}
                          placeholder="Enter the advertisement message..."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button 
                        onClick={() => setShowAdvertForm(false)}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={onAddAdvert}
                        className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                      >
                        {editingAdvert ? 'Update Advert' : 'Create Advert'}
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="grid gap-4">
                  {advertisements.map((ad: Advert) => {
                    const lastAction = ad.lastActionDate instanceof Timestamp ? ad.lastActionDate.toDate() : new Date(ad.lastActionDate);
                    const diffDays = Math.floor((new Date().getTime() - lastAction.getTime()) / (1000 * 3600 * 24));
                    
                    return (
                      <div key={ad.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ad.type === 'Vacant Property' ? 'bg-blue-100 text-blue-600' :
                              ad.type === 'Equipment Sale' ? 'bg-orange-100 text-orange-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {ad.type}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ad.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {ad.status}
                            </span>
                            {diffDays >= 14 && ad.status === 'Active' && (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 animate-pulse">
                                Expiring Soon ({diffDays} days)
                              </span>
                            )}
                          </div>
                          <p className="text-slate-900 font-bold">{ad.content}</p>
                          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last Action: {lastAction.toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created: {ad.createdAt instanceof Timestamp ? ad.createdAt.toDate().toLocaleDateString() : new Date(ad.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onToggleAdvertStatus(ad)}
                            title={ad.status === 'Active' ? 'Pause' : 'Activate'}
                            className={`p-3 rounded-xl transition-all ${
                              ad.status === 'Active' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {ad.status === 'Active' ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingAdvert(ad);
                              setAdvertForm({ type: ad.type, content: ad.content, status: ad.status });
                              setShowAdvertForm(true);
                            }}
                            title="Edit"
                            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => onRenewAdvert(ad.id)}
                            title="Renew (Reset 15-day timer)"
                            className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => onDeleteAdvert(ad.id)}
                            title="Delete"
                            className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {advertisements.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                      <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No advertisements found</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                  <div className="h-32 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                  <div className="px-8 pb-8">
                    <div className="relative -mt-16 mb-6 flex justify-between items-end">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-3xl border-4 border-white bg-slate-100 overflow-hidden shadow-xl">
                          {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-600">
                              <User className="w-12 h-12" />
                            </div>
                          )}
                        </div>
                        {isEditingProfile && (
                          <button className="absolute bottom-2 right-2 p-2 bg-white rounded-xl shadow-lg text-slate-600 hover:text-purple-600 transition-all border border-slate-100">
                            <Upload className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {!isEditingProfile ? (
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="px-6 py-3 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" /> Edit Profile
                        </button>
                      ) : (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setIsEditingProfile(false)}
                            className="px-6 py-3 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-200 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={updateUserProfile}
                            disabled={isSavingProfile}
                            className="px-6 py-3 bg-purple-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
                          >
                            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                          {userProfile?.displayName || 'User Profile'}
                        </h3>
                        <p className="text-slate-500 font-bold flex items-center gap-2">
                          <Mail className="w-4 h-4" /> {userProfile?.email}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Name</label>
                            {isEditingProfile ? (
                              <input 
                                type="text"
                                value={profileForm.displayName}
                                onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Your full name"
                              />
                            ) : (
                              <p className="text-slate-900 font-bold p-4 bg-slate-50 rounded-2xl border border-transparent">
                                {userProfile?.displayName || 'Not specified'}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Phone Number</label>
                            {isEditingProfile ? (
                              <input 
                                type="tel"
                                value={profileForm.phoneNumber}
                                onChange={(e) => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="+234 ..."
                              />
                            ) : (
                              <p className="text-slate-900 font-bold p-4 bg-slate-50 rounded-2xl border border-transparent">
                                {userProfile?.phoneNumber || 'Not specified'}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Address</label>
                            {isEditingProfile ? (
                              <input 
                                type="text"
                                value={profileForm.address}
                                onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Your physical address"
                              />
                            ) : (
                              <p className="text-slate-900 font-bold p-4 bg-slate-50 rounded-2xl border border-transparent">
                                {userProfile?.address || 'Not specified'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bio / About</label>
                            {isEditingProfile ? (
                              <textarea 
                                value={profileForm.bio}
                                onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 min-h-[150px]"
                                placeholder="Tell us a bit about yourself..."
                              />
                            ) : (
                              <p className="text-slate-900 font-bold p-4 bg-slate-50 rounded-2xl border border-transparent min-h-[150px]">
                                {userProfile?.bio || 'No bio provided yet.'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                          <span>Account ID: {user?.uid}</span>
                          <span>•</span>
                          <span>Last Updated: {userProfile?.updatedAt instanceof Timestamp ? userProfile.updatedAt.toDate().toLocaleString() : 'Never'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function PropertyFinder({ isOpen, onClose, properties, onSelect }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProp, setSelectedProp] = useState<any>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedProp]);

  if (!isOpen) return null;

  const filtered = properties.filter((p: any) => 
    p.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.unitType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[4000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-black uppercase tracking-tighter">Find Your Next Home</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by area, street, or unit type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedProp ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setSelectedProp(null)}
                className="flex items-center gap-2 text-blue-600 font-bold hover:underline mb-4"
              >
                ← Back to listings
              </button>
              
              <div className="grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="aspect-video bg-slate-100 rounded-3xl overflow-hidden shadow-inner relative group">
                    {selectedProp.images && selectedProp.images.length > 0 ? (
                      <img 
                        src={selectedProp.images[activeImage] || selectedProp.images[0]} 
                        alt={selectedProp.address} 
                        className="w-full h-full object-cover transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Building className="w-20 h-20" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedProp.images?.map((img: string, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => setActiveImage(i)}
                        className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${activeImage === i ? 'border-blue-600 scale-105 shadow-md' : 'border-slate-100 hover:border-blue-300'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                    {(!selectedProp.images || selectedProp.images.length === 0) && [1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-square bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-slate-200">
                        <Building className="w-6 h-6" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <span className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                      {selectedProp.unitType}
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 mt-3">{selectedProp.address}</h3>
                    <div className="mt-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Annual Rent</span>
                      <p className="text-4xl font-black text-green-600">₦ {selectedProp.rent.toLocaleString()} <span className="text-sm text-slate-400 font-medium">/ annum</span></p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs border-b pb-2">Description</h4>
                    <p className="text-slate-600 leading-relaxed">{selectedProp.description || 'No description provided.'}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs border-b pb-2">Key Features</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {(selectedProp.features && selectedProp.features.length > 0 
                        ? selectedProp.features 
                        : ['Secured Gate', '24/7 Water', 'Prepaid Meter', 'Ample Parking']
                      ).map((f: string) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => onSelect(selectedProp)}
                    className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                  >
                    Apply for this property
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-2 py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Building className="w-10 h-10" />
                  </div>
                  <p className="text-slate-400 font-bold">No properties found matching your search.</p>
                </div>
              ) : (
                filtered.map((prop: any) => (
                  <motion.div 
                    key={prop.id}
                    layoutId={prop.id}
                    onClick={() => setSelectedProp(prop)}
                    className="group bg-white border border-slate-100 rounded-3xl p-5 hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-xl"
                  >
                    <div className="aspect-video bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                      {prop.images && prop.images.length > 0 ? (
                        <img 
                          src={prop.images[0]} 
                          alt={prop.address} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                          <Building className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                        {prop.unitType}
                      </div>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors truncate">{prop.address}</h4>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Annual Rent</span>
                        <p className="font-black text-green-600 text-lg">₦ {prop.rent.toLocaleString()}</p>
                      </div>
                      <span className="text-xs font-black text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        View Details <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
