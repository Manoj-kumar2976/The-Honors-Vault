import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const API = "http://localhost:8082/api";

// Unique ID generator - outside component, never resets
let _uid = 0;
const uid = () => `${++_uid}-${Date.now()}`;

// API helpers
const post = async (url, body) => {
  const res = await fetch(API + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const get = async (url) => {
  const res = await fetch(API + url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

const put = async (url, body) => {
  const res = await fetch(API + url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const del = async (url) => {
  const res = await fetch(API + url, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
};

// ─── Toast ────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type) => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  return {
    toasts,
    success: msg => add(msg, "success"),
    error:   msg => add(msg, "error"),
    info:    msg => add(msg, "info"),
  };
}

function Toasts({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:"fixed", top:16, right:16, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

// ─── CAPTCHA ──────────────────────────────────────────────
function makeCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { q: `${a} + ${b} = ?`, ans: a + b };
}

// ─── APP ──────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState("login");
  const [user, setUser]         = useState(null);
  const [achievements, setAch]  = useState([]);
  const [users, setUsers]       = useState([]);
  const [payments, setPay]      = useState([]);
  const [messages, setMsgs]     = useState([]);
  const toast = useToast();

  useEffect(() => {
    get("/achievements").then(setAch).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) get("/users").then(setUsers).catch(() => {});
  }, [user]);

  const handleLogin = async (email, password) => {
    const u = await post("/auth/login", { email, password });
    setUser(u);
    setPage("dashboard");
    toast.success(`Welcome, ${u.name}!`);
  };

  const handleSignup = async (data) => {
    await post("/auth/signup", data);
    toast.success("Account created! Please login.");
    setPage("login");
  };

  const handleLogout = () => {
    setUser(null);
    setUsers([]);
    setPage("login");
  };

  const addAch = async (data) => {
    const saved = await post("/achievements", data);
    setAch(p => [...p, saved]);
    toast.success("Achievement added!");
  };

  const updateAch = async (updated) => {
    const saved = await put(`/achievements/${updated.id}`, updated);
    setAch(p => p.map(a => a.id === saved.id ? saved : a));
    toast.success("Achievement updated!");
  };

  const deleteAch = async (id) => {
    await del(`/achievements/${id}`);
    setAch(p => p.filter(a => a.id !== id));
    toast.success("Achievement deleted.");
  };

  const addPayment = (data) => {
    setPay(p => [{ id: uid(), ...data, status: "Success (Demo)", time: new Date().toLocaleString() }, ...p]);
    toast.success("Demo payment done!");
  };

  const sendMsg = ({ from, to, text }) => {
    if (!text.trim()) return;
    setMsgs(p => [...p, { id: uid(), from, to, text, time: new Date().toLocaleTimeString() }]);
  };

  return (
    <div className="app">
      <div className="bg" />
      <Toasts toasts={toast.toasts} />

      {page === "login" && (
        <AuthLayout>
          <LoginForm onLogin={handleLogin} goSignup={() => setPage("signup")} toast={toast} />
        </AuthLayout>
      )}
      {page === "signup" && (
        <AuthLayout>
          <SignupForm onSignup={handleSignup} goLogin={() => setPage("login")} toast={toast} />
        </AuthLayout>
      )}
      {page === "dashboard" && user && (
        <div className="dash-root">
          <nav className="navbar">
            <div className="nav-brand">🏆 Honors Vault</div>
            <div className="nav-user">
              <span className={`badge ${user.role}`}>{user.role}</span>
              <strong>{user.name}</strong>
              <span className="nav-email">{user.email}</span>
              <button className="btn outline sm" onClick={handleLogout}>Logout</button>
            </div>
          </nav>

          {user.role === "admin" ? (
            <AdminView
              achievements={achievements} users={users}
              payments={payments} messages={messages}
              currentUser={user} toast={toast}
              onAdd={addAch} onUpdate={updateAch} onDelete={deleteAch}
              onSend={sendMsg}
            />
          ) : (
            <StudentView
              achievements={achievements} users={users}
              payments={payments} messages={messages}
              currentUser={user} toast={toast}
              onPay={addPayment} onSend={sendMsg}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── AUTH LAYOUT ──────────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-logo">🏆</div>
        <h1>Extracurricular Achievement Portal</h1>
        <p>Track awards, recognitions and participation beyond academics.</p>
        <ul>
          <li>Admins manage student achievements</li>
          <li>Students view and download certificates</li>
          <li>Live chat between admin and students</li>
          <li>Demo payment integration</li>
        </ul>
      </div>
      <div className="auth-right">{children}</div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────
function LoginForm({ onLogin, goSignup, toast }) {
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [cap, setCap]           = useState(makeCaptcha);
  const [capIn, setCapIn]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !pass) { toast.error("Fill all fields"); return; }
    if (parseInt(capIn) !== cap.ans) { toast.error("Wrong CAPTCHA"); setCap(makeCaptcha()); setCapIn(""); return; }
    setLoading(true);
    try { await onLogin(email.trim().toLowerCase(), pass); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h2>Welcome back 👋</h2>
      <p className="sub">Login to manage or view achievements.</p>
      <form onSubmit={submit} className="form">
        <label>Email</label>
        <input type="email" placeholder="you@college.edu" value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password</label>
        <div className="pw-wrap">
          <input type={showPass ? "text" : "password"} placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} />
          <button type="button" className="pw-eye" onClick={() => setShowPass(p => !p)}>{showPass ? "🙈" : "👁"}</button>
        </div>
        <label>CAPTCHA: <strong>{cap.q}</strong></label>
        <div className="cap-row">
          <input type="number" placeholder="Answer" value={capIn} onChange={e => setCapIn(e.target.value)} />
          <button type="button" className="btn outline sm" onClick={() => { setCap(makeCaptcha()); setCapIn(""); }}>↺</button>
        </div>
        <button className="btn primary full" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
      </form>
      <p className="switch">Don't have an account? <button className="link" onClick={goSignup}>Sign up</button></p>
    </div>
  );
}

// ─── SIGNUP ───────────────────────────────────────────────
function SignupForm({ onSignup, goLogin, toast }) {
  const [role, setRole]         = useState("student");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [conf, setConf]         = useState("");
  const [cap, setCap]           = useState(makeCaptcha);
  const [capIn, setCapIn]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !email || !pass) { toast.error("Fill all fields"); return; }
    if (pass.length < 6) { toast.error("Password min 6 chars"); return; }
    if (pass !== conf) { toast.error("Passwords don't match"); return; }
    if (parseInt(capIn) !== cap.ans) { toast.error("Wrong CAPTCHA"); setCap(makeCaptcha()); setCapIn(""); return; }
    setLoading(true);
    try { await onSignup({ name: name.trim(), email: email.trim().toLowerCase(), password: pass, role }); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h2>Create account ✨</h2>
      <p className="sub">Join the portal to track achievements.</p>
      <form onSubmit={submit} className="form">
        <label>Role</label>
        <div className="role-row">
          <button type="button" className={`role-btn ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}>🎓 Student</button>
          <button type="button" className={`role-btn ${role === "admin" ? "active" : ""}`} onClick={() => setRole("admin")}>🛡 Admin</button>
        </div>
        <label>Full Name</label>
        <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
        <label>Email</label>
        <input type="email" placeholder="you@college.edu" value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" placeholder="Min 6 characters" value={pass} onChange={e => setPass(e.target.value)} />
        <label>Confirm Password</label>
        <input type="password" placeholder="Re-enter password" value={conf} onChange={e => setConf(e.target.value)} className={conf && conf !== pass ? "err" : ""} />
        <label>CAPTCHA: <strong>{cap.q}</strong></label>
        <div className="cap-row">
          <input type="number" placeholder="Answer" value={capIn} onChange={e => setCapIn(e.target.value)} />
          <button type="button" className="btn outline sm" onClick={() => { setCap(makeCaptcha()); setCapIn(""); }}>↺</button>
        </div>
        <button className="btn primary full" disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
      </form>
      <p className="switch">Already have an account? <button className="link" onClick={goLogin}>Login</button></p>
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────
function AdminView({ achievements, users, payments, messages, currentUser, toast, onAdd, onUpdate, onDelete, onSend }) {
  const [tab, setTab] = useState("achievements");
  const [search, setSearch] = useState("");
  const students = users.filter(u => u.role === "student");

  const filtered = achievements.filter(a =>
    (a.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.activity || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dash">
      <div className="stats-row">
        <Stat icon="🏅" label="Total" val={achievements.length} />
        <Stat icon="🏆" label="Awards" val={achievements.filter(a => a.category === "Award").length} />
        <Stat icon="🌟" label="Recognition" val={achievements.filter(a => a.category === "Recognition").length} />
        <Stat icon="🎯" label="Participation" val={achievements.filter(a => a.category === "Participation").length} />
        <Stat icon="👥" label="Students" val={students.length} />
        <Stat icon="💳" label="Payments" val={payments.length} />
      </div>

      <div className="two-col">
        <AchievementForm users={users} onAdd={onAdd} toast={toast} />
        <div className="card">
          <h4>📊 Level Breakdown</h4>
          {["International","National","State","Intercollege","College"].map(l => (
            <div key={l} className="stat-row">
              <span>{l}</span>
              <strong>{achievements.filter(a => a.level === l).length}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="tabs">
        {["achievements","students","payments","chat"].map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "achievements" && "🏅 Achievements"}
            {t === "students" && "👥 Students"}
            {t === "payments" && "💳 Payments"}
            {t === "chat" && "💬 Chat"}
          </button>
        ))}
      </div>

      {tab === "achievements" && (
        <div className="card">
          <div className="tbl-hdr">
            <h4>All Achievements</h4>
            <input placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <AchTable achievements={filtered} onUpdate={onUpdate} onDelete={onDelete} toast={toast} />
        </div>
      )}

      {tab === "students" && (
        <div className="card">
          <h4>Registered Students</h4>
          {students.length === 0 ? <p className="empty">No students yet.</p> : (
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Achievements</th></tr></thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{achievements.filter(a => a.studentEmail === s.email).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="card">
          <h4>Payments (Demo)</h4>
          {payments.length === 0 ? <p className="empty">No payments yet.</p> : (
            <table className="tbl">
              <thead><tr><th>Student</th><th>Amount</th><th>Purpose</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.studentName}</td>
                    <td>{p.amount}</td>
                    <td>{p.purpose}</td>
                    <td><span className="badge award">{p.status}</span></td>
                    <td>{p.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="card">
          <h4>💬 Chat with Students</h4>
          <Chat mode="admin" currentUser={currentUser} users={users} messages={messages} onSend={onSend} />
        </div>
      )}
    </div>
  );
}

// ─── STUDENT VIEW ─────────────────────────────────────────
function StudentView({ achievements, users, payments, messages, currentUser, toast, onPay, onSend }) {
  const [tab, setTab] = useState("achievements");
  const mine = achievements.filter(a => a.studentEmail === currentUser.email);
  const myPay = payments.filter(p => p.studentEmail === currentUser.email);

  return (
    <div className="dash">
      <div className="welcome-bar">
        <div className="avatar">{currentUser.name[0]}</div>
        <div><h3>Welcome, {currentUser.name}!</h3><p>Here are your achievements.</p></div>
      </div>

      <div className="stats-row">
        <Stat icon="🏅" label="Total" val={mine.length} />
        <Stat icon="🏆" label="Awards" val={mine.filter(a => a.category === "Award").length} />
        <Stat icon="🌟" label="Recognition" val={mine.filter(a => a.category === "Recognition").length} />
        <Stat icon="🎯" label="Participation" val={mine.filter(a => a.category === "Participation").length} />
        <Stat icon="💳" label="Payments" val={myPay.length} />
      </div>

      <div className="card premium">
        <div className="premium-inner">
          <div>
            <h4>🎓 Premium Features</h4>
            <p>Unlock downloadable certificates and priority verification.</p>
            <small>⚠ Demo only — no real money processed</small>
          </div>
          <div className="premium-right">
            <div className="price">₹499</div>
            <button className="btn primary" onClick={() => onPay({ studentName: currentUser.name, studentEmail: currentUser.email, amount: "₹499", purpose: "Premium Access" })}>
              Pay (Demo)
            </button>
            {myPay.length > 0 && <small className="paid">✓ Paid on {myPay[0].time}</small>}
          </div>
        </div>
      </div>

      <div className="tabs">
        {["achievements","payments","chat"].map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "achievements" && "🏅 My Achievements"}
            {t === "payments" && "💳 Payments"}
            {t === "chat" && "💬 Chat"}
          </button>
        ))}
      </div>

      {tab === "achievements" && (
        <div className="card">
          <h4>My Achievements</h4>
          {mine.length === 0 ? <p className="empty">No achievements yet. Contact admin.</p> : (
            <div className="ach-grid">
              {mine.map(a => <AchCard key={a.id} a={a} name={currentUser.name} />)}
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="card">
          <h4>My Payments</h4>
          {myPay.length === 0 ? <p className="empty">No payments yet.</p> : (
            <table className="tbl">
              <thead><tr><th>Purpose</th><th>Amount</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>{myPay.map(p => <tr key={p.id}><td>{p.purpose}</td><td>{p.amount}</td><td>{p.status}</td><td>{p.time}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === "chat" && (
        <div className="card">
          <h4>💬 Chat with Admin</h4>
          <Chat mode="student" currentUser={currentUser} users={users} messages={messages} onSend={onSend} />
        </div>
      )}
    </div>
  );
}

// ─── ACHIEVEMENT FORM ─────────────────────────────────────
function AchievementForm({ users, onAdd, toast }) {
  const blank = { studentEmail: "", activity: "", category: "Participation", level: "College", date: "", description: "" };
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);
  const students = users.filter(u => u.role === "student");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentEmail || !form.activity || !form.date) { toast.error("Fill required fields"); return; }
    const student = users.find(u => u.email === form.studentEmail);
    setLoading(true);
    try {
      await onAdd({ ...form, studentName: student?.name || "" });
      setForm(blank);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h4>➕ Add Achievement</h4>
      <form onSubmit={submit} className="form">
        <label>Student</label>
        <select value={form.studentEmail} onChange={e => setForm(p => ({ ...p, studentEmail: e.target.value }))}>
          <option value="">— Select Student —</option>
          {students.map(s => <option key={s.id} value={s.email}>{s.name}</option>)}
        </select>
        <label>Activity / Event</label>
        <input placeholder="e.g. Inter-College Debate" value={form.activity} onChange={e => setForm(p => ({ ...p, activity: e.target.value }))} />
        <div className="three-col">
          <div>
            <label>Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option>Participation</option><option>Award</option><option>Recognition</option>
            </select>
          </div>
          <div>
            <label>Level</label>
            <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
              <option>College</option><option>Intercollege</option><option>State</option><option>National</option><option>International</option>
            </select>
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
        </div>
        <label>Description</label>
        <textarea placeholder="Brief note..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        <button className="btn primary full" disabled={loading}>{loading ? "Saving..." : "Save Achievement"}</button>
      </form>
    </div>
  );
}

// ─── ACHIEVEMENT TABLE ────────────────────────────────────
function AchTable({ achievements, onUpdate, onDelete, toast }) {
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(null);

  if (achievements.length === 0) return <p className="empty">No achievements found.</p>;

  const save = async (a) => {
    setLoading(a.id);
    try { await onUpdate({ ...a, ...editData }); setEditId(null); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(null); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this achievement?")) return;
    setLoading(id);
    try { await onDelete(id); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(null); }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="tbl">
        <thead>
          <tr><th>Student</th><th>Activity</th><th>Category</th><th>Level</th><th>Date</th><th>Description</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {achievements.map(a => editId === a.id ? (
            <tr key={a.id} className="editing">
              <td>{a.studentName}</td>
              <td><input className="tbl-input" value={editData.activity} onChange={e => setEditData(p => ({ ...p, activity: e.target.value }))} /></td>
              <td>{a.category}</td><td>{a.level}</td><td>{a.date}</td>
              <td><input className="tbl-input" value={editData.description} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} /></td>
              <td className="actions">
                <button className="btn primary sm" onClick={() => save(a)} disabled={!!loading}>Save</button>
                <button className="btn outline sm" onClick={() => setEditId(null)}>Cancel</button>
              </td>
            </tr>
          ) : (
            <tr key={a.id}>
              <td>{a.studentName}</td>
              <td>{a.activity}</td>
              <td><span className={`badge ${a.category?.toLowerCase()}`}>{a.category}</span></td>
              <td>{a.level}</td><td>{a.date}</td>
              <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</td>
              <td className="actions">
                <button className="btn sm" onClick={() => { setEditId(a.id); setEditData({ activity: a.activity, description: a.description || "" }); }}>Edit</button>
                <button className="btn danger sm" onClick={() => remove(a.id)} disabled={loading === a.id}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ACHIEVEMENT CARD ─────────────────────────────────────
function AchCard({ a, name }) {
  const download = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{font-family:Georgia,serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9f9f9}.cert{width:680px;border:8px double #4f46e5;padding:48px;text-align:center;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,.12)}.seal{font-size:3rem;margin-bottom:1rem}.title{font-size:2rem;color:#4f46e5;letter-spacing:2px}.sub{color:#6b7280;margin-bottom:2rem}.name{font-size:1.8rem;font-weight:700;border-bottom:2px solid #4f46e5;display:inline-block;padding-bottom:4px;margin-bottom:1.5rem}.activity{font-size:1.2rem;font-weight:700;color:#4f46e5;margin:0.5rem 0}.meta{margin-top:2rem;display:flex;justify-content:space-around}.meta div{font-size:.9rem;color:#6b7280}.meta strong{display:block;font-size:1rem;color:#111}.footer{margin-top:3rem;font-size:.75rem;color:#9ca3af}</style></head><body><div class="cert"><div class="seal">🏆</div><div class="title">CERTIFICATE OF ACHIEVEMENT</div><div class="sub">The Honors Vault — Extracurricular Achievement Portal</div><p>This certifies that</p><div class="name">${name}</div><p>has demonstrated excellence in</p><div class="activity">${a.activity}</div><p>${a.description || ""}</p><div class="meta"><div><strong>${a.category}</strong>Category</div><div><strong>${a.level}</strong>Level</div><div><strong>${a.date}</strong>Date</div></div><div class="footer">Generated by The Honors Vault • ${new Date().toLocaleDateString()}</div></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `certificate-${a.activity.replace(/\s+/g, "-")}.html` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ach-card">
      <div className="ach-top">
        <span className="ach-icon">{a.category === "Award" ? "🏆" : a.category === "Recognition" ? "🌟" : "🎯"}</span>
        <span className={`badge ${a.category?.toLowerCase()}`}>{a.category}</span>
      </div>
      <h5>{a.activity}</h5>
      <p className="ach-level">{a.level} • {a.date}</p>
      {a.description && <p className="ach-desc">{a.description}</p>}
      <button className="btn outline sm" onClick={download}>⬇ Certificate</button>
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────
function Chat({ mode, currentUser, users, messages, onSend }) {
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const admins = users.filter(u => u.role === "admin");
  const students = users.filter(u => u.role === "student");

  useEffect(() => {
    const targets = mode === "admin" ? students : admins;
    if (!to && targets.length > 0) setTo(targets[0].email);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, to]);

  const targets = mode === "admin" ? students : admins;
  if (targets.length === 0) return <p className="empty">No {mode === "admin" ? "students" : "admins"} available.</p>;

  const convo = messages.filter(m =>
    (m.from === currentUser.email && m.to === to) ||
    (m.from === to && m.to === currentUser.email)
  );

  const getName = email => users.find(u => u.email === email)?.name || email;

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend({ from: currentUser.email, to, text });
    setText("");
  };

  return (
    <div className="chat">
      {mode === "admin" && (
        <div className="chat-target">
          <label>Chat with: </label>
          <select value={to} onChange={e => setTo(e.target.value)}>
            {students.map(s => <option key={s.id} value={s.email}>{s.name}</option>)}
          </select>
        </div>
      )}
      {mode === "student" && to && (
        <div className="chat-info">Chatting with <strong>{getName(to)}</strong> (Admin)</div>
      )}
      <div className="chat-box">
        {convo.length === 0 ? (
          <div className="chat-empty"><span>💬</span><p>No messages yet.</p></div>
        ) : (
          convo.map(m => (
            <div key={m.id} className={`msg ${m.from === currentUser.email ? "me" : "them"}`}>
              <div className="bubble">{m.text}</div>
              <div className="msg-meta">{getName(m.from)} · {m.time}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="chat-input">
        <input placeholder="Type a message..." value={text} onChange={e => setText(e.target.value)} />
        <button className="btn primary sm" type="submit" disabled={!text.trim()}>Send</button>
      </form>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────
function Stat({ icon, label, val }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-val">{val}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}