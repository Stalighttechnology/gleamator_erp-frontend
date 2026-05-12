import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Camera, Eye, EyeOff, Upload, Download, FileText, CheckCircle, X, ExternalLink,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getFullStudentProfile } from "@/utils/student_api";
import { useStudentProfileUpdateMutation } from "@/hooks/useApiQueries";
import { useFileUpload } from "../../hooks/useOptimizations";
import { Progress } from "../ui/progress";
import { SkeletonForm } from "../ui/skeleton";
import { showSuccessAlert, showErrorAlert } from "../../utils/sweetalert";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";

type StudentForm = Record<string, any>;

type TabKey = "profile" | "personal" | "academic" | "documents" | "security";

// ─── Document definitions ─────────────────────────────────────────────────────
interface DocDef {
  key: string;
  label: string;
}

const STUDENT_DOCS: DocDef[] = [
  { key: "aadhaar",    label: "Aadhaar Card" },
  { key: "pan",        label: "PAN Card" },
  { key: "college_id", label: "College ID" },
  { key: "sslc",       label: "SSLC Marks Card" },
  { key: "puc",        label: "PUC / Diploma Marks Card" },
  { key: "resume",     label: "Resume" },
  { key: "certificate",label: "Certificates" },
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
  const isPDF = url?.toLowerCase().endsWith(".pdf");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(doc.key, file);
    e.target.value = "";
  };

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
          {url ? (
            <CheckCircle size={18} className="text-green-500" />
          ) : (
            <FileText size={18} className={theme === "dark" ? "text-muted-foreground" : "text-gray-400"} />
          )}
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
                theme === "dark"
                  ? "bg-muted hover:bg-accent text-foreground"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
              title="View"
            >
              <Eye size={15} /> View
            </button>
            <a
              href={url}
              download
              className={`p-2 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium ${
                theme === "dark"
                  ? "bg-muted hover:bg-accent text-foreground"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
              title="Download"
            >
              <Download size={15} /> Download
            </a>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
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
const DocumentViewModal: React.FC<{
  open: boolean;
  url: string;
  label: string;
  onClose: () => void;
}> = ({ open, url, label, onClose }) => {
  if (!open) return null;
  const isPDF = url?.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-border">
          <h3 className="font-bold text-lg dark:text-foreground">{label}</h3>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Download size={14} /> Download
            </a>
            {isPDF && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent transition-colors"
              >
                <ExternalLink size={14} /> Open
              </a>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X size={18} className="dark:text-foreground" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-muted/20">
          {isPDF ? (
            <iframe src={url} className="w-full h-[60vh] rounded-lg border" title={label} />
          ) : (
            <img src={url} alt={label} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow" />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tab button helper ────────────────────────────────────────────────────────
const TabBtn: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  theme: string;
}> = ({ label, active, onClick, theme }) => (
  <button
    onClick={onClick}
    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md whitespace-nowrap transition-colors font-medium flex-shrink-0 ${
      active
        ? "bg-primary text-white"
        : theme === "dark"
        ? "text-muted-foreground hover:text-foreground"
        : "text-gray-600 hover:text-gray-900"
    }`}
  >
    {label}
  </button>
);

// ─── FieldRow ─────────────────────────────────────────────────────────────────
const FieldRow: React.FC<{
  label: string;
  name?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  type?: string;
  theme: string;
}> = ({ label, name, value, onChange, readOnly = true, type = "text", theme }) => (
  <div>
    <Label className={theme === "dark" ? "text-foreground" : "text-gray-700"}>{label}</Label>
    <Input
      name={name}
      type={type}
      value={value ?? ""}
      onChange={onChange}
      readOnly={readOnly}
      className={
        readOnly
          ? theme === "dark"
            ? "bg-muted text-muted-foreground border-border"
            : "bg-gray-100 text-gray-500 border-gray-300"
          : theme === "dark"
          ? "bg-muted text-foreground border-border"
          : "bg-white text-gray-900 border-gray-300"
      }
    />
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const StudentProfile: React.FC = () => {
  const { theme } = useTheme();
  const updateProfileMutation = useStudentProfileUpdateMutation();

  const [form, setForm] = useState<StudentForm>({
    user_id: "", username: "", email: "", first_name: "", last_name: "",
    phone: "", date_of_birth: "", address: "", about: "", profile_picture: "",
    branch: "", department: "", semester: "", current_semester: "",
    year_of_study: "", section: "", usn: "", enrollment_year: "",
    expected_graduation: "", student_status: "", mode_of_admission: "",
    name: "", batch: "", course: "", date_of_admission: "",
    parent_name: "", parent_contact: "", emergency_contact: "",
    blood_group: "", proctor: {},
  });

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [loading, setLoading] = useState(true);

  // Documents state
  const [documents, setDocuments] = useState<Record<string, string | null>>({
    aadhaar: null, pan: null, college_id: null, sslc: null,
    puc: null, resume: null, certificate: null,
  });
  const [docUploading, setDocUploading] = useState<Record<string, boolean>>({});
  const [viewDoc, setViewDoc] = useState<{ url: string; label: string } | null>(null);

  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "", new_password: "", confirm_password: "",
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const passwordDialogContentRef = useRef<HTMLDivElement | null>(null);

  const {
    uploadFile: uploadProfilePicture,
    uploadProgress,
    isUploading: isUploadingPicture,
    reset: resetUpload,
  } = useFileUpload({
    maxSizeMB: 0.5,
    maxWidthOrHeight: 400,
    compressImages: true,
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    maxFileSize: 2 * 1024 * 1024,
  });

  // ── Fetch profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getFullStudentProfile();
        if (data?.success && data.profile) {
          const pd = data.profile;
          const newForm = { ...form } as StudentForm;
          Object.keys(pd).forEach((k) => {
            if (k === "profile_picture" && pd[k]) {
              newForm[k] = pd[k].startsWith("http")
                ? pd[k]
                : `${API_ENDPOINT.replace("/api", "")}${pd[k]}`;
              return;
            }
            if (k === "mobile_number") { newForm["phone"] = pd[k] ?? ""; return; }
            if (k === "date_of_birth" && pd[k]) {
              const raw = pd[k];
              let iso = raw;
              if (typeof raw === "string") {
                const parts = raw.split("/");
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
                } else {
                  const parsed = new Date(raw);
                  if (!isNaN(parsed.getTime())) iso = parsed.toISOString().slice(0, 10);
                }
              }
              newForm["date_of_birth"] = iso ?? "";
              return;
            }
            newForm[k] = pd[k] ?? "";
          });
          setForm(newForm);

          // Load documents if backend provides them
          if (pd.documents) {
            const processedDocs: Record<string, string> = {};
            const baseUrl = API_ENDPOINT.replace("/api", "");
            Object.entries(pd.documents).forEach(([key, url]) => {
              if (url && typeof url === "string") {
                processedDocs[key] = url.startsWith("http") ? url : `${baseUrl}${url}`;
              }
            });
            setDocuments((prev) => ({ ...prev, ...processedDocs }));
          }
        } else {
          console.error("API response unsuccessful or missing profile:", data);
        }
      } catch (err) {
        console.error("Failed to fetch student profile", err);
      }
    };
    fetchProfile().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadProfilePictureDirectly(file);
  };

  const uploadProfilePictureDirectly = async (file: File) => {
    try {
      const result = await uploadProfilePicture(
        file,
        `${API_ENDPOINT}/profile/upload-picture`,
        {}
      );
      if (result?.success && (result.profile_picture_url || result.url)) {
        const url = (result.profile_picture_url || result.url) as string;
        const fullUrl = url.startsWith("http")
          ? url
          : `${API_ENDPOINT.replace("/api", "")}${url}`;
        setForm((p) => ({ ...p, profile_picture: fullUrl }));
        const currentUserData = JSON.parse(localStorage.getItem("user") || "{}");
        currentUserData.profile_picture = fullUrl;
        localStorage.setItem("user", JSON.stringify(currentUserData));
        showSuccessAlert("Success", "Profile picture uploaded successfully!");
      }
    } catch (err) {
      showErrorAlert("Error", "Failed to upload profile picture");
    } finally {
      resetUpload();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement & HTMLTextAreaElement;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        mobile_number: form.phone,
        address: form.address,
        bio: form.about,
      });
      showSuccessAlert("Profile Updated", "Your profile has been successfully updated.");
      setEditing(false);
    } catch (err) {
      showErrorAlert("Error", "Failed to update profile");
    }
  };

  const handleDocumentUpload = async (key: string, file: File) => {
    setDocUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const fd = new FormData();
      fd.append("document_type", key);
      fd.append("file", file);
      const resp = await fetchWithTokenRefresh(`${API_ENDPOINT}/profile/upload-document/`, {
        method: "POST",
        body: fd,
      });
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
          setDocuments((prev) => ({ ...prev, ...processedDocs }));
        } else if (json.url) {
          const fullUrl = json.url.startsWith("http") ? json.url : `${baseUrl}${json.url}`;
          setDocuments((prev) => ({ ...prev, [key]: fullUrl }));
        }
        showSuccessAlert("Uploaded", "Document uploaded successfully!");
      } else {
        showErrorAlert("Error", json.message || "Document upload failed");
      }
    } catch {
      showErrorAlert("Error", "Document upload failed");
    } finally {
      setDocUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      showErrorAlert("Missing fields", "Please fill all password fields");
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      showErrorAlert("Password mismatch", "New passwords do not match");
      return;
    }
    try {
      const resp = await fetchWithTokenRefresh(
        `${API_ENDPOINT}/profile/change-password/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(passwordData),
        }
      );
      const j = await resp.json();
      if (j.success) {
        setShowPasswordDialog(false);
        setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
        showSuccessAlert("Password changed", "Your password has been updated successfully.");
      } else {
        showErrorAlert("Unable to change password", j.message || "Failed to change password");
      }
    } catch {
      showErrorAlert("Unable to change password", "Network error");
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50"}`}>
        <SkeletonForm />
      </div>
    );
  }

  const inputEditable = (name: string) => ({
    name,
    value: form[name] ?? "",
    onChange: handleChange,
    readOnly: !editing,
    theme,
  });

  return (
    <>
      <DocumentViewModal
        open={!!viewDoc}
        url={viewDoc?.url ?? ""}
        label={viewDoc?.label ?? ""}
        onClose={() => setViewDoc(null)}
      />

      <div className="min-h-screen flex justify-center items-start">
        <Card
          className={`w-full max-w-none mx-auto ${
            theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"
          }`}
        >
          {/* ── Header ── */}
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b">
            <div className="flex-1 min-w-0">
              <CardTitle
                className={`text-lg sm:text-xl md:text-2xl font-semibold tracking-tight ${
                  theme === "dark" ? "text-foreground" : "text-gray-900"
                }`}
              >
                Profile
              </CardTitle>
              <p className={`text-xs sm:text-sm mt-1 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                View and update your personal information
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
              {editing && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs sm:text-sm">
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => { if (editing) handleSave(); else setEditing(true); }}
                className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90"
              >
                {editing ? (updateProfileMutation.isPending ? "Saving..." : "Save") : "Edit Profile"}
              </Button>

              {/* Change Password Dialog */}
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary text-white border-primary hover:bg-primary/90">
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent
                  ref={passwordDialogContentRef}
                  className="w-[calc(100vw-1.5rem)] sm:w-full max-w-[420px] rounded-xl sm:rounded-2xl"
                >
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                  </DialogHeader>
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
                              onChange={(e) =>
                                setPasswordData({ ...passwordData, [idMap[k]]: e.target.value })
                              }
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords((p) => ({ ...p, [k]: !p[k] }))}
                              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                            >
                              {showPasswords[k] ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                      <Button
                        className="bg-primary text-white hover:bg-primary/90"
                        onClick={handleChangePassword}
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          {/* ── Body ── */}
          <CardContent className="px-4 sm:px-6 pb-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8 items-start mt-4">

              {/* ── Left sidebar ── */}
              <div className="col-span-1 flex flex-col items-center">
                {/* Avatar */}
                <div className="relative mb-3 flex-shrink-0">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                    {form.profile_picture ? (
                      <AvatarImage src={form.profile_picture} alt={`${form.first_name} ${form.last_name}`} />
                    ) : (
                      <AvatarFallback>
                        {(form.first_name?.[0] || "") + (form.last_name?.[0] || "")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label
                    htmlFor="profile-picture-upload"
                    className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="profile-picture-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureSelect}
                    className="hidden"
                  />
                </div>

                {isUploadingPicture && (
                  <div className="mb-2 w-full text-center space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-gray-500">Uploading... {uploadProgress}%</p>
                  </div>
                )}

                <div className="text-base sm:text-lg font-semibold text-center mb-1">
                  {form.first_name} {form.last_name}
                </div>
                <div className={`text-xs sm:text-sm mb-4 text-center ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                  {form.username || form.email}
                </div>

                {/* Quick Info */}
                <div className="w-full mt-2 flex flex-col">
                  <h4 className={`text-xs sm:text-sm font-bold mb-3 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>
                    Quick Info
                  </h4>
                  <div className={`border rounded-xl p-3 sm:p-4 space-y-3 ${theme === "dark" ? "bg-card border-border" : "bg-gray-50 border-gray-200"}`}>
                    {[
                      { label: "Department", value: form.branch },
                      { label: "Year", value: form.year_of_study },
                      { label: "USN", value: form.usn },
                      { label: "Section", value: form.section },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col">
                        <span className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>
                          {label}
                        </span>
                        <span className="text-xs sm:text-sm px-2.5 py-1.5 rounded-2xl bg-purple-100 text-purple-700 truncate">
                          {value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right panel ── */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-col">
                {/* Tab bar */}
                <div className="flex items-center gap-1 sm:gap-2 mb-4 border-b pb-2 overflow-x-auto flex-shrink-0">
                  {(
                    [
                      { key: "profile", label: "Profile" },
                      { key: "personal", label: "Personal" },
                      { key: "academic", label: "Academic" },
                      { key: "documents", label: "Documents" },
                      { key: "security", label: "Security" },
                    ] as { key: TabKey; label: string }[]
                  ).map((t) => (
                    <TabBtn
                      key={t.key}
                      label={t.label}
                      active={activeTab === t.key}
                      onClick={() => setActiveTab(t.key)}
                      theme={theme}
                    />
                  ))}
                </div>

                {/* Tab content */}
                <div
                  className={`p-4 sm:p-5 lg:p-6 rounded-xl border flex-1 ${
                    theme === "dark" ? "bg-card border-border" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {/* PROFILE TAB */}
                  {activeTab === "profile" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldRow label="First Name" {...inputEditable("first_name")} readOnly={!editing} />
                        <FieldRow label="Last Name" {...inputEditable("last_name")} readOnly={!editing} />
                        <FieldRow label="USN" name="usn" value={form.usn} theme={theme} readOnly />
                        <FieldRow label="Email" {...inputEditable("email")} readOnly={!editing} />
                        <FieldRow label="Phone" {...inputEditable("phone")} readOnly={!editing} />
                      </div>
                      <FieldRow label="Address" {...inputEditable("address")} readOnly={!editing} />
                      <div>
                        <Label className={theme === "dark" ? "text-foreground" : "text-gray-700"}>About</Label>
                        <Textarea
                          name="about"
                          value={form.about ?? ""}
                          onChange={handleChange}
                          readOnly={!editing}
                          className={
                            !editing
                              ? theme === "dark"
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-gray-100 text-gray-500 border-gray-300"
                              : theme === "dark"
                              ? "bg-muted text-foreground border-border"
                              : "bg-white text-gray-900 border-gray-300"
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* PERSONAL TAB */}
                  {activeTab === "personal" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth || ""} onChange={handleChange} readOnly={!editing} theme={theme} />
                      <FieldRow label="Blood Group" {...inputEditable("blood_group")} readOnly={!editing} />
                      <FieldRow label="Parent Name" {...inputEditable("parent_name")} readOnly={!editing} />
                      <FieldRow label="Parent Contact" {...inputEditable("parent_contact")} readOnly={!editing} />
                      <FieldRow label="Emergency Contact" {...inputEditable("emergency_contact")} readOnly={!editing} />
                    </div>
                  )}

                  {/* ACADEMIC TAB */}
                  {activeTab === "academic" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow label="Current Semester" name="current_semester" value={form.current_semester} theme={theme} readOnly />
                      <FieldRow label="Section" name="section" value={form.section} theme={theme} readOnly />
                      <FieldRow label="Enrollment Year" name="enrollment_year" value={form.enrollment_year || ""} theme={theme} readOnly />
                      <FieldRow label="Expected Graduation" name="expected_graduation" value={form.expected_graduation || ""} theme={theme} readOnly />
                      <FieldRow label="Proctor" name="proctor_name" value={
                        form.proctor
                          ? `${form.proctor.first_name || ""} ${form.proctor.last_name || ""}`.trim() || form.proctor.username || ""
                          : ""
                      } theme={theme} readOnly />
                      <FieldRow label="Student Status" name="student_status" value={form.student_status || ""} theme={theme} readOnly />
                      <FieldRow label="Mode of Admission" name="mode_of_admission" value={form.mode_of_admission || ""} theme={theme} readOnly />
                      <FieldRow label="Batch" name="batch" value={form.batch || ""} theme={theme} readOnly />
                      <FieldRow label="Course" name="course" value={form.course || ""} theme={theme} readOnly />
                      <FieldRow label="Date of Admission" name="date_of_admission" value={form.date_of_admission ? form.date_of_admission.slice(0, 10) : ""} theme={theme} readOnly />
                    </div>
                  )}

                  {/* DOCUMENTS TAB */}
                  {activeTab === "documents" && (
                    <div className="space-y-3">
                      <p className={`text-sm mb-4 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                        Upload and manage your official documents. Supported formats: PDF, JPG, PNG.
                      </p>
                      {STUDENT_DOCS.map((doc) => (
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
                        <h3 className={`text-base font-semibold mb-1 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>
                          Change Password
                        </h3>
                        <p className={`text-sm mb-4 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                          Update your account password. Choose a strong, unique password.
                        </p>
                        <Button
                          onClick={() => setShowPasswordDialog(true)}
                          className="bg-primary text-white hover:bg-primary/90"
                        >
                          Change Password
                        </Button>
                      </div>
                      <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-border bg-muted/30" : "border-gray-200 bg-gray-50"}`}>
                        <h4 className={`text-sm font-semibold mb-2 ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>
                          Account Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}>Username</span>
                            <span className={theme === "dark" ? "text-foreground" : "text-gray-900"}>{form.username || "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}>Email</span>
                            <span className={theme === "dark" ? "text-foreground" : "text-gray-900"}>{form.email || "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={theme === "dark" ? "text-muted-foreground" : "text-gray-500"}>Role</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Student</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save footer — only show in editable tabs */}
                {(activeTab === "profile" || activeTab === "personal") && (
                  <div className="flex justify-end mt-4">
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white"
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default StudentProfile;