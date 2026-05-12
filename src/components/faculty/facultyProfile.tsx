// FacultyProfile.tsx
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { getFacultyProfile, manageProfile } from "../../utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, EyeOff, Upload, Download, FileText, CheckCircle, X, ExternalLink } from "lucide-react";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { SkeletonCard } from "@/components/ui/skeleton";
import { API_ENDPOINT } from "../../utils/config";

type TabKey = "profile" | "personal" | "professional" | "documents" | "security";

// ─── Document definitions ─────────────────────────────────────────────────────
interface DocDef { key: string; label: string; }

const FACULTY_DOCS: DocDef[] = [
  { key: "aadhaar",      label: "Aadhaar Card" },
  { key: "pan",          label: "PAN Card" },
  { key: "resume",       label: "Resume / CV" },
  { key: "qualification",label: "Qualification Certificate" },
  { key: "experience",   label: "Experience Certificate" },
  { key: "appointment",  label: "Appointment Letter" },
  { key: "faculty_id",   label: "Faculty ID Card" },
];

// ─── DocumentRow ─────────────────────────────────────────────────────────────
const DocumentRow: React.FC<{
  doc: DocDef;
  url: string | null;
  theme: string;
  onUpload: (key: string, file: File) => void;
  onView: (url: string, label: string) => void;
}> = ({ doc, url, theme, onUpload, onView }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-200 ${
        theme === "dark"
          ? "border-border bg-card hover:bg-muted/40"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg flex-shrink-0 ${url ? "bg-green-100 dark:bg-green-950/30" : "bg-gray-100 dark:bg-muted"}`}>
          {url ? <CheckCircle size={18} className="text-green-500" /> : <FileText size={18} className={theme === "dark" ? "text-muted-foreground" : "text-gray-400"} />}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{doc.label}</p>
          <p className={`text-xs ${url ? "text-green-600 dark:text-green-400" : theme === "dark" ? "text-muted-foreground" : "text-gray-400"}`}>
            {url ? "Uploaded" : "Not uploaded"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {url && (
          <>
            <button
              onClick={() => onView(url, doc.label)}
              className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium ${
                theme === "dark" ? "bg-muted hover:bg-accent text-foreground" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <Eye size={15} /> View
            </button>
            <a
              href={url}
              download
              className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium ${
                theme === "dark" ? "bg-muted hover:bg-accent text-foreground" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <Download size={15} /> Download
            </a>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(doc.key, f); e.target.value = ""; }} className="hidden" />
        <button
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-xs font-semibold flex items-center gap-1"
        >
          <Upload size={14} /> {url ? "Replace" : "Upload"}
        </button>
      </div>
    </div>
  );
};

// ─── DocumentViewModal ────────────────────────────────────────────────────────
const DocumentViewModal: React.FC<{ open: boolean; url: string; label: string; onClose: () => void }> = ({ open, url, label, onClose }) => {
  if (!open) return null;
  const isPDF = url?.toLowerCase().endsWith(".pdf");
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-border">
          <h3 className="font-bold text-lg dark:text-foreground">{label}</h3>
          <div className="flex items-center gap-2">
            <a href={url} download className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              <Download size={14} /> Download
            </a>
            {isPDF && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent transition-colors">
                <ExternalLink size={14} /> Open
              </a>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} className="dark:text-foreground" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-muted/20">
          {isPDF
            ? <iframe src={url} className="w-full h-[60vh] rounded-lg border" title={label} />
            : <img src={url} alt={label} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow" />}
        </div>
      </div>
    </div>
  );
};

// ─── TabBtn ───────────────────────────────────────────────────────────────────
const TabBtn: React.FC<{ label: string; active: boolean; onClick: () => void; theme: string }> = ({ label, active, onClick, theme }) => (
  <button
    onClick={onClick}
    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${
      active ? "bg-primary text-white" : theme === "dark" ? "text-muted-foreground hover:text-foreground" : "text-gray-600 hover:text-gray-900"
    }`}
  >
    {label}
  </button>
);

// ─── FieldRow ─────────────────────────────────────────────────────────────────
const FieldRow: React.FC<{
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  theme: string;
  error?: string;
  placeholder?: string;
}> = ({ label, value, onChange, readOnly = true, type = "text", theme, error, placeholder }) => (
  <div>
    <label className={`block text-sm mb-1.5 font-semibold ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{label}</label>
    <Input
      type={type}
      value={value ?? ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      disabled={readOnly}
      placeholder={placeholder}
      className={`text-sm h-10 w-full ${readOnly ? (theme === "dark" ? "bg-muted text-muted-foreground border-border" : "bg-gray-100 text-gray-500 border-gray-300") : (theme === "dark" ? "bg-muted text-foreground border-border" : "bg-white text-gray-900 border-gray-300")}`}
    />
    {error && <p className={`text-xs mt-1 ${theme === "dark" ? "text-destructive" : "text-red-500"}`}>{error}</p>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const FacultyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", mobile: "", address: "", bio: "",
    profile_picture: "", department: "", designation: "", qualification: "",
    branch: "", experience_years: "", office_location: "", office_hours: "",
    date_of_birth: "", gender: "", joining_date: "", employment_type: "",
    faculty_status: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const { theme } = useTheme();

  // Documents
  const [documents, setDocuments] = useState<Record<string, string | null>>({
    aadhaar: null, pan: null, resume: null, qualification: null,
    experience: null, appointment: null, faculty_id: null,
  });
  const [viewDoc, setViewDoc] = useState<{ url: string; label: string } | null>(null);

  // Password
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true);
    getFacultyProfile()
      .then((res) => {
        const payload = res.profile || res.data || null;
        if (res.success && payload) {
          setFormData({
            firstName: payload.first_name || "",
            lastName: payload.last_name || "",
            email: payload.email || "",
            mobile: payload.mobile_number || payload.mobile || "",
            address: payload.address || "",
            bio: payload.bio || "",
            profile_picture: payload.profile_picture || "",
            department: payload.department || "",
            designation: payload.designation || "",
            qualification: payload.qualification || "",
            branch: payload.branch || "",
            experience_years: payload.experience_years ? String(payload.experience_years) : "",
            office_location: payload.office_location || "",
            office_hours: payload.office_hours || "",
            date_of_birth: payload.date_of_birth || "",
            gender: payload.gender || "",
            joining_date: payload.joining_date || "",
            employment_type: payload.employment_type || "",
            faculty_status: payload.faculty_status || "",
          });
          if (payload.documents) {
            const processedDocs: Record<string, string> = {};
            const baseUrl = API_ENDPOINT.replace("/api", "");
            Object.entries(payload.documents).forEach(([key, url]) => {
              if (url && typeof url === "string") {
                processedDocs[key] = url.startsWith("http") ? url : `${baseUrl}${url}`;
              }
            });
            setDocuments((p) => ({ ...p, ...processedDocs }));
          }
        } else {
          console.error("API response unsuccessful or missing payload:", res);
          setError(res.message || "Failed to load profile");
        }
      })
      .catch((err) => {
        console.error("Failed to load faculty profile:", err);
        setError("Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: string, value: string) => {
    let newValue = value;
    let errorMessage = "";
    switch (field) {
      case "firstName":
      case "lastName":
        if (!/^[A-Za-z\s]{2,50}$/.test(newValue)) errorMessage = "Only letters allowed (2–50 characters)";
        break;
      case "email":
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(newValue)) errorMessage = "Invalid email format";
        break;
      case "mobile":
        newValue = newValue.replace(/\D/g, "");
        if (newValue.length !== 10) errorMessage = "Mobile number must be exactly 10 digits";
        break;
    }
    setFormData((prev) => ({ ...prev, [field]: newValue }));
    setLocalErrors((prev) => ({ ...prev, [field]: errorMessage }));
  };

  const handleSave = async () => {
    setError(null);
    if (Object.values(localErrors).some((m) => m)) { setError("Please fix the errors before saving."); return; }
    try {
      const res = await manageProfile({
        first_name: formData.firstName, last_name: formData.lastName,
        email: formData.email, mobile: formData.mobile,
        address: formData.address, bio: formData.bio,
        department: formData.department || undefined,
        designation: formData.designation || undefined,
        qualification: formData.qualification || undefined,
        branch: formData.branch || undefined,
        experience_years: formData.experience_years || undefined,
        office_location: formData.office_location || undefined,
        office_hours: formData.office_hours || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        joining_date: (formData as any).joining_date || undefined,
        employment_type: (formData as any).employment_type || undefined,
        faculty_status: (formData as any).faculty_status || undefined,
      } as any);
      if (res.success) {
        showSuccessAlert("Success", "Profile updated successfully!");
        setIsEditing(false);
      } else {
        setError(res.message || "Failed to update profile");
        showErrorAlert("Error", res.message || "Failed to update profile");
      }
    } catch {
      setError("Network error");
    }
  };

  const handleDocumentUpload = async (key: string, file: File) => {
    try {
      const fd = new FormData();
      fd.append("document_type", key);
      fd.append("file", file);
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/upload-document/`, { method: "POST", body: fd });
      const json = await resp.json();
      if (json.success) {
        const baseUrl = API_ENDPOINT.replace("/api", "");
        if (json.documents) {
          const processedDocs: Record<string, string> = {};
          Object.entries(json.documents).forEach(([k, u]) => {
            if (u && typeof u === "string") {
              processedDocs[k] = u.startsWith("http") ? u : `${baseUrl}${u}`;
            }
          });
          setDocuments((p) => ({ ...p, ...processedDocs }));
        } else if (json.url) {
          const fullUrl = json.url.startsWith("http") ? json.url : `${baseUrl}${json.url}`;
          setDocuments((p) => ({ ...p, [key]: fullUrl }));
        }
        showSuccessAlert("Uploaded", "Document uploaded successfully!");
      } else {
        showErrorAlert("Error", json.message || "Upload failed");
      }
    } catch {
      showErrorAlert("Error", "Document upload failed");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      showErrorAlert("Missing fields", "Please fill in all password fields."); return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      showErrorAlert("Password mismatch", "New passwords don't match"); return;
    }
    if (passwordData.current_password === passwordData.new_password) {
      showErrorAlert("Invalid new password", "Current and new password cannot be the same."); return;
    }
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/change-password/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      });
      const result = await response.json();
      if (result.success) {
        setShowPasswordDialog(false);
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
        showSuccessAlert("Password changed", "Your password has been updated successfully.");
      } else {
        showErrorAlert("Unable to change password", result.message || "Failed to change password");
      }
    } catch {
      showErrorAlert("Unable to change password", "Failed to change password");
    }
  };

  if (loading) return <SkeletonCard className="w-full h-[600px]" />;

  return (
    <>
      <DocumentViewModal open={!!viewDoc} url={viewDoc?.url ?? ""} label={viewDoc?.label ?? ""} onClose={() => setViewDoc(null)} />

      <Card className={`w-full max-w-none mx-auto ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"}`}>
        {/* ── Header ── */}
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">Faculty Profile</CardTitle>
            <p className={`text-xs sm:text-sm mt-1 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
              Manage your profile and academic details
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
            {isEditing && (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-xs sm:text-sm">Cancel</Button>
            )}
            <Button
              size="sm"
              onClick={() => { if (isEditing) handleSave(); else setIsEditing(true); }}
              className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90"
            >
              {isEditing ? "Save" : "Edit Profile"}
            </Button>

            {/* Change Password */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent ref={passwordDialogContentRef} className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl">
                <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {(["current", "next", "confirm"] as const).map((k) => {
                    const idMap = { current: "current_password", next: "new_password", confirm: "confirm_password" };
                    const labelMap = { current: "Current Password", next: "New Password", confirm: "Confirm New Password" };
                    return (
                      <div key={k}>
                        <Label htmlFor={idMap[k]}>{labelMap[k]}</Label>
                        <div className="relative">
                          <Input
                            id={idMap[k]}
                            type={showPasswords[k] ? "text" : "password"}
                            value={passwordData[idMap[k] as keyof typeof passwordData]}
                            onChange={(e) => setPasswordData({ ...passwordData, [idMap[k]]: e.target.value })}
                            className="pr-10"
                          />
                          <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, [k]: !p[k] }))} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground">
                            {showPasswords[k] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                    <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleChangePassword}>Change Password</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* ── Body ── */}
        <CardContent className="px-4 sm:px-6 pb-6 pt-2">
          {error && <div className={`mb-4 text-sm ${theme === "dark" ? "text-destructive" : "text-red-600"}`}>{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8 items-start mt-4">

            {/* ── Left sidebar ── */}
            <div className="col-span-1 flex flex-col items-center">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-semibold mb-3 mt-2 flex-shrink-0`}>
                {(formData.firstName?.[0] || "")}{(formData.lastName?.[0] || "")}
              </div>
              <div className="text-base sm:text-lg font-semibold text-center mb-1">{formData.firstName} {formData.lastName}</div>
              <div className={`text-xs sm:text-sm mb-4 text-center ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>Faculty</div>

              <div className="w-full mt-2 flex flex-col">
                <h4 className={`text-xs sm:text-sm font-bold mb-3 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>Quick Info</h4>
                <div className={`border rounded-xl p-3 sm:p-4 space-y-3 ${theme === "dark" ? "bg-card border-border" : "bg-gray-50 border-gray-200"}`}>
                  {[
                    { label: "Department", value: formData.department },
                    { label: "Designation", value: formData.designation },
                    { label: "Office", value: formData.office_location },
                    { label: "Branch", value: formData.branch },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <span className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{label}</span>
                      <span className={`text-xs sm:text-sm px-2.5 py-1.5 rounded-2xl truncate ${theme === "dark" ? "bg-accent text-foreground" : "bg-purple-100 text-purple-700"}`}>{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col">
              {/* Tab bar */}
              <div className="flex items-center gap-1 sm:gap-2 mb-4 border-b pb-2 overflow-x-auto flex-shrink-0">
                {([
                  { key: "profile", label: "Profile" },
                  { key: "personal", label: "Personal" },
                  { key: "professional", label: "Professional" },
                  { key: "documents", label: "Documents" },
                  { key: "security", label: "Security" },
                ] as { key: TabKey; label: string }[]).map((t) => (
                  <TabBtn key={t.key} label={t.label} active={activeTab === t.key} onClick={() => setActiveTab(t.key)} theme={theme} />
                ))}
              </div>

              {/* Tab content */}
              <div className={`p-4 sm:p-5 lg:p-6 rounded-xl border flex-1 ${theme === "dark" ? "bg-card border-border" : "bg-gray-50 border-gray-200"}`}>

                {/* PROFILE TAB */}
                {activeTab === "profile" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow label="First Name" value={formData.firstName} onChange={(v) => handleChange("firstName", v)} readOnly={!isEditing} theme={theme} error={localErrors.firstName} />
                      <FieldRow label="Last Name" value={formData.lastName} onChange={(v) => handleChange("lastName", v)} readOnly={!isEditing} theme={theme} error={localErrors.lastName} />
                      <FieldRow label="Email" value={formData.email} onChange={(v) => handleChange("email", v)} readOnly={!isEditing} theme={theme} error={localErrors.email} />
                      <FieldRow label="Mobile" value={formData.mobile} onChange={(v) => handleChange("mobile", v)} readOnly={!isEditing} theme={theme} error={localErrors.mobile} placeholder="10-digit mobile" />
                    </div>
                    <div>
                      <label className={`block text-sm mb-1.5 font-semibold ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>Address</label>
                      <Textarea value={formData.address} onChange={(e) => handleChange("address", e.target.value)} disabled={!isEditing} rows={3} className={`text-sm w-full ${!isEditing ? (theme === "dark" ? "bg-muted text-muted-foreground border-border" : "bg-gray-100 text-gray-500 border-gray-300") : ""}`} />
                    </div>
                    <div>
                      <label className={`block text-sm mb-1.5 font-semibold ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>Bio</label>
                      <Textarea value={formData.bio} onChange={(e) => handleChange("bio", e.target.value)} disabled={!isEditing} rows={4} className={`text-sm w-full ${!isEditing ? (theme === "dark" ? "bg-muted text-muted-foreground border-border" : "bg-gray-100 text-gray-500 border-gray-300") : ""}`} />
                    </div>
                  </div>
                )}

                {/* PERSONAL TAB */}
                {activeTab === "personal" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldRow label="Date of Birth" type="date" value={formData.date_of_birth} onChange={(v) => handleChange("date_of_birth", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Gender" value={formData.gender} onChange={(v) => handleChange("gender", v)} readOnly={!isEditing} theme={theme} />
                  </div>
                )}

                {/* PROFESSIONAL TAB */}
                {activeTab === "professional" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldRow label="Department" value={formData.department} onChange={(v) => handleChange("department", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Designation" value={formData.designation} onChange={(v) => handleChange("designation", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Qualification" value={formData.qualification} onChange={(v) => handleChange("qualification", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Branch" value={formData.branch} onChange={(v) => handleChange("branch", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Experience (years)" value={formData.experience_years} onChange={(v) => handleChange("experience_years", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Joining Date" type="date" value={(formData as any).joining_date || ""} onChange={(v) => handleChange("joining_date", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Office Location" value={formData.office_location} onChange={(v) => handleChange("office_location", v)} readOnly={!isEditing} theme={theme} />
                    <FieldRow label="Office Hours" value={formData.office_hours} onChange={(v) => handleChange("office_hours", v)} readOnly={!isEditing} theme={theme} placeholder="e.g. Mon–Fri 9am–5pm" />
                    <FieldRow label="Employment Type" value={(formData as any).employment_type || ""} onChange={(v) => handleChange("employment_type", v)} readOnly={!isEditing} theme={theme} placeholder="e.g. Permanent, Contract" />
                    <FieldRow label="Faculty Status" value={(formData as any).faculty_status || ""} onChange={(v) => handleChange("faculty_status", v)} readOnly={!isEditing} theme={theme} placeholder="e.g. Active, On Leave" />
                  </div>
                )}

                {/* DOCUMENTS TAB */}
                {activeTab === "documents" && (
                  <div className="space-y-3">
                    <p className={`text-sm mb-4 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                      Upload and manage your official documents. Supported formats: PDF, JPG, PNG.
                    </p>
                    {FACULTY_DOCS.map((doc) => (
                      <DocumentRow
                        key={doc.key}
                        doc={doc}
                        url={documents[doc.key] || null}
                        theme={theme}
                        onUpload={handleDocumentUpload}
                        onView={(url, label) => setViewDoc({ url, label })}
                      />
                    ))}
                  </div>
                )}

                {/* SECURITY TAB */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className={`text-base font-semibold mb-1 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>Change Password</h3>
                      <p className={`text-sm mb-4 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                        Update your account password. Choose a strong, unique password.
                      </p>
                      <Button onClick={() => setShowPasswordDialog(true)} className="bg-primary text-white hover:bg-primary/90">
                        Change Password
                      </Button>
                    </div>
                    <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-border bg-muted/30" : "border-gray-200 bg-gray-50"}`}>
                      <h4 className={`text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>Account Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}>Email</span>
                          <span className={theme === "dark" ? "text-foreground" : "text-gray-900"}>{formData.email || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}>Role</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Faculty</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save footer */}
              {(activeTab === "profile" || activeTab === "personal" || activeTab === "professional") && (
                <div className="flex justify-end mt-4">
                  <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleSave}>Save Changes</Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default FacultyProfile;