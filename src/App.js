import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  X,
  Settings,
  ChevronRight,
  MapPin,
  Calendar,
  Baby,
  Receipt,
  Check,
  Cloud,
  Wifi,
  RefreshCcw,
  Users,
  ArrowRight,
  Gift,
  MessageCircle,
  LogOut,
  ArrowLeftRight,
  AlertTriangle,
  Info,
  Edit2,
  Lock,
  Unlock,
  ShieldCheck,
  Key,
  Shield,
  Database,
  Search,
  Activity,
  Archive,
} from "lucide-react";

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  setDoc,
  getDocs,
  query,
  limit,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";

// --- ⚠️ SETUP FOR EXTERNAL USE ⚠️ ---
const MY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAq1gMEsiQM7aF-bWM9A7cDUx_tSc0n0_E",
  authDomain: "squad-party-app.firebaseapp.com",
  projectId: "squad-party-app",
  storageBucket: "squad-party-app.firebasestorage.app",
  messagingSenderId: "231333890100",
  appId: "1:231333890100:web:1e0dcb9acbc8366faf2261",
};

const hasCustomConfig = !!MY_FIREBASE_CONFIG.apiKey;

// --- Firebase Init ---
const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : hasCustomConfig
    ? MY_FIREBASE_CONFIG
    : {
        apiKey: "AIzaSyAq1gMEsiQM7aF-bWM9A7cDUx_tSc0n0_E",
        authDomain: "squad-party-app.firebaseapp.com",
        projectId: "squad-party-app",
        storageBucket: "squad-party-app.firebasestorage.app",
        messagingSenderId: "231333890100",
        appId: "1:231333890100:web:1e0dcb9acbc8366faf2261",
      };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "squad-external-v3";

// --- Theme ---
const THEME = {
  bg: "bg-slate-900",
  glassCard:
    "backdrop-blur-xl bg-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] border border-white/20",
  glassButton:
    "backdrop-blur-md bg-white/10 hover:bg-white/20 active:scale-95 transition-all duration-300 border border-white/20",
  glassPanel:
    "backdrop-blur-2xl bg-slate-800/90 border-t border-white/20 shadow-[0_-10px_60px_rgba(0,0,0,0.6)]",
  actionButton:
    "backdrop-blur-md bg-[#3bf6ff]/10 border border-[#3bf6ff]/50 text-[#3bf6ff] shadow-[0_0_20px_rgba(59,246,255,0.15)] hover:bg-[#3bf6ff]/20 active:scale-95 transition-all duration-300 font-bold",
  dangerButton:
    "backdrop-blur-md bg-red-500/10 border border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:bg-red-500/20 active:scale-95 transition-all font-bold",
  secondaryButton:
    "backdrop-blur-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-all",
  activeToggle:
    "backdrop-blur-md bg-[#3bf6ff]/20 border border-[#3bf6ff]/60 text-[#3bf6ff] shadow-[0_0_15px_rgba(59,246,255,0.15)]",
  inactiveToggle:
    "bg-transparent border border-white/10 text-white/30 hover:bg-white/5",
  primaryText: "text-[#3bf6ff]",
  accentText: "text-[#d55eff]",
  secondaryText: "text-white/60",
  dashedBorder:
    "border-2 border-dashed border-white/20 hover:border-[#3bf6ff]/50 hover:bg-[#3bf6ff]/5",
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Admin Helper: Registry ---
const registerRoomActivity = async (roomName) => {
  try {
    const registryRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "system_room_registry",
      roomName
    );
    await setDoc(
      registryRef,
      {
        lastActiveAt: serverTimestamp(),
        name: roomName,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Registry update failed", e);
  }
};

// --- App Component ---
export default function App() {
  const [roomName, setRoomName] = useState(
    () => localStorage.getItem("squad_room_merged_v3") || ""
  );
  const [user, setUser] = useState(null);
  const [view, setView] = useState("home"); // home, event, settings, admin
  const [activeEventId, setActiveEventId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState([]);
  const [sysError, setSysError] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setSysError("Auth Failed: Check Config");
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u && !roomName) setLoading(false);
    });
    return () => unsubscribe();
  }, [roomName]);

  // Presets Sync
  useEffect(() => {
    if (!roomName || !user || isAdminMode) {
      setPresets([]);
      return;
    }
    const colRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `presets_${roomName}`
    );
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => a.name.localeCompare(b.name));
      setPresets(docs);
    });
    return () => unsubscribe();
  }, [roomName, user, isAdminMode]);

  // Events Sync & Sorting
  useEffect(() => {
    if (!roomName || isAdminMode) return;
    if (!user) {
      if (sysError) setLoading(false);
      return;
    }

    setLoading(true);
    setSysError(null);

    registerRoomActivity(roomName);

    const collectionRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      `events_${roomName}`
    );
    const unsubscribe = onSnapshot(
      collectionRef,
      (snap) => {
        const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => {
          const dateA = a.date || "";
          const dateB = b.date || "";
          const dateComparison = dateB.localeCompare(dateA);
          if (dateComparison !== 0) return dateComparison;
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
        setEvents(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Sync Error:", err);
        setSysError("Connection Failed");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user, roomName, isAdminMode]);

  const handleJoinRoom = (name) => {
    const clean = name
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toUpperCase();

    if (clean === "SYSADMIN") {
      setView("admin_login");
      return;
    }

    if (!clean) return;
    setRoomName(clean);
    localStorage.setItem("squad_room_merged_v3", clean);
  };

  const confirmLeaveRoom = () => {
    setRoomName("");
    localStorage.removeItem("squad_room_merged_v3");
    setEvents([]);
    setPresets([]);
    setView("home");
    setShowExitModal(false);
    setIsAdminMode(false);
  };

  const createEvent = async (data) => {
    if (!user || !roomName) return;
    try {
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `events_${roomName}`
      );
      await addDoc(colRef, {
        ...data,
        participants: [],
        bills: [],
        settledItems: {},
        transferMethods: {},
        childConfig: { mode: "rate", value: 0.5 },
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      setSysError("Create Failed");
    }
  };

  const updateEvent = async (id, updates) => {
    if (!user || !roomName) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `events_${roomName}`,
        id
      );
      await updateDoc(docRef, updates);
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!user || !roomName || !deleteEventId) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `events_${roomName}`,
        deleteEventId
      );
      await deleteDoc(docRef);
      setDeleteEventId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const addPreset = async (name, type) => {
    if (!user || !roomName) return;
    try {
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `presets_${roomName}`
      );
      await addDoc(colRef, { name, type, createdAt: serverTimestamp() });
    } catch (e) {
      console.error("Add Preset Error", e);
    }
  };

  const deletePreset = async (id) => {
    if (!user || !roomName) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `presets_${roomName}`,
        id
      );
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Delete Preset Error", e);
    }
  };

  if (view === "admin_login") {
    return (
      <AdminLoginView
        onLogin={() => {
          setIsAdminMode(true);
          setView("admin_dashboard");
        }}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "admin_dashboard" && isAdminMode) {
    return <AdminDashboard onBack={confirmLeaveRoom} appId={appId} />;
  }

  if (!roomName) return <RoomEntryView onJoin={handleJoinRoom} />;

  return (
    <div
      className={`min-h-screen ${THEME.bg} text-white font-sans selection:bg-[#3bf6ff]/20 overflow-x-hidden relative`}
    >
      <style>{`
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>

      {/* Background Gradients */}
      <div
        className="fixed top-[-20%] left-[-20%] w-[110%] h-[80%] bg-[#00ffa3]/5 rounded-full blur-[130px] pointer-events-none animate-pulse"
        style={{ animationDuration: "7s" }}
      />
      <div
        className="fixed bottom-[-20%] right-[-20%] w-[110%] h-[80%] bg-[#d55eff]/5 rounded-full blur-[130px] pointer-events-none animate-pulse"
        style={{ animationDuration: "9s" }}
      />

      {sysError && (
        <div className="fixed top-0 left-0 w-full z-[150] bg-red-500/90 backdrop-blur-md p-3 text-center animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-center gap-2 font-bold text-sm">
            <AlertTriangle size={18} />
            <span>{sysError}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {view === "home" && (
          <HomeView
            roomName={roomName}
            events={events}
            loading={loading}
            onCreate={createEvent}
            onSelect={(id) => {
              setActiveEventId(id);
              setView("event");
            }}
            onSettings={() => setView("settings")}
            onRequestLeave={() => setShowExitModal(true)}
            onRequestDelete={(id) => setDeleteEventId(id)}
          />
        )}
        {view === "settings" && (
          <SettingsView
            presets={presets}
            onAdd={addPreset}
            onDelete={deletePreset}
            onBack={() => setView("home")}
            roomName={roomName}
            user={user}
            appId={appId}
          />
        )}
        {view === "event" && activeEventId && (
          <EventDetailView
            event={events.find((e) => e.id === activeEventId)}
            updateEvent={(u) => updateEvent(activeEventId, u)}
            onBack={() => setView("home")}
            presets={presets}
            roomName={roomName}
          />
        )}
      </div>

      {showExitModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          onClick={() => setShowExitModal(false)}
        >
          <div
            className={`${THEME.glassCard} p-8 rounded-[32px] w-full max-w-xs text-center space-y-6 animate-in zoom-in duration-200 bg-slate-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/50 border border-white/10">
              <LogOut size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Leave Room?</h3>
              <p className="text-sm text-white/50">
                Code:{" "}
                <span className="text-[#3bf6ff] font-bold">{roomName}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className={`flex-1 py-3 rounded-xl ${THEME.secondaryButton}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmLeaveRoom}
                className={`flex-1 py-3 rounded-xl ${THEME.dangerButton}`}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteEventId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          onClick={() => setDeleteEventId(null)}
        >
          <div
            className={`${THEME.glassCard} p-8 rounded-[32px] w-full max-w-xs text-center space-y-6 animate-in zoom-in duration-200 bg-slate-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
              <Trash2 size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Delete?</h3>
              <p className="text-sm text-white/50">Cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteEventId(null)}
                className={`flex-1 py-3 rounded-xl ${THEME.secondaryButton}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEvent}
                className={`flex-1 py-3 rounded-xl ${THEME.dangerButton}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Admin Components ---
const AdminLoginView = ({ onLogin, onBack }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const ADMIN_PIN = "8888";
  const handleLogin = () => {
    if (pin === ADMIN_PIN) {
      onLogin();
    } else {
      setError("Access Denied");
      setPin("");
    }
  };
  return (
    <div
      className={`min-h-screen ${THEME.bg} flex flex-col items-center justify-center p-8`}
    >
      <div
        className={`${THEME.glassCard} p-8 rounded-[32px] w-full max-w-sm text-center space-y-6`}
      >
        <div className="w-16 h-16 bg-[#d55eff]/20 rounded-full flex items-center justify-center mx-auto text-[#d55eff] border border-[#d55eff]/50 mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black text-white">ADMIN ACCESS</h2>
        <div className="space-y-4">
          <input
            autoFocus
            type="password"
            maxLength={4}
            placeholder="PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none focus:border-[#d55eff]"
          />
          {error && <p className="text-red-400 font-bold text-sm">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className={`flex-1 py-3 rounded-xl ${THEME.secondaryButton}`}
          >
            Back
          </button>
          <button
            onClick={handleLogin}
            className={`flex-1 py-3 rounded-xl ${THEME.actionButton}`}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ onBack, appId }) => {
  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState([]); // Store deletion requests
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRooms: 0, activeRecently: 0 });
  const [deleteRoomId, setDeleteRoomId] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanReport, setCleanReport] = useState(null);

  // Fetch Logic
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Room Registry
        const qRooms = query(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "system_room_registry"
          )
        );
        const snapRooms = await getDocs(qRooms);
        const roomList = snapRooms.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        roomList.sort(
          (a, b) =>
            (b.lastActiveAt?.seconds || 0) - (a.lastActiveAt?.seconds || 0)
        );
        setRooms(roomList);

        // Stats
        const now = new Date();
        const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
        const active = roomList.filter(
          (r) => r.lastActiveAt?.toDate() > oneMonthAgo
        ).length;
        setStats({ totalRooms: roomList.length, activeRecently: active });

        // 2. Fetch Deletion Requests
        const qRequests = query(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "system_deletion_requests"
          )
        );
        const snapReq = await getDocs(qRequests);
        const reqList = snapReq.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(reqList);

        setLoading(false);
      } catch (e) {
        console.error("Admin Fetch Error", e);
        setLoading(false);
      }
    };
    fetchData();
  }, [appId, deleteRoomId]); // Re-fetch when a room is deleted

  // Handle Deleting the Request Ticket only (Ignore)
  const handleDismissRequest = async (reqId) => {
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "system_deletion_requests",
          reqId
        )
      );
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Full Deletion (Approve)
  const handleDeleteRoom = async (targetRoomName, requestId = null) => {
    if (!targetRoomName) return;
    try {
      const batch = writeBatch(db);

      // 1. Delete Events
      const eventsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `events_${targetRoomName}`
      );
      const eventsSnap = await getDocs(eventsRef);
      eventsSnap.docs.forEach((doc) => batch.delete(doc.ref));

      // 2. Delete Presets
      const presetsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `presets_${targetRoomName}`
      );
      const presetsSnap = await getDocs(presetsRef);
      presetsSnap.docs.forEach((doc) => batch.delete(doc.ref));

      // 3. Delete Meta
      const metaRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `meta_${targetRoomName}`,
        "settings"
      );
      batch.delete(metaRef);

      // 4. Delete Registry
      const regRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "system_room_registry",
        targetRoomName
      );
      batch.delete(regRef);

      // 5. If this came from a request, delete the request ticket too
      if (requestId) {
        const reqRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "system_deletion_requests",
          requestId
        );
        batch.delete(reqRef);
      }

      await batch.commit();

      // Update local state
      setDeleteRoomId(null);
      if (requestId) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (e) {
      console.error("Delete Room Error", e);
      alert("Delete failed (Batch limit or permission)");
    }
  };

  const handleAutoClean = async () => {
    if (
      !window.confirm(
        "This will delete ALL events older than 1 year from ALL known rooms. Proceed?"
      )
    )
      return;
    setIsCleaning(true);
    setCleanReport(null);
    let deletedCount = 0;
    try {
      const oneYearAgoDate = new Date();
      oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
      const dateStr = oneYearAgoDate.toISOString().split("T")[0];
      for (const room of rooms) {
        const eventsRef = collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `events_${room.name}`
        );
        const q = query(eventsRef, where("date", "<", dateStr));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          deletedCount += snap.size;
        }
      }
      setCleanReport(`Cleanup Complete. Deleted ${deletedCount} old events.`);
    } catch (e) {
      console.error(e);
      setCleanReport(
        `Cleanup finished with errors. Deleted ${deletedCount} items.`
      );
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${THEME.bg} text-white p-6 overflow-hidden flex flex-col`}
    >
      <div className="fixed top-[-20%] left-[-20%] w-[110%] h-[80%] bg-[#d55eff]/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">ADMIN DASHBOARD</h1>
            <p className="text-[#d55eff] font-bold text-xs tracking-widest uppercase">
              Yoky's Space
            </p>
          </div>
          <button
            onClick={onBack}
            className={`w-12 h-12 rounded-full ${THEME.glassButton} flex items-center justify-center`}
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`${THEME.glassCard} p-5 rounded-[24px]`}>
            <div className="flex items-center gap-2 mb-2 text-[#3bf6ff]">
              <Database size={20} />{" "}
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Rooms
              </span>
            </div>
            <p className="text-4xl font-black">
              {loading ? "-" : stats.totalRooms}
            </p>
          </div>
          <div className={`${THEME.glassCard} p-5 rounded-[24px]`}>
            <div className="flex items-center gap-2 mb-2 text-[#d55eff]">
              <Activity size={20} />{" "}
              <span className="text-xs font-bold uppercase tracking-wider">
                Active (30d)
              </span>
            </div>
            <p className="text-4xl font-black">
              {loading ? "-" : stats.activeRecently}
            </p>
          </div>
        </div>

        {/* --- NEW SECTION: Deletion Requests --- */}
        {requests.length > 0 && (
          <div className="mb-8 animate-in slide-in-from-left duration-500">
            <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> Pending Requests ({requests.length})
            </h3>
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-[20px] bg-yellow-500/10 border border-yellow-500/30 flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold text-white text-lg">
                      {req.roomName}
                    </h4>
                    <p className="text-[10px] text-yellow-200/60">
                      Reason: {req.reason || "No reason"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDismissRequest(req.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/50"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Permanently delete room: ${req.roomName}?`
                          )
                        ) {
                          handleDeleteRoom(req.roomName, req.id);
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 transition-all"
                    >
                      Approve & Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={`${THEME.glassCard} p-6 rounded-[24px] mb-8 border border-white/10`}
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-lg">Auto Cleanup</h3>
              <p className="text-xs text-white/50">
                Delete events older than 1 year.
              </p>
            </div>
            <button
              onClick={handleAutoClean}
              disabled={isCleaning}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
                isCleaning
                  ? "bg-white/10"
                  : "bg-white/10 hover:bg-[#3bf6ff]/20 hover:text-[#3bf6ff] border border-white/20"
              }`}
            >
              {isCleaning ? (
                <RefreshCcw className="animate-spin" size={16} />
              ) : (
                <Archive size={16} />
              )}
              {isCleaning ? "Cleaning..." : "Run Cleanup"}
            </button>
          </div>
          {cleanReport && (
            <div className="bg-green-500/20 text-green-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check size={14} /> {cleanReport}
            </div>
          )}
        </div>

        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Search size={14} /> Room Registry
        </h3>

        <div className="flex-1 overflow-y-auto space-y-3 pb-10 no-scrollbar">
          {loading ? (
            <div className="text-center text-white/30 py-10 animate-pulse">
              Loading Registry...
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center text-white/30 py-10">
              No rooms registered yet.
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className={`p-4 rounded-[20px] bg-white/5 border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all`}
              >
                <div>
                  <h4 className="font-bold text-white text-lg">{room.name}</h4>
                  <p className="text-[10px] text-white/40 font-mono">
                    Last Active:{" "}
                    {room.lastActiveAt?.toDate().toLocaleDateString() || "N/A"}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteRoomId(room.name)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {deleteRoomId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          onClick={() => setDeleteRoomId(null)}
        >
          <div
            className={`${THEME.glassCard} p-8 rounded-[32px] w-full max-w-xs text-center space-y-6 bg-slate-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                Delete Room?
              </h3>
              <p className="text-sm text-white/50">
                This will erase{" "}
                <span className="text-white font-bold">{deleteRoomId}</span> and
                ALL its data permanently.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteRoomId(null)}
                className={`flex-1 py-3 rounded-xl ${THEME.secondaryButton}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRoom(deleteRoomId)}
                className={`flex-1 py-3 rounded-xl ${THEME.dangerButton}`}
              >
                Destroy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-Components ---

const RoomEntryView = ({ onJoin }) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("name");
  const [pinInput, setPinInput] = useState("");
  const [targetRoomPin, setTargetRoomPin] = useState(null);
  const [error, setError] = useState("");

  const checkRoom = async () => {
    if (!input.trim()) return;
    const cleanName = input
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toUpperCase();
    if (cleanName === "SYSADMIN") {
      onJoin("SYSADMIN");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const metaDocRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `meta_${cleanName}`,
        "settings"
      );
      const metaSnap = await getDoc(metaDocRef);
      if (metaSnap.exists()) {
        if (metaSnap.data().pin) {
          setTargetRoomPin(metaSnap.data().pin);
          setStep("pin");
          setLoading(false);
          return;
        } else {
          onJoin(cleanName);
          return;
        }
      }
      const eventsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `events_${cleanName}`
      );
      const q = query(eventsRef, limit(1));
      const eventSnap = await getDocs(q);
      if (!eventSnap.empty) {
        onJoin(cleanName);
      } else {
        setStep("confirm_create");
        setLoading(false);
      }
    } catch (e) {
      console.error("Room Check Error", e);
      onJoin(input);
    }
  };

  const verifyPin = () => {
    if (pinInput === targetRoomPin) {
      onJoin(input);
    } else {
      setError("密碼錯誤 (Incorrect PIN)");
      setPinInput("");
    }
  };

  const finishSetup = async (shouldSetPin) => {
    const cleanName = input
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toUpperCase();
    if (shouldSetPin && pinInput.length === 4) {
      setLoading(true);
      try {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `meta_${cleanName}`,
          "settings"
        );
        await setDoc(docRef, { pin: pinInput }, { merge: true });
        onJoin(cleanName);
      } catch (e) {
        onJoin(cleanName);
      }
    } else {
      onJoin(cleanName);
    }
  };

  return (
    // 修改 1: 外層改用 flex-col 撐滿全屏
    <div
      className={`min-h-screen flex flex-col ${THEME.bg} overflow-hidden relative`}
    >
      {/* 中間內容區：自動佔據剩餘空間 (flex-1) 並置中 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 w-full z-10">
        {/* Logo 區 */}
        <div className="text-center space-y-2 animate-float">
          <div className="inline-block p-4 rounded-[2rem] bg-gradient-to-br from-[#3bf6ff]/20 to-[#d55eff]/20 border border-white/10 mb-4">
            <Users size={48} className="text-[#3bf6ff]" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
            SQUAD
          </h1>
          <p className="text-[#3bf6ff] font-bold tracking-[0.4em] text-[12px] uppercase opacity-60">
            Pro Party & Expense
          </p>
        </div>

        {/* 卡片區 */}
        <div
          className={`${THEME.glassCard} w-full max-w-sm p-8 rounded-[40px] space-y-8 transition-all duration-300`}
        >
          {step === "name" && (
            <>
              <div className="space-y-4">
                <label className="text-[15px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1">
                  Room ID / 房號
                </label>
                <input
                  autoFocus
                  placeholder="vip2026"
                  className="w-full bg-white/5 border-b-2 border-white/10 px-2 py-4 text-2xl font-black text-center outline-none focus:border-[#3bf6ff] transition-colors placeholder:text-white/5 uppercase text-white"
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                  }
                  onKeyDown={(e) => e.key === "Enter" && checkRoom()}
                />
                <p className="text-[15px] text-white/30 text-center leading-relaxed">
                  輸入房號以加入或創建新房間
                </p>
              </div>
              <button
                onClick={checkRoom}
                disabled={!input.trim() || loading}
                className={`w-full py-5 rounded-2xl text-lg font-black tracking-widest ${THEME.actionButton} transition-all disabled:opacity-30 flex justify-center items-center gap-2`}
              >
                {loading ? (
                  <RefreshCcw className="animate-spin" />
                ) : (
                  "進入 ENTER"
                )}
              </button>
            </>
          )}

          {step === "confirm_create" && (
            <div className="animate-in slide-in-from-right duration-300 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto text-yellow-500">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  找不到房間
                </h3>
                <p className="text-white/60 text-sm">
                  房號 <span className="text-[#3bf6ff] font-bold">{input}</span>{" "}
                  尚未建立。
                </p>
                <p className="text-white/40 text-xs mt-2">你要開新房嗎？</p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setStep("setup")}
                  className={`w-full py-4 rounded-2xl font-bold text-lg ${THEME.actionButton}`}
                >
                  開新房 (Create New)
                </button>
                <button
                  onClick={() => setStep("name")}
                  className={`w-full py-4 rounded-2xl font-bold text-lg ${THEME.secondaryButton}`}
                >
                  打錯字 (Try Again)
                </button>
              </div>
            </div>
          )}

          {step === "pin" && (
            <div className="animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#d55eff]">
                  <Lock size={20} />
                </div>
                <h3 className="text-white font-bold text-lg">房間已上鎖</h3>
                <p className="text-white/40 text-xs">請輸入 PIN 碼</p>
              </div>
              <div className="space-y-4">
                <input
                  autoFocus
                  type="tel"
                  maxLength={4}
                  placeholder="0000"
                  className="w-full bg-white/5 border-b-2 border-white/10 px-2 py-4 text-3xl font-black text-center outline-none focus:border-[#d55eff] transition-colors placeholder:text-white/5 tracking-[0.5em] text-white"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verifyPin()}
                />
                {error && (
                  <p className="text-red-400 text-xs font-bold text-center">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setStep("name");
                    setPinInput("");
                    setError("");
                  }}
                  className={`flex-1 py-4 rounded-2xl font-bold ${THEME.secondaryButton}`}
                >
                  返回
                </button>
                <button
                  onClick={verifyPin}
                  disabled={pinInput.length < 4}
                  className={`flex-1 py-4 rounded-2xl font-bold ${THEME.actionButton}`}
                >
                  解鎖
                </button>
              </div>
            </div>
          )}

          {step === "setup" && (
            <div className="animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#3bf6ff]/10 border border-[#3bf6ff]/30 flex items-center justify-center mx-auto text-[#3bf6ff]">
                  <Shield size={24} />
                </div>
                <h3 className="text-white font-bold text-lg">設定新房間</h3>
                <p className="text-white/40 text-xs">
                  是否需要設定 4 位數密碼？
                </p>
              </div>
              <div className="space-y-4">
                <input
                  autoFocus
                  type="tel"
                  maxLength={4}
                  placeholder="PIN (可選)"
                  className="w-full bg-white/5 border-b-2 border-white/10 px-2 py-4 text-3xl font-black text-center outline-none focus:border-[#3bf6ff] transition-colors placeholder:text-white/10 tracking-[0.5em] text-white"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && finishSetup(!!pinInput)
                  }
                />
                <p className="text-[10px] text-white/30 text-center">
                  留空直接按 "Skip" 則為公開房間
                </p>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => finishSetup(false)}
                  className={`flex-1 py-4 rounded-2xl font-bold ${THEME.secondaryButton}`}
                >
                  跳過 (Skip)
                </button>
                <button
                  onClick={() => finishSetup(true)}
                  disabled={pinInput.length < 4}
                  className={`flex-1 py-4 rounded-2xl font-bold ${THEME.actionButton} disabled:opacity-30`}
                >
                  設定密碼
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 修改 2: Footer 不再使用 absolute，而是放在 flex 容器最底，確保不重疊 */}
      <div className="p-4 flex flex-col items-center gap-1 opacity-30 hover:opacity-100 transition-opacity duration-500 z-10">
        <p className="text-[15px] font-bold text-white tracking-[0.2em] uppercase">
          Designed by Yoky Lo
        </p>
        <p className="text-[12px] text-[#3bf6ff] tracking-widest">
          © 2026 EYEBROWS ART
        </p>
      </div>
    </div>
  );
};

const HomeView = ({
  roomName,
  events,
  loading,
  onCreate,
  onSelect,
  onSettings,
  onRequestLeave,
  onRequestDelete,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  return (
    <div className="flex flex-col h-screen p-6">
      <div className="flex justify-between items-end py-6 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-[#3bf6ff] tracking-widest uppercase opacity-80 mb-1 block">
              Room ID: {roomName}
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]">
            SQUAD
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSettings}
            className={`w-11 h-11 rounded-2xl ${THEME.glassButton} flex items-center justify-center`}
          >
            <Settings size={20} />
          </button>
          <button
            onClick={onRequestLeave}
            className={`h-11 px-4 rounded-2xl ${THEME.glassButton} flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:border-red-500/30 gap-2`}
          >
            <span className="text-xs font-bold uppercase hidden sm:block">
              Exit
            </span>
            <LogOut size={20} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/50 animate-pulse gap-2">
            <RefreshCcw className="animate-spin text-[#3bf6ff]" />
            <span className="text-xs font-bold tracking-widest uppercase">
              Syncing...
            </span>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] animate-in fade-in duration-1000">
            <button
              onClick={() => setIsCreating(true)}
              className={`w-48 h-48 rounded-[40px] ${THEME.dashedBorder} flex flex-col items-center justify-center gap-6 group backdrop-blur-sm bg-white/[0.02]`}
            >
              <div
                className={`w-16 h-16 rounded-full ${THEME.glassButton} flex items-center justify-center group-hover:bg-[#3bf6ff]/20 group-hover:text-[#3bf6ff] transition-colors duration-500`}
              >
                <Plus size={32} />
              </div>
              <span
                className={`text-lg font-bold ${THEME.secondaryText} group-hover:text-white transition-colors`}
              >
                Create Event
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onSelect(event.id)}
                onRequestDelete={() => onRequestDelete(event.id)}
              />
            ))}
            <button
              onClick={() => setIsCreating(true)}
              className={`w-full py-5 rounded-[24px] ${THEME.dashedBorder} ${THEME.secondaryText} text-lg font-bold mt-4 flex items-center justify-center gap-2 backdrop-blur-sm bg-black/10`}
            >
              <Plus size={20} /> Create New Event
            </button>
          </div>
        )}
      </div>
      {isCreating && (
        <CreateEventModal
          onClose={() => setIsCreating(false)}
          onCreate={onCreate}
        />
      )}
    </div>
  );
};

const EventDetailView = ({ event, updateEvent, onBack, presets, roomName }) => {
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);

  if (!event) return null;

  const settlement = useMemo(() => calculateSettlement(event), [event]);

  // Helpers
  const toggleSettled = (from, to) => {
    const key = `${from}_${to}`;
    const current = event.settledItems || {};
    updateEvent({ settledItems: { ...current, [key]: !current[key] } });
  };
  const toggleTransferMethod = (from, to, method) => {
    const key = `${from}_${to}`;
    const current = event.transferMethods || {};
    updateEvent({
      transferMethods: {
        ...current,
        [key]: current[key] === method ? null : method,
      },
    });
  };

  // --- 新增：切換收款人的收款方式 ---
  const toggleReceiverMethod = (personId, method) => {
    const currentMap = event.receiverMethods || {};
    const currentMethods = currentMap[personId] || [];

    let newMethods;
    if (currentMethods.includes(method)) {
      newMethods = currentMethods.filter((m) => m !== method);
    } else {
      newMethods = [...currentMethods, method];
    }

    updateEvent({
      receiverMethods: { ...currentMap, [personId]: newMethods },
    });
  };

  const addParticipant = (newParts) => {
    const updated = [...(event.participants || [])];
    newParts.forEach((p) =>
      updated.push({
        id: generateId(),
        ...p,
        breakdown: { adult: p.adultCount, child: p.childCount },
      })
    );
    updateEvent({ participants: updated });
    setShowAddPart(false);
  };
  const addBill = (data) => {
    updateEvent({
      bills: [...(event.bills || []), { id: generateId(), ...data }],
    });
    setShowAddBill(false);
  };

  // --- 更新：WhatsApp 分享邏輯 ---
  const shareToWhatsApp = () => {
    let text = `📅 *${event.title}* 結算\n\n💸 *轉賬安排:*\n`;
    const list = settlement.transfers.map((t) => ({ ...t, type: "transfer" }));

    if (list.length === 0) {
      text += `(無需轉賬 / 已平數)\n`;
    } else {
      list.forEach((item) => {
        const key = `${item.from}_${item.to}`;
        const isSettled = event.settledItems?.[key];
        text += `${item.from} ➜ ${item.to}: $${item.amount}${
          isSettled ? " ✅" : " 🚨"
        }\n`;
      });
    }

    // --- 新增：收款方法顯示 ---
    const receivers = settlement.statsArray.filter((p) => p.net > 0);
    const methodsMap = event.receiverMethods || {};
    let hasMethods = false;
    let methodText = `\n💳 *收款詳情:*\n`;

    receivers.forEach((p) => {
      const methods = methodsMap[p.id];
      if (methods && methods.length > 0) {
        hasMethods = true;
        methodText += `${p.name}: ${methods.join(" / ").toUpperCase()}\n`;
      }
    });

    if (hasMethods) {
      text += methodText;
    }
    // -----------------------

    text += `\n🔗 *明細查詢 (Room: ${roomName}):*\n${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const [tempMode, setTempMode] = useState(event.childConfig?.mode || "rate");
  const [tempValue, setTempValue] = useState(event.childConfig?.value || 0.5);

  return (
    <div
      className="flex flex-col h-screen"
      onClick={() => setConfirmDeleteId(null)}
    >
      <div className="absolute top-6 left-4 z-20 flex justify-between w-[92%]">
        <button
          onClick={onBack}
          className={`w-10 h-10 rounded-full ${THEME.glassButton} flex items-center justify-center text-white/90 hover:text-white`}
        >
          <ChevronRight className="rotate-180" size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-20 pb-12 space-y-10 no-scrollbar">
        <div className="space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 mb-1 w-full">
              <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow-lg break-words">
                {event.title}
              </h1>
              <button
                onClick={() => setIsEditingEvent(true)}
                className="text-white/30 hover:text-[#3bf6ff] transition-colors p-2 shrink-0"
              >
                <Edit2 size={18} />
              </button>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p
                className={`text-sm font-bold ${THEME.primaryText} flex items-center gap-2`}
              >
                <Calendar size={14} /> {event.date}
              </p>
              {event.location && (
                <p
                  className={`text-sm font-bold ${THEME.secondaryText} flex items-center gap-2`}
                >
                  <MapPin size={14} /> {event.location}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTempMode(event.childConfig?.mode || "rate");
                setTempValue(event.childConfig?.value || 0.5);
                setEditingRate(true);
              }}
              className={`flex items-center gap-2 ${THEME.glassButton} px-3 py-1.5 rounded-full`}
            >
              <Baby size={14} className="text-[#d55eff]" />
              <span className="text-xs font-bold text-white/90">
                <span className="text-[#3bf6ff] ml-1">
                  {event.childConfig?.mode === "fixed"
                    ? `$${event.childConfig.value}`
                    : `${event.childConfig?.value || 0.5}x`}
                </span>
              </span>
            </button>
          </div>
        </div>
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
          <div className="flex justify-between items-baseline mb-3">
            <h3
              className={`text-m font-bold ${THEME.secondaryText} uppercase tracking-[0.2em]`}
            >
              參加者Participant
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddPart(true);
              }}
              className={`w-8 h-8 rounded-full ${THEME.activeToggle} flex items-center justify-center`}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {event.participants?.map((p) => {
              const isDel = confirmDeleteId === p.id;
              return (
                <div
                  key={p.id}
                  className={`relative flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full border transition-all duration-300 ${
                    isDel
                      ? "bg-red-500/20 border-red-500/50"
                      : `${THEME.glassButton} border-white/10`
                  } ${
                    p.isBirthday
                      ? "ring-2 ring-[#ffd700]/50 bg-[#ffd700]/10"
                      : ""
                  }`}
                >
                  <span
                    className={`font-bold text-sm ${
                      p.type === "child" ? "text-[#d55eff]" : "text-[#3bf6ff]"
                    }`}
                  >
                    {p.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-white/5 text-white/50 tracking-wider`}
                  >
                    {p.breakdown.adult}A
                    {p.breakdown.child > 0 ? ` ${p.breakdown.child}C` : ""}
                  </span>
                  {p.isBirthday && (
                    <Gift size={12} className="text-[#ffd700]" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDel) {
                        updateEvent({
                          participants: event.participants.filter(
                            (x) => x.id !== p.id
                          ),
                        });
                        setConfirmDeleteId(null);
                      } else setConfirmDeleteId(p.id);
                    }}
                    className={`ml-1 flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                      isDel
                        ? "bg-red-500 text-white"
                        : "text-white/30 hover:text-white"
                    }`}
                  >
                    {isDel ? <Trash2 size={12} /> : <X size={14} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
          <h3
            className={`text-m font-bold ${THEME.secondaryText} uppercase tracking-[0.2em] mb-3`}
          >
            賬單 Bills
          </h3>
          <div className="space-y-3">
            {event.bills?.map((bill) => {
              const payer = event.participants?.find(
                (p) => p.id === bill.payerId
              );
              const isDebt = bill.type === "debt";
              const debtor = isDebt
                ? event.participants?.find((p) => p.id === bill.debtorId)
                : null;
              const isDel = confirmDeleteId === bill.id;
              return (
                <div
                  key={bill.id}
                  className={`${
                    THEME.glassButton
                  } p-4 rounded-[24px] flex justify-between items-center ${
                    isDebt ? "border-[#d55eff]/30 bg-[#d55eff]/5" : ""
                  } ${isDel ? "!border-red-500/50 !bg-red-500/10" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDebt
                          ? "bg-[#d55eff]/20 text-[#d55eff]"
                          : "bg-white/5 text-[#3bf6ff]"
                      }`}
                    >
                      {isDebt ? (
                        <ArrowLeftRight size={20} />
                      ) : (
                        <Receipt size={20} />
                      )}
                    </div>
                    <div>
                      <div
                        className={`font-bold text-lg ${
                          isDel ? "text-red-200" : "text-white"
                        }`}
                      >
                        {bill.title}
                      </div>
                      <div
                        className={`text-xs font-bold ${THEME.secondaryText} tracking-wider`}
                      >
                        {isDebt ? (
                          <span>
                            <span className="text-[#d55eff]">
                              {debtor?.name}
                            </span>{" "}
                            欠{" "}
                            <span className="text-[#3bf6ff]">
                              {payer?.name}
                            </span>
                          </span>
                        ) : (
                          <span>{payer?.name} 付款</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`font-mono font-bold text-xl tracking-tight ${
                        isDebt ? "text-[#d55eff]" : "text-white"
                      }`}
                    >
                      ${bill.amount}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDel) {
                          updateEvent({
                            bills: event.bills.filter((x) => x.id !== bill.id),
                          });
                          setConfirmDeleteId(null);
                        } else setConfirmDeleteId(bill.id);
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isDel
                          ? "bg-red-500 text-white"
                          : "text-white/30 hover:text-red-400"
                      }`}
                    >
                      {isDel ? <Trash2 size={18} /> : <X size={20} />}
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddBill(true);
              }}
              className={`w-full h-16 rounded-[24px] ${THEME.dashedBorder} bg-white/[0.02] flex items-center justify-center group backdrop-blur-sm transition-all`}
            >
              <Plus
                size={28}
                className="text-white/30 group-hover:text-[#3bf6ff] group-hover:scale-110 transition-all"
              />
            </button>
          </div>
        </div>
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300 pb-8">
          <div className="flex items-center justify-between mb-3">
            <h3
              className={`text-m font-bold ${THEME.secondaryText} uppercase tracking-[0.2em]`}
            >
              結算 Settlement
            </h3>
          </div>
          {settlement.transfers.length > 0 ? (
            <div
              className={`${THEME.glassCard} p-5 rounded-[24px] space-y-3 mb-6`}
            >
              {settlement.transfers.map((item, idx) => {
                const settledKey = `${item.from}_${item.to}`;
                const isSettled = event.settledItems?.[settledKey];
                const activeMethod = event.transferMethods?.[settledKey];
                const personStats = settlement.statsArray.find(
                  (p) => p.name === item.from
                );
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedPerson(personStats)}
                    className={`relative flex items-center justify-between p-4 rounded-[20px] bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all group ${
                      isSettled ? "opacity-50 grayscale" : ""
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-lg">
                          {item.from}
                        </span>
                        {personStats?.isBirthday && (
                          <Gift size={14} className="text-[#ffd700]" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-white/40 bg-white/10 px-2 py-1 rounded-md flex items-center gap-1 group-hover:bg-[#3bf6ff]/20 group-hover:text-[#3bf6ff] transition-colors">
                        ${personStats?.cost.toFixed(1)} Cost <Info size={10} />
                      </span>
                    </div>
                    <ArrowRight
                      size={20}
                      className="text-[#3bf6ff] opacity-50 group-hover:opacity-100"
                    />
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white/70 text-sm">
                          To {item.to}
                        </span>
                        <span
                          className={`font-mono font-bold text-xl ${
                            isSettled
                              ? "line-through text-white/50"
                              : "text-[#d55eff]"
                          }`}
                        >
                          ${item.amount}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {["cash", "fps", "payme"].map((m) => {
                          if (activeMethod && activeMethod !== m) return null;
                          const colors = {
                            cash: "yellow",
                            fps: "blue",
                            payme: "red",
                          };
                          return (
                            <button
                              key={m}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTransferMethod(item.from, item.to, m);
                              }}
                              className={`w-6 h-6 rounded-md border flex items-center justify-center text-[9px] font-bold uppercase transition-all ${
                                activeMethod === m
                                  ? `bg-${colors[m]}-500 text-white border-${colors[m]}-500`
                                  : `border-${colors[m]}-500/30 text-${colors[m]}-500/50`
                              }`}
                            >
                              {m[0]}
                            </button>
                          );
                        })}
                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSettled(item.from, item.to);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                            isSettled
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-transparent border-white/20 text-transparent hover:border-white/50"
                          }`}
                        >
                          <Check size={14} strokeWidth={4} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={shareToWhatsApp}
                className={`w-full py-4 mt-6 rounded-[20px] font-bold flex items-center justify-center gap-2 text-sm ${THEME.actionButton}`}
              >
                <MessageCircle size={18} /> WhatsApp Statement
              </button>
            </div>
          ) : (
            <div
              className={`p-6 mb-6 rounded-[24px] bg-white/[0.02] border border-white/5 text-center ${THEME.secondaryText} text-sm`}
            >
              {(event.bills || []).length === 0
                ? "Add bills to calculate"
                : "Perfectly balanced!"}
            </div>
          )}

          {/* --- 收款方式設定區域 (Moved OUTSIDE the settlement card logic) --- */}
          {settlement.statsArray.filter((p) => p.net > 0).length > 0 && (
            <div className={`mt-6 ${THEME.glassCard} p-6 rounded-[24px]`}>
              <h3
                className={`text-xs font-bold ${THEME.secondaryText} uppercase tracking-[0.2em] mb-4`}
              >
                收款方式設定 (Receivers)
              </h3>
              <div className="space-y-4">
                {settlement.statsArray
                  .filter((p) => p.net > 0)
                  .map((p) => {
                    const myMethods = event.receiverMethods?.[p.id] || [];
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5"
                      >
                        <span className="font-bold text-white">
                          {p.name} 收款:
                        </span>
                        <div className="flex gap-2">
                          {["fps", "payme", "cash"].map((m) => {
                            const isActive = myMethods.includes(m);
                            return (
                              <button
                                key={m}
                                onClick={() => toggleReceiverMethod(p.id, m)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                                  isActive
                                    ? "bg-[#3bf6ff]/20 border-[#3bf6ff] text-[#3bf6ff]"
                                    : "border-white/10 text-white/30 hover:bg-white/5"
                                }`}
                              >
                                {m}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
      {showAddPart && (
        <AddParticipantModal
          presets={presets}
          onClose={() => setShowAddPart(false)}
          onConfirm={addParticipant}
        />
      )}
      {showAddBill && (
        <AddBillModal
          participants={event.participants || []}
          onClose={() => setShowAddBill(false)}
          onConfirm={addBill}
        />
      )}
      {editingRate && (
        <RateModal
          mode={tempMode}
          setMode={setTempMode}
          val={tempValue}
          setVal={setTempValue}
          onClose={() => setEditingRate(false)}
          onSave={() => {
            updateEvent({
              childConfig: {
                mode: tempMode,
                value: parseFloat(tempValue) || 0,
              },
            });
            setEditingRate(false);
          }}
        />
      )}
      {selectedPerson && (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
      {/* Edit Event Modal */}
      {isEditingEvent && (
        <CreateEventModal
          isEditing={true}
          initialData={{
            title: event.title,
            date: event.date,
            location: event.location,
          }}
          onClose={() => setIsEditingEvent(false)}
          onCreate={(data) => {
            updateEvent(data);
            setIsEditingEvent(false);
          }}
        />
      )}
    </div>
  );
};

const EventCard = ({ event, onClick, onRequestDelete }) => {
  const counts = (event.participants || []).reduce(
    (acc, p) => ({
      a: acc.a + (p.breakdown?.adult || 0),
      c: acc.c + (p.breakdown?.child || 0),
    }),
    { a: 0, c: 0 }
  );

  const settlement = useMemo(() => calculateSettlement(event), [event]);
  const isSettled = useMemo(() => {
    // If no transfers needed, or all existing transfers are checked off
    if (settlement.transfers.length === 0) {
      // Only show settled if there was at least some activity (bills exist)
      return (event.bills || []).length > 0;
    }
    return settlement.transfers.every(
      (t) => event.settledItems?.[`${t.from}_${t.to}`]
    );
  }, [settlement, event.settledItems, event.bills]);

  return (
    <div
      onClick={onClick}
      className={`relative group ${THEME.glassCard} p-6 rounded-[32px] active:scale-[0.98] transition-transform duration-300 cursor-pointer overflow-hidden`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <h3 className="text-3xl font-bold text-white tracking-tight drop-shadow-md break-words">
            {event.title}
          </h3>
          <div className="flex flex-col gap-1">
            <span
              className={`text-sm font-bold ${THEME.primaryText} flex items-center gap-2`}
            >
              <Calendar size={14} /> {event.date}
            </span>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {event.location && (
                <span
                  className={`text-xs font-bold ${THEME.secondaryText} flex items-center gap-1 opacity-80`}
                >
                  <MapPin size={12} /> {event.location}
                </span>
              )}
              {(counts.a > 0 || counts.c > 0) && (
                <span className="text-xs font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Users size={12} className="opacity-70" />
                  {counts.a > 0 ? `${counts.a}A` : ""}
                  {counts.c > 0 ? ` / ${counts.c}C` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          className="text-white/40 hover:text-red-400 transition-colors p-2 z-10"
        >
          <Trash2 size={24} />
        </button>
      </div>

      {/* Subtle Grey Settled Tag */}
      {isSettled && (
        <div className="absolute bottom-6 right-6 z-0 pointer-events-none select-none">
          <span className="text-xs font-bold text-white/40 bg-white/5 px-3 py-1 rounded-lg border border-white/10 tracking-widest uppercase">
            ALL SETTLED
          </span>
        </div>
      )}
    </div>
  );
};

// --- Modals ---
const Counter = ({ label, value, onChange, color }) => (
  <div
    className={`${THEME.glassCard} p-4 rounded-[24px] flex flex-col items-center`}
  >
    <span className={`text-xs font-bold ${color} uppercase mb-2`}>{label}</span>
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className={`w-8 h-8 rounded-full ${THEME.glassButton} flex items-center justify-center font-bold`}
      >
        -
      </button>
      <span className="text-2xl font-bold font-mono w-6 text-center text-white">
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className={`w-8 h-8 rounded-full ${THEME.glassButton} flex items-center justify-center font-bold`}
      >
        +
      </button>
    </div>
  </div>
);

const PersonDetailModal = ({ person, onClose }) => {
  const avgAdult =
    person.breakdown.adult > 0 ? person.adultCost / person.breakdown.adult : 0;
  const avgChild =
    person.breakdown.child > 0 ? person.childCost / person.breakdown.child : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`w-80 ${THEME.glassCard} p-6 rounded-[32px] border border-white/20`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white">{person.name}</h3>
            {person.isBirthday && (
              <span className="text-[#ffd700] text-xs font-bold border border-[#ffd700] px-2 py-0.5 rounded-full">
                Birthday Free
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">
              FAMILY
            </span>
            <span className="text-sm font-bold text-[#3bf6ff]">
              {person.breakdown.adult}A{" "}
              {person.breakdown.child > 0 && `/ ${person.breakdown.child}C`}
            </span>
          </div>
        </div>
        <div className="space-y-4 mb-8">
          <div className="bg-white/5 p-4 rounded-[20px] space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">
                大人 ({person.breakdown.adult}) x ${avgAdult.toFixed(1)}
              </span>
              <span className="font-mono font-bold text-white">
                ${person.adultCost.toFixed(1)}
              </span>
            </div>
            {person.breakdown.child > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">
                  小童 ({person.breakdown.child}) x ${avgChild.toFixed(1)}
                </span>
                <span className="font-mono font-bold text-white">
                  ${person.childCost.toFixed(1)}
                </span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between items-center mt-2">
              <span className="text-sm font-bold text-white/90">
                Total Cost
              </span>
              <span className="text-2xl font-mono font-bold text-[#d55eff]">
                ${person.cost.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-xs font-bold text-white/40">Paid</span>
            <span className="text-sm font-mono font-bold text-white">
              ${person.paid}
            </span>
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-xs font-bold text-white/40">Net</span>
            <span
              className={`text-sm font-mono font-bold ${
                person.net > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {person.net > 0.05
                ? `Receive $${Math.abs(person.net).toFixed(1)}`
                : person.net < -0.05
                ? `Pay $${Math.abs(person.net).toFixed(1)}`
                : "Settled"}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-[20px] font-bold text-lg ${THEME.actionButton}`}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const AddParticipantModal = ({ presets, onClose, onConfirm }) => {
  const [name, setName] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [isBirthday, setIsBirthday] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md ${THEME.glassPanel} rounded-t-[40px] p-8 pb-10 animate-in slide-in-from-bottom duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-2xl mb-6 text-white">Add Participant</h3>
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setName(p.name);
                setAdults(p.type === "adult" ? 1 : 0);
                setChildren(p.type === "child" ? 1 : 0);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-bold transition-all ${
                name === p.name
                  ? THEME.activeToggle
                  : "bg-white/5 border-white/10 text-white/50"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name..."
          className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-4 text-xl font-bold outline-none focus:border-[#3bf6ff] text-white mb-6"
        />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Counter
            label="Adult"
            value={adults}
            onChange={setAdults}
            color="text-[#3bf6ff]"
          />
          <Counter
            label="Child"
            value={children}
            onChange={setChildren}
            color="text-[#d55eff]"
          />
        </div>
        <button
          onClick={() => setIsBirthday(!isBirthday)}
          className={`w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border transition-all ${
            isBirthday
              ? "backdrop-blur-md bg-[#ffd700]/20 border-[#ffd700] text-[#ffd700]"
              : "bg-white/5 border-white/10 text-white/40"
          }`}
        >
          <Gift size={18} /> Birthday Free
        </button>
        <button
          onClick={() =>
            name &&
            onConfirm([
              {
                name,
                type: adults > 0 ? "adult" : "child",
                adultCount: adults,
                childCount: children,
                isBirthday,
              },
            ])
          }
          className={`w-full py-4 rounded-[24px] font-bold text-lg ${THEME.actionButton}`}
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

const AddBillModal = ({ participants, onClose, onConfirm }) => {
  const [mode, setMode] = useState("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const eligiblePayers = participants.filter(
    (p) => (p.breakdown.adult || 0) > 0
  );
  const payers = eligiblePayers.length > 0 ? eligiblePayers : participants;
  const [payerId, setPayerId] = useState(payers[0]?.id || "");
  const [splitAmong, setSplitAmong] = useState(participants.map((p) => p.id));
  const [debtorId, setDebtorId] = useState(
    payers[1]?.id || payers[0]?.id || ""
  );
  const toggleSplit = (id) =>
    splitAmong.includes(id)
      ? splitAmong.length > 1 &&
        setSplitAmong(splitAmong.filter((x) => x !== id))
      : setSplitAmong([...splitAmong, id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md ${THEME.glassPanel} rounded-t-[40px] p-8 pb-10 animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toggle Mode */}
        <div className="flex p-1 bg-white/10 rounded-xl mb-6">
          <button
            onClick={() => setMode("expense")}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
              mode === "expense" ? THEME.activeToggle : THEME.inactiveToggle
            }`}
          >
            消費 (Expense)
          </button>
          <button
            onClick={() => setMode("debt")}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
              mode === "debt"
                ? "bg-[#d55eff]/20 border border-[#d55eff]/50 text-[#d55eff]"
                : THEME.inactiveToggle
            }`}
          >
            過數/還錢 (Debt)
          </button>
        </div>

        {/* Input Title */}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "debt" ? "還款備註..." : "買咗咩/食咩..."}
          className="bg-transparent text-center w-full border-b border-white/10 pb-2 outline-none text-2xl font-bold text-white focus:border-[#3bf6ff] mb-6"
        />

        {/* Input Amount */}
        <div
          className={`flex items-center justify-center mb-8 ${
            mode === "debt" ? "text-[#d55eff]" : "text-[#3bf6ff]"
          }`}
        >
          <span className="text-3xl font-bold opacity-50 mr-2">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="bg-transparent text-5xl font-bold text-center w-48 outline-none text-white"
          />
        </div>

        {/* Payer Selection (Horizontal Scroll Fix Applied Here) */}
        <div className="mb-6">
          <p
            className={`text-xs text-center ${THEME.primaryText} mb-3 uppercase font-bold tracking-[0.2em]`}
          >
            {mode === "debt" ? "俾錢嗰個 (Creditor)" : "邊個俾錢? (Payer)"}
          </p>
          {/* Change: justify-center -> justify-start, added px-2, w-full */}
          <div className="flex justify-start gap-3 overflow-x-auto pb-4 px-2 no-scrollbar w-full">
            {payers.map((p) => (
              <button
                key={p.id}
                onClick={() => setPayerId(p.id)}
                className={`px-4 py-3 rounded-[16px] border flex-shrink-0 text-sm font-bold transition-all whitespace-nowrap ${
                  payerId === p.id
                    ? THEME.activeToggle
                    : "bg-white/5 border-white/5 text-white/40"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Expense Split Section */}
        {mode === "expense" ? (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 px-2">
              <p
                className={`text-xs ${THEME.secondaryText} uppercase font-bold tracking-[0.2em]`}
              >
                邊個夾錢? (Shared By)
              </p>
              <button
                onClick={() => setSplitAmong(participants.map((p) => p.id))}
                className="text-xs text-[#3bf6ff] font-bold"
              >
                全選 All
              </button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleSplit(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                    splitAmong.includes(p.id)
                      ? "bg-white/10 border-[#3bf6ff]/50 text-white"
                      : "bg-transparent border-white/5 text-white/30"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      splitAmong.includes(p.id) ? "bg-[#3bf6ff]" : "bg-white/10"
                    }`}
                  />
                  <span className="text-xs font-bold">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Debt Debtor Section (Horizontal Scroll Fix Applied Here) */
          <div className="mb-8">
            <p
              className={`text-xs text-center text-[#d55eff] mb-3 uppercase font-bold tracking-[0.2em]`}
            >
              借錢嗰個 (Debtor)
            </p>
            {/* Change: justify-center -> justify-start, added px-2, w-full */}
            <div className="flex justify-start gap-3 overflow-x-auto pb-4 px-2 no-scrollbar w-full">
              {payers
                .filter((p) => p.id !== payerId)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDebtorId(p.id)}
                    className={`px-4 py-3 rounded-[16px] border flex-shrink-0 text-sm font-bold transition-all whitespace-nowrap ${
                      debtorId === p.id
                        ? "bg-[#d55eff]/20 border-[#d55eff] text-[#d55eff]"
                        : "bg-white/5 border-white/5 text-white/40"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={() => {
            if (amount && payerId)
              onConfirm({
                type: mode,
                title: title || (mode === "debt" ? "借錢" : "雜項"),
                amount: parseFloat(amount),
                payerId,
                sharedBy:
                  mode === "expense" &&
                  splitAmong.length === participants.length
                    ? []
                    : splitAmong,
                debtorId: mode === "debt" ? debtorId : null,
              });
          }}
          className={`w-full py-4 rounded-[24px] font-bold text-lg ${THEME.actionButton}`}
        >
          確認 (Confirm)
        </button>
      </div>
    </div>
  );
};
const RateModal = ({ mode, setMode, val, setVal, onClose, onSave }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
    onClick={onClose}
  >
    <div
      className={`w-80 ${THEME.glassCard} p-6 rounded-[32px] border border-white/20`}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="font-bold text-lg mb-6 text-center text-white">
        Child Rate
      </h3>
      <div className="flex p-1 bg-white/10 rounded-xl mb-6">
        <button
          onClick={() => setMode("rate")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            mode === "rate" ? THEME.activeToggle : THEME.inactiveToggle
          }`}
        >
          Rate (x)
        </button>
        <button
          onClick={() => setMode("fixed")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            mode === "fixed" ? THEME.activeToggle : THEME.inactiveToggle
          }`}
        >
          Fixed ($)
        </button>
      </div>
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() =>
            setVal(
              Math.max(
                0,
                parseFloat(val || 0) - (mode === "rate" ? 0.1 : 10)
              ).toFixed(mode === "rate" ? 1 : 0)
            )
          }
          className={`w-12 h-12 rounded-full font-bold text-xl ${THEME.glassButton}`}
        >
          -
        </button>
        <input
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="text-4xl font-mono font-bold w-32 text-center text-[#d55eff] bg-transparent outline-none border-b border-white/10"
        />
        <button
          onClick={() =>
            setVal(
              (parseFloat(val || 0) + (mode === "rate" ? 0.1 : 10)).toFixed(
                mode === "rate" ? 1 : 0
              )
            )
          }
          className={`w-12 h-12 rounded-full font-bold text-xl ${THEME.glassButton}`}
        >
          +
        </button>
      </div>
      <button
        onClick={onSave}
        className={`w-full py-3 rounded-[20px] font-bold text-lg ${THEME.actionButton}`}
      >
        Save
      </button>
    </div>
  </div>
);

const SettingsView = ({
  presets,
  onAdd,
  onDelete,
  onBack,
  roomName,
  user,
  appId,
}) => {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [savedPin, setSavedPin] = useState(null);
  const [loadingPin, setLoadingPin] = useState(false);

  // Request Deletion State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Fetch PIN status
  useEffect(() => {
    const fetchPin = async () => {
      try {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          `meta_${roomName}`,
          "settings"
        );
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().pin) {
          setSavedPin(snap.data().pin);
          setPin(snap.data().pin);
        }
      } catch (e) {
        console.error("Fetch PIN Error", e);
      }
    };
    if (roomName) fetchPin();
  }, [roomName, appId]);

  const savePin = async () => {
    if (!roomName || pin.length !== 4) return;
    setLoadingPin(true);
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `meta_${roomName}`,
        "settings"
      );
      await setDoc(docRef, { pin }, { merge: true });
      setSavedPin(pin);
    } catch (e) {
      console.error("Save PIN Error", e);
    } finally {
      setLoadingPin(false);
    }
  };

  const removePin = async () => {
    setLoadingPin(true);
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        `meta_${roomName}`,
        "settings"
      );
      await setDoc(docRef, { pin: null }, { merge: true });
      setSavedPin(null);
      setPin("");
    } catch (e) {
      console.error("Remove PIN Error", e);
    } finally {
      setLoadingPin(false);
    }
  };

  // --- 新增：提交刪除申請 (Request Deletion) ---
  const handleRequestDeletion = async () => {
    setIsSubmitting(true);
    try {
      // 寫入一個名為 system_deletion_requests 的 collection
      const requestRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "system_deletion_requests"
      );
      await addDoc(requestRef, {
        roomName: roomName,
        requestedAt: serverTimestamp(),
        status: "pending",
        reason: "User requested deletion via Settings",
      });
      setRequestSent(true);
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSent(false);
      }, 2000);
    } catch (e) {
      console.error("Request Error", e);
      alert("Error sending request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 h-screen flex flex-col relative">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className={`w-12 h-12 rounded-full ${THEME.glassButton} flex items-center justify-center text-white`}
        >
          <X />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white">Settings</h2>
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-1">
            Room: {roomName}
          </p>
        </div>
      </div>

      <div className="space-y-8 overflow-y-auto pb-24 no-scrollbar">
        {/* Security Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#3bf6ff] uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={16} /> Room Security
          </h3>
          <div className={`${THEME.glassCard} p-6 rounded-[24px]`}>
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  savedPin
                    ? "bg-[#d55eff]/20 text-[#d55eff]"
                    : "bg-white/5 text-white/30"
                }`}
              >
                {savedPin ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <div>
                <h4 className="font-bold text-white">
                  {savedPin ? "Room Locked" : "Public Room"}
                </h4>
                <p className="text-xs text-white/50">
                  {savedPin
                    ? "PIN required to enter."
                    : "Anyone with the name can join."}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="tel"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Set 4-digit PIN"
                  className="w-full bg-white/5 border border-white/10 rounded-[16px] pl-10 pr-4 py-3 text-lg font-bold outline-none focus:border-[#d55eff] text-white tracking-widest"
                />
              </div>
              {savedPin ? (
                <button
                  onClick={removePin}
                  disabled={loadingPin}
                  className={`px-4 rounded-[16px] font-bold ${THEME.dangerButton}`}
                >
                  Unlock
                </button>
              ) : (
                <button
                  onClick={savePin}
                  disabled={loadingPin || pin.length !== 4}
                  className={`px-4 rounded-[16px] font-bold ${THEME.actionButton} disabled:opacity-30`}
                >
                  Lock
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Presets Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#3bf6ff] uppercase tracking-widest flex items-center gap-2">
            <Users size={16} /> Shared Presets
          </h3>
          <div className="flex gap-2 w-full">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name..."
              className="flex-1 bg-white/5 border border-white/10 rounded-[20px] px-4 py-3 text-base font-bold outline-none focus:border-[#3bf6ff] text-white"
            />
            <button
              onClick={() => {
                if (name) {
                  onAdd(name, "adult");
                  setName("");
                }
              }}
              className={`px-4 rounded-[20px] font-bold whitespace-nowrap ${THEME.actionButton}`}
            >
              Add
            </button>
          </div>
          <div className="space-y-3">
            {presets.length === 0 && (
              <p className="text-center text-white/20 italic">
                No shared presets yet.
              </p>
            )}
            {presets.map((p) => (
              <div
                key={p.id}
                className={`${THEME.glassCard} p-5 rounded-[24px] flex justify-between items-center`}
              >
                <span className="text-lg font-bold text-white">{p.name}</span>
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-white/30 hover:text-red-400 p-2"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* --- REPORT ZONE (Request Deletion) --- */}
        <div className="pt-8 border-t border-white/10">
          <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <AlertTriangle size={16} /> Room Management
          </h3>
          <div
            className={`${THEME.glassCard} p-6 rounded-[24px] border border-yellow-500/20 bg-yellow-500/5`}
          >
            <p className="text-sm text-white/70 mb-4">
              Created by mistake? Send a request to the admin to delete this
              room.
            </p>
            <button
              onClick={() => setShowRequestModal(true)}
              className={`w-full py-4 rounded-[16px] font-bold flex items-center justify-center gap-2 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20 transition-all`}
            >
              <MessageCircle size={20} /> Request Deletion
            </button>
          </div>
        </div>
      </div>

      {/* --- Request Confirmation Modal --- */}
      {showRequestModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          onClick={() => !isSubmitting && setShowRequestModal(false)}
        >
          <div
            className={`${THEME.glassCard} w-full max-w-sm p-8 rounded-[32px] text-center space-y-6 border-yellow-500/30 animate-in zoom-in duration-200 bg-slate-900`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto text-yellow-500">
              <AlertTriangle size={32} />
            </div>

            {requestSent ? (
              <div className="py-6">
                <h3 className="text-2xl font-black text-green-400 mb-2">
                  Request Sent!
                </h3>
                <p className="text-white/50">Admin will review shortly.</p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Confirm Request?
                  </h3>
                  <p className="text-white/50 text-sm mt-2">
                    You are asking Admin to delete:
                  </p>
                  <div className="mt-2 bg-white/5 py-2 rounded-lg border border-white/10">
                    <span className="font-mono font-bold text-[#3bf6ff] text-xl">
                      {roomName}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRequestModal(false)}
                    disabled={isSubmitting}
                    className={`flex-1 py-3 rounded-xl ${THEME.secondaryButton}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestDeletion}
                    disabled={isSubmitting}
                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500/30`}
                  >
                    {isSubmitting ? (
                      <RefreshCcw className="animate-spin" size={18} />
                    ) : (
                      "Send Request"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
const CreateEventModal = ({ onClose, onCreate, isEditing, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split("T")[0]
  );
  const [location, setLocation] = useState(initialData?.location || "");
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md ${THEME.glassPanel} rounded-t-[40px] p-8 pb-10 animate-in slide-in-from-bottom duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold mb-8 text-white">
          {isEditing ? "Edit Event" : "Create Event"}
        </h3>
        <div className="space-y-6 mb-10">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title..."
            className="w-full bg-transparent border-b border-white/20 py-3 text-2xl font-bold outline-none focus:border-[#3bf6ff] placeholder:text-white/30 transition-colors text-white"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-[#3bf6ff] uppercase font-bold tracking-widest mb-1 block">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-2 text-lg outline-none focus:border-[#3bf6ff] text-white"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#3bf6ff] uppercase font-bold tracking-widest mb-1 block">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full bg-transparent border-b border-white/20 py-2 text-lg outline-none focus:border-[#3bf6ff] text-white"
              />
            </div>
          </div>
        </div>
        <button
          onClick={async () => {
            if (title) {
              await onCreate({ title, date, location });
              onClose();
            }
          }}
          className={`w-full py-4 rounded-[24px] font-bold text-lg ${THEME.actionButton}`}
        >
          {isEditing ? "Save Changes" : "Create"}
        </button>
      </div>
    </div>
  );
};

// --- Logic ---
const calculateSettlement = (event) => {
  if (!event || !event.participants) return { transfers: [], statsArray: [] };
  const {
    participants = [],
    bills = [],
    childConfig = { mode: "rate", value: 0.5 },
  } = event;

  // 1. Init stats
  const stats = {};
  participants.forEach((p) => {
    stats[p.id] = {
      id: p.id,
      name: p.name,
      paid: 0, // Raw float
      cost: 0, // Raw float
      adultCost: 0,
      childCost: 0,
      breakdown: p.breakdown,
      isBirthday: p.isBirthday,
      // Final integer values will be stored here later
      finalPaid: 0,
      finalCost: 0,
      net: 0,
    };
  });

  // 2. Accumulate Raw Floats
  bills.forEach((bill) => {
    if (!stats[bill.payerId]) return;
    const amt = parseFloat(bill.amount);

    // Accumulate Payer's Paid amount
    stats[bill.payerId].paid += amt;

    // Distribute Cost
    if (bill.type === "debt") {
      // Debt: Debtor incurs cost, Payer gets credit (via paid)
      if (stats[bill.debtorId]) {
        stats[bill.debtorId].cost += amt;
        stats[bill.debtorId].adultCost =
          (stats[bill.debtorId].adultCost || 0) + amt;
      }
    } else {
      // Expense: Split logic
      const sharedByIDs =
        bill.sharedBy && bill.sharedBy.length > 0
          ? bill.sharedBy
          : participants.map((p) => p.id);
      const billParticipants = participants.filter((p) =>
        sharedByIDs.includes(p.id)
      );
      if (billParticipants.length === 0) return;

      let unitCostAdult = 0;
      let unitCostChild = 0;

      if (childConfig.mode === "rate") {
        const totalWeight = billParticipants.reduce(
          (sum, p) =>
            p.isBirthday
              ? sum
              : sum +
                (p.breakdown.adult || 0) +
                (p.breakdown.child || 0) * childConfig.value,
          0
        );
        if (totalWeight > 0) {
          const unitCost = amt / totalWeight;
          unitCostAdult = unitCost;
          unitCostChild = unitCost * childConfig.value;
        }
      } else {
        const fixedPerChild = childConfig.value;
        let totalParticipatingAdults = 0,
          totalParticipatingChildren = 0;
        billParticipants.forEach((p) => {
          if (!p.isBirthday) {
            totalParticipatingAdults += p.breakdown.adult || 0;
            totalParticipatingChildren += p.breakdown.child || 0;
          }
        });
        const totalChildPool = totalParticipatingChildren * fixedPerChild;
        const totalAdultPool = Math.max(0, amt - totalChildPool);
        unitCostChild = fixedPerChild;
        if (totalParticipatingAdults > 0)
          unitCostAdult = totalAdultPool / totalParticipatingAdults;
      }

      billParticipants.forEach((p) => {
        if (p.isBirthday) return;
        const ac = unitCostAdult * (p.breakdown.adult || 0);
        const cc = unitCostChild * (p.breakdown.child || 0);
        stats[p.id].cost += ac + cc;
        stats[p.id].adultCost += ac;
        stats[p.id].childCost += cc;
      });
    }
  });

  const statsArray = Object.values(stats);

  // 3. Integer Rounding & Balancing (Largest Remainder Method)
  // Step A: Round everyone's PAID amount first. This defines the TRUE TOTAL POT.
  let totalPot = 0;
  statsArray.forEach((p) => {
    p.finalPaid = Math.round(p.paid);
    totalPot += p.finalPaid;
  });

  // Step B: Floor everyone's calculated COST.
  let currentDistributedCost = 0;
  statsArray.forEach((p) => {
    p.finalCost = Math.floor(p.cost); // Take integer part
    p.decimalPart = p.cost - p.finalCost; // Keep decimal for sorting
    currentDistributedCost += p.finalCost;
  });

  // Step C: Calculate remainder to distribute
  let remainder = totalPot - currentDistributedCost;

  // Step D: Distribute remainder to those with highest decimal parts
  if (remainder > 0) {
    // Sort by decimal part descending
    // If decimals are equal, maybe sort by higher total cost to be fair?
    statsArray.sort((a, b) => b.decimalPart - a.decimalPart);

    for (let i = 0; i < remainder; i++) {
      // Loop wrapping around if remainder > array length (unlikely but safe)
      statsArray[i % statsArray.length].finalCost += 1;
    }
  } else if (remainder < 0) {
    // Rare case: if rounding Paid down caused TotalPot < Sum(Floor(Cost))
    // We need to subtract cost. (Logic inverse of above)
    // Sort by decimal part ascending (smallest decimals lose $1 first)
    statsArray.sort((a, b) => a.decimalPart - b.decimalPart);
    const absRemainder = Math.abs(remainder);
    for (let i = 0; i < absRemainder; i++) {
      statsArray[i % statsArray.length].finalCost -= 1;
    }
  }

  // 4. Calculate Net (Must be integer now)
  // Re-sort to standard or random order isn't strictly necessary for logic,
  // but let's keep Debtors/Creditors sorting later.
  let debtors = [];
  let creditors = [];

  statsArray.forEach((p) => {
    // Update display values to match the forced integer logic
    p.cost = p.finalCost;
    p.paid = p.finalPaid;
    p.adultCost = Math.round(p.adultCost); // Visual approximation
    p.childCost = p.cost - p.adultCost; // Force balance visual

    p.net = p.finalPaid - p.finalCost;

    if (p.net < 0) debtors.push(p);
    else if (p.net > 0) creditors.push(p);
  });

  // 5. Generate Transfers
  debtors.sort((a, b) => a.net - b.net);
  creditors.sort((a, b) => b.net - a.net);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    let d = debtors[i];
    let c = creditors[j];

    // Both are integers
    let amt = Math.min(Math.abs(d.net), c.net);

    if (amt > 0) {
      transfers.push({ from: d.name, to: c.name, amount: amt.toString() }); // string for display
      d.net += amt;
      c.net -= amt;
    }

    if (d.net === 0) i++;
    if (c.net === 0) j++;
  }

  // Return the original array (which now has updated integer .cost/.paid/.net)
  // We need to re-sort statsArray by something consistent for display?
  // currently it's sorted by decimal remainder from the balancing step.
  // Let's sort by name for the list view
  statsArray.sort((a, b) => a.name.localeCompare(b.name));

  return { transfers, statsArray };
};
