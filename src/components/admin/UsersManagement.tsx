import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import * as Select from "@radix-ui/react-select";
import { ChevronDownIcon, CheckIcon, Pencil1Icon, TrashIcon, DownloadIcon } from "@radix-ui/react-icons";
import { Search, Eye, X, Download, FileText, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { manageUsers, manageUserAction, manageAdminProfile } from "../../utils/admin_api";
import { useTheme } from "../../context/ThemeContext";
import { API_BASE_URL } from "../../utils/config";
import { SkeletonTable, SkeletonPageHeader } from "../ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  username?: string;
  profile_picture?: string;
  address?: string;
  bio?: string;
  extra?: {
    usn?: string;
    branch?: string;
    branches?: string[];
    phone?: string;
    department?: string;
    designation?: string;
    section?: string;
    year?: string;
    enrollment_year?: string;
    batch?: string;
    documents?: Record<string, string | null>;
    [key: string]: any;
  };
}

interface UsersManagementProps {
  setError: (error: string | null) => void;
  toast: (options: any) => void;
}

// ─── Badges ──────────────────────────────────────────────────────────────────
const getStatusBadge = (status: string, theme: string) => {
  const base = "px-3 py-1 rounded-full text-xs font-medium";
  if (status === "Active")
    return <span className={`${base} ${theme === "dark" ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700"}`}>Active</span>;
  return (
    <span className={`${base} ${theme === "dark" ? "bg-red-900/40 text-red-300 border border-red-800" : "bg-red-100 text-red-700 border border-red-200"}`}>
      Inactive
    </span>
  );
};

const roleDisplayMap: Record<string, string> = {
  student: "Student", teacher: "Faculty", hod: "Counselor", mis: "MIS",
};

const getRoleBadge = (role: string, theme: string) => (
  <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"}`}>
    {roleDisplayMap[role] || role}
  </span>
);

// ─── Filter options ───────────────────────────────────────────────────────────
const roles = ["All", "Student", "Faculty", "Counselor", "MIS"];
const statuses = ["All", "Active", "Inactive"];

const roleMap: Record<string, string> = {
  Student: "student", Faculty: "teacher", Counselor: "hod", MIS: "mis",
};

// ─── CSV helpers ──────────────────────────────────────────────────────────────
const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
};
const normalizeRoleLabel = (role: string): string =>
  ({ student: "Student", teacher: "Faculty", hod: "Counselor", mis: "MIS", admin: "Admin" }[role] ?? role);

const getCSVConfig = (roleFilter: string) => {
  switch (roleFilter) {
    case "Student":
      return {
        headers: ["Sl.No", "USN", "First Name", "Last Name", "Email", "Phone Number", "Branch"],
        row: (u: any, idx: number) => [idx, u.extra?.usn || "N/A", u.name.split(" ")[0] || "", u.name.split(" ").slice(1).join(" ") || "", u.email, u.extra?.phone || "N/A", u.extra?.branch || "N/A"],
      };
    case "Faculty":
      return {
        headers: ["Sl.No", "First Name", "Last Name", "Email", "Phone Number", "Assigned Branches"],
        row: (u: any, idx: number) => [idx, u.name.split(" ")[0] || "", u.name.split(" ").slice(1).join(" ") || "", u.email, u.extra?.phone || "N/A", Array.isArray(u.extra?.branches) ? u.extra.branches.join("; ") : u.extra?.branches || "N/A"],
      };
    default:
      return {
        headers: ["Sl.No", "Username", "Email", "Role", "First Name", "Last Name", "Phone Number", "Branch"],
        row: (u: any, idx: number) => [idx, u.username || "N/A", u.email, normalizeRoleLabel(u.role), u.name.split(" ")[0] || "", u.name.split(" ").slice(1).join(" ") || "", u.extra?.phone || "N/A", u.extra?.branch || "N/A"],
      };
  }
};

const handleExportCSV = (users: User[], roleFilter: string, toast: any): void => {
  if (!users?.length) { toast({ variant: "destructive", title: "No Data", description: "No users available to export" }); return; }
  try {
    const { headers, row } = getCSVConfig(roleFilter);
    const lines = [headers.map(escapeCSV).join(",")];
    users.forEach((u, idx) => lines.push(row(u, idx + 1).map(escapeCSV).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    a.href = url;
    a.download = `users-export-${roleFilter.toLowerCase()}-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${users.length} user(s) exported to CSV` });
  } catch {
    toast({ variant: "destructive", title: "Export Failed", description: "Could not generate CSV" });
  }
};

// ─── Document view modal (inside user profile popup) ─────────────────────────
const DocViewModal: React.FC<{ open: boolean; url: string; label: string; onClose: () => void }> = ({ open, url, label, onClose }) => {
  if (!open) return null;
  const isPDF = url?.toLowerCase().endsWith(".pdf");
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
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
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={18} /></button>
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

// ─── User Profile View Modal ──────────────────────────────────────────────────
const UserProfileModal: React.FC<{ user: User | null; open: boolean; onClose: () => void; theme: string }> = ({ user, open, onClose, theme }) => {
  const [docView, setDocView] = useState<{ url: string; label: string } | null>(null);
  const [profileTab, setProfileTab] = useState<"overview" | "details" | "contact" | "documents">("overview");

  if (!open || !user) return null;

  const role = roleDisplayMap[user.role] || user.role;
  const isStudent = user.role === "student";
  const isFaculty = user.role === "teacher";
  const isHOD = user.role === "hod" || user.role === "mis";
  const isStaff = isFaculty || isHOD;

  const documents: { key: string; label: string; url: string | null }[] = user.extra?.documents
    ? Object.entries(user.extra.documents).map(([key, url]) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        url: url ? (url.startsWith("http") ? url : `${API_BASE_URL}${url}`) : null,
      }))
    : [];

  const InfoRow = ({ label, value, fullWidth = false }: { label: string; value?: string | number | null; fullWidth?: boolean }) => (
    <div className={`flex flex-col py-2 border-b last:border-0 ${theme === "dark" ? "border-border" : "border-gray-100"} ${fullWidth ? "col-span-full" : ""}`}>
      <span className={`text-xs font-semibold mb-0.5 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>{label}</span>
      <span className={`text-sm font-medium break-words ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{value || "—"}</span>
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <p className={`text-xs font-bold uppercase tracking-wider mb-3 mt-4 first:mt-0 ${theme === "dark" ? "text-primary/80" : "text-primary"}`}>
      {title}
    </p>
  );

  return (
    <>
      {docView && (
        <DocViewModal open={!!docView} url={docView.url} label={docView.label} onClose={() => setDocView(null)} />
      )}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <div
          className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${theme === "dark" ? "border-border" : "border-gray-200"}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0 overflow-hidden border-2 ${theme === "dark" ? "border-primary/20" : "border-primary/10"} ${!user.profile_picture ? "bg-primary text-white" : ""}`}>
                {user.profile_picture ? (
                  <img src={user.profile_picture.startsWith("http") ? user.profile_picture : `${API_BASE_URL}${user.profile_picture}`} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <>
                    {(user.name?.split(" ")[0]?.[0] || "").toUpperCase()}
                    {(user.name?.split(" ")[1]?.[0] || "").toUpperCase()}
                  </>
                )}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleBadge(user.role, theme)}
                  {getStatusBadge(user.status, theme)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-accent text-muted-foreground hover:text-foreground" : "hover:bg-gray-100 text-gray-500"}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Sub-tabs */}
          <div className={`flex gap-1 px-6 pt-3 pb-0 flex-shrink-0 border-b overflow-x-auto no-scrollbar ${theme === "dark" ? "border-border" : "border-gray-200"}`}>
            {(["overview", "details", "contact", "documents"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setProfileTab(t)}
                className={`px-4 py-2 text-sm rounded-t-md font-medium transition-all capitalize whitespace-nowrap border-b-2 ${
                  profileTab === t
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {t === "details" ? (isStudent ? "Academic" : "Professional") : t === "contact" ? "Personal & Contact" : t}
              </button>
            ))}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">

            {/* OVERVIEW */}
            {profileTab === "overview" && (
              <div className="space-y-6">
                <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-border bg-muted/20" : "border-gray-200 bg-gray-50"}`}>
                  <SectionHeader title="Basic Information" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <InfoRow label="Full Name" value={user.name} />
                    <InfoRow label="Username" value={user.username} />
                    <InfoRow label="Email Address" value={user.email} />
                    <InfoRow label="Primary Phone" value={user.extra?.phone} />
                    <InfoRow label="Account Role" value={role} />
                    <InfoRow label="Current Status" value={user.status} />
                  </div>
                </div>

                {user.bio && (
                  <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-border bg-muted/20" : "border-gray-200 bg-gray-50"}`}>
                    <SectionHeader title="Bio / About" />
                    <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-muted-foreground" : "text-gray-600"}`}>
                      {user.bio}
                    </p>
                  </div>
                )}


              </div>
            )}

            {/* DETAILS (Academic/Professional) */}
            {profileTab === "details" && (
              <div className="space-y-6">
                {isStudent && (
                  <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-border bg-muted/20" : "border-gray-200 bg-gray-50"}`}>
                    <SectionHeader title="Academic Records" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow label="USN / Roll No" value={user.extra?.usn} />
                      <InfoRow label="Branch / Stream" value={user.extra?.branch} />
                      <InfoRow label="Section" value={user.extra?.section} />
                      <InfoRow label="Batch" value={user.extra?.batch} />
                    </div>
                    
                    <SectionHeader title="Admission Info" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow label="Admission Date" value={user.extra?.date_of_admission ? new Date(user.extra.date_of_admission).toLocaleDateString() : ""} />
                    </div>
                  </div>
                )}

                {(isFaculty || isStaff) && (
                  <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-border bg-muted/20" : "border-gray-200 bg-gray-50"}`}>
                    <SectionHeader title="Professional Records" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow label="Department" value={user.extra?.department} />
                      <InfoRow label="Designation" value={user.extra?.designation} />
                      <InfoRow label="Qualification" value={user.extra?.qualification} />
                      <InfoRow label="Experience (Years)" value={user.extra?.experience_years} />
                      <InfoRow label="Employment Type" value={user.extra?.employment_type} />
                      <InfoRow label="Staff Status" value={user.extra?.staff_status || user.extra?.faculty_status} />
                      <InfoRow label="Branch" value={isHOD ? user.extra?.branch : (Array.isArray(user.extra?.branches) ? user.extra.branches.join(", ") : user.extra?.branch)} />
                    </div>

                    {(isHOD || user.role === "mis") && (
                      <>
                        <SectionHeader title={user.role === "hod" ? "Counselor Details" : "MIS Details"} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                          {user.role === "hod" ? (
                            <>
                              <InfoRow label="Assigned Batches" value={user.extra?.assigned_batches} />
                            </>
                          ) : (
                            <>
                              <InfoRow label="Work Shift" value={user.extra?.work_shift} />
                            </>
                          )}
                        </div>
                      </>
                    )}
                    
                    <SectionHeader title="Workplace Information" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                      <InfoRow label="Joining Date" value={user.extra?.joining_date ? new Date(user.extra.joining_date).toLocaleDateString() : ""} />
                      <InfoRow label="Office Location" value={user.extra?.office_location} />
                      <InfoRow label="Office Hours" value={user.extra?.office_hours} fullWidth />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTACT & PERSONAL */}
            {profileTab === "contact" && (
              <div className="space-y-6">
                <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-border bg-muted/20" : "border-gray-200 bg-gray-50"}`}>
                  <SectionHeader title="Personal Information" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <InfoRow label="Date of Birth" value={user.extra?.date_of_birth ? new Date(user.extra.date_of_birth).toLocaleDateString() : "Not specified"} />
                    <InfoRow label="Gender" value={user.extra?.gender || "Not specified"} />
                    <InfoRow label="Blood Group" value={user.extra?.blood_group} />
                    {isStudent && (
                      <InfoRow label="Parent Name" value={user.extra?.parent_name} />
                    )}
                  </div>
                </div>

                <div className={`rounded-xl border p-5 ${theme === "dark" ? "border-border bg-muted/20" : "border-gray-200 bg-gray-50"}`}>
                  <SectionHeader title="Contact Details" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <InfoRow label="Primary Phone" value={user.extra?.phone} />
                    <InfoRow label="Address" value={user.address} fullWidth />
                    {isStudent && (
                      <>
                        <InfoRow label="Parent Contact" value={user.extra?.parent_contact} />
                        <InfoRow label="Emergency Contact" value={user.extra?.emergency_contact} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS */}
            {profileTab === "documents" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.length === 0 ? (
                  <div className={`col-span-full text-center py-16 rounded-xl border ${theme === "dark" ? "border-border bg-muted/20" : "border-gray-200 bg-gray-50"}`}>
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-muted text-muted-foreground" : "bg-gray-100 text-gray-300"}`}>
                      <FileText size={32} />
                    </div>
                    <p className={`text-base font-medium ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>No documents found</p>
                    <p className={`text-sm mt-1 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>This user hasn't uploaded any documents yet.</p>
                  </div>
                ) : (
                  documents.map(({ key, label, url }) => (
                    <div
                      key={key}
                      className={`flex flex-col gap-3 p-4 rounded-xl border group transition-all duration-200 ${
                        theme === "dark" ? "border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/50" : "border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center border transition-colors ${
                          url ? "bg-primary/10 border-primary/20 text-primary" : "bg-gray-100 dark:bg-muted border-transparent text-muted-foreground"
                        }`}>
                          {url && !url.toLowerCase().endsWith(".pdf") ? (
                            <img src={url} alt={label} className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={20} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate group-hover:text-primary transition-colors ${theme === "dark" ? "text-foreground" : "text-gray-900"}`}>{label}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`w-2 h-2 rounded-full ${url ? "bg-green-500" : "bg-gray-300"}`} />
                            <p className={`text-xs ${url ? "text-green-600 dark:text-green-400 font-medium" : theme === "dark" ? "text-muted-foreground" : "text-gray-400"}`}>
                              {url ? "Uploaded" : "Pending"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {url && (
                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-dashed dark:border-border/50">
                          <button
                            onClick={() => setDocView({ url, label })}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              theme === "dark" ? "bg-muted hover:bg-primary hover:text-white" : "bg-white hover:bg-primary hover:text-white text-gray-700 border border-gray-200"
                            }`}
                          >
                            <Eye size={14} /> View
                          </button>
                          <a
                            href={url}
                            download
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              theme === "dark" ? "bg-muted hover:bg-primary hover:text-white" : "bg-white hover:bg-primary hover:text-white text-gray-700 border border-gray-200"
                            }`}
                          >
                            <Download size={14} /> Download
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className={`px-6 py-4 border-t flex-shrink-0 flex justify-end gap-3 ${theme === "dark" ? "border-border bg-muted/10" : "border-gray-200 bg-gray-50"}`}>
            <Button variant="outline" onClick={onClose} className="min-w-[100px]">Close</Button>
          </div>
        </div>
      </div>
    </>
  );
};



// ─── SelectMenu ──────────────────────────────────────────────────────────────
const SelectMenu = ({
  label, value, onChange, options, theme,
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; theme: string }) => (
  <div className="flex flex-col">
    <label className={`text-sm mb-1 ${theme === "dark" ? "text-muted-foreground" : "text-gray-600"}`}>{label}</label>
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className={`inline-flex items-center justify-between px-3 py-2 rounded w-full sm:w-48 text-sm shadow-sm outline-none focus:ring-2 ${
        theme === "dark" ? "bg-card border border-border text-foreground focus:ring-primary" : "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
      }`}>
        <Select.Value />
        <Select.Icon><ChevronDownIcon className={theme === "dark" ? "text-foreground" : "text-gray-500"} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={`rounded shadow-lg z-50 ${theme === "dark" ? "bg-card border border-border text-foreground" : "bg-white border border-gray-300 text-gray-900"}`}>
          <Select.Viewport>
            {options.map((opt) => (
              <Select.Item key={opt} value={opt} className={`px-3 py-2 cursor-pointer text-sm flex items-center ${theme === "dark" ? "hover:bg-accent text-foreground" : "hover:bg-gray-100 text-gray-900"}`}>
                <Select.ItemText>{opt}</Select.ItemText>
                <Select.ItemIndicator className="ml-2"><CheckIcon className={theme === "dark" ? "text-primary" : "text-blue-500"} /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>
);

const InlineStatusSelect = ({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: string }) => (
  <Select.Root value={value} onValueChange={onChange}>
    <Select.Trigger className={`inline-flex items-center justify-between px-2 py-1 rounded text-xs w-28 shadow-sm outline-none focus:ring-1 ${
      theme === "dark" ? "bg-card border border-border text-foreground focus:ring-primary" : "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
    }`}>
      <Select.Value />
      <Select.Icon><ChevronDownIcon className="w-3 h-3" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className={`rounded shadow-lg z-50 ${theme === "dark" ? "bg-card border border-border text-foreground" : "bg-white border border-gray-300 text-gray-900"}`}>
        <Select.Viewport>
          {["Active", "Inactive"].map((opt) => (
            <Select.Item key={opt} value={opt} className={`px-3 py-2 cursor-pointer text-sm flex items-center ${theme === "dark" ? "hover:bg-accent text-foreground" : "hover:bg-gray-100 text-gray-900"}`}>
              <Select.ItemText>{opt}</Select.ItemText>
              <Select.ItemIndicator className="ml-2"><CheckIcon className="w-3 h-3" /></Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const UsersManagement = ({ setError, toast }: UsersManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(10);
  const { theme } = useTheme();

  // View modal
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => { setCurrentPage(1); }, [roleFilter, statusFilter, appliedSearch]);

  const performSearch = () => { setAppliedSearch(searchQuery.trim()); setCurrentPage(1); };
  const handleSearchKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter") performSearch(); };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const filterParams: any = { page: currentPage, page_size: pageSize };
        if (roleFilter !== "All") filterParams.role = roleMap[roleFilter];
        if (statusFilter !== "All") filterParams.is_active = statusFilter === "Active";
        if (appliedSearch.trim()) filterParams.search = appliedSearch.trim();

        const response = await manageUsers(filterParams);

        if (!response.success && response.message?.includes("Invalid page")) { setCurrentPage(1); return; }

        const hasResults = response && typeof response === "object" && "results" in response;
        const dataSource = hasResults ? (response as any).results : response as any;

        if (dataSource?.success) {
          const usersData = dataSource.users || [];
          const paginationData = hasResults ? (response as any) : dataSource;
          const allowedRoles = ["student", "teacher", "hod", "mis"];

          const transformedUsers = Array.isArray(usersData)
            ? usersData
                .map((user: any) => ({
                  id: user.id,
                  name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "N/A",
                  email: user.email || "N/A",
                  role: user.role || "N/A",
                  status: user.is_active ? "Active" : "Inactive",
                  username: user.username || "",
                    extra: {
                      usn: user.extra?.usn || "",
                      branch: user.extra?.branch || "",
                      branches: user.extra?.branches || [],
                      phone: user.extra?.phone || "",
                      department: user.extra?.department || "",
                      designation: user.extra?.designation || "",
                      section: user.extra?.section || "",
                      year: user.extra?.year || "",
                      batch: user.extra?.batch || "",
                      enrollment_year: user.extra?.enrollment_year || "",
                      documents: user.extra?.documents || {},
                      qualification: user.extra?.qualification || "",
                      experience_years: user.extra?.experience_years ?? "",
                      joining_date: user.extra?.joining_date || "",
                      employment_type: user.extra?.employment_type || "",
                      staff_status: user.extra?.staff_status || "",
                      faculty_status: user.extra?.faculty_status || "",
                      blood_group: user.extra?.blood_group || "",
                      access_level: user.extra?.access_level || "",
                      work_shift: user.extra?.work_shift || "",
                      managed_departments: user.extra?.managed_departments || "",
                      assigned_batches: user.extra?.assigned_batches || "",
                      reporting_faculty_count: user.extra?.reporting_faculty_count ?? "",
                    },
                }))
                .filter((u: any) => allowedRoles.includes(u.role))
            : [];

          setUsers(transformedUsers);
          setTotalUsers(paginationData.count || 0);
          const total = Math.ceil((paginationData.count || 0) / pageSize);
          setTotalPages(total);
          if (currentPage > total && total > 0) setCurrentPage(1);
        } else {
          setError(dataSource?.message || "Failed to fetch users");
          toast({ variant: "destructive", title: "Error", description: dataSource?.message || "Failed to fetch users" });
        }
      } catch (err) {
        setError("Network error");
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [setError, toast, currentPage, roleFilter, statusFilter, appliedSearch, pageSize]);

  const filteredUsers = Array.isArray(users) ? users : [];

  const handleEdit = (user: User) => { setEditingId(user.id); setEditData({ ...user }); };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editData) setEditData({ ...editData, [e.target.name]: e.target.value });
  };
  const handleEditStatusChange = (val: string) => { if (editData) setEditData({ ...editData, status: val }); };

  const saveEdit = async () => {
    if (!editData) return;
    setLoading(true);
    setError(null);
    try {
      const [firstName, ...lastNameParts] = editData.name.split(" ");
      const lastName = lastNameParts.join(" ");
      const updates: any = {
        username: editData.email, email: editData.email,
        first_name: firstName || "", last_name: lastName || "",
        is_active: editData.status === "Active",
      };
      const response = await manageUserAction({ user_id: editData.id.toString(), action: "edit", updates });
      const isSuccess = response.success || (response.message && (response.message.toLowerCase().includes("managed_branch") || response.message.toLowerCase().includes("does not have")));

      if (isSuccess) {
        setUsers((prev) => prev.map((u) =>
          u.id === editData.id
            ? {
                ...u,
                name: response.user ? `${response.user.first_name || ""} ${response.user.last_name || ""}`.trim() || response.user.username || "N/A" : editData.name,
                email: response.user?.email || editData.email,
                status: response.user?.is_active !== undefined ? (response.user.is_active ? "Active" : "Inactive") : editData.status,
                username: response.user?.username || editData.username || "",
              }
            : u
        ));
        setEditingId(null);
        setEditData(null);
        toast({ title: "Success", description: "User updated successfully" });
      } else {
        setError(response.message || "Failed to update user");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to update user" });
      }
    } catch {
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => setDeleteId(id);

  const deleteUser = async () => {
    if (deleteId === null) return;
    setLoading(true);
    setError(null);
    try {
      const response = await manageUserAction({ user_id: deleteId.toString(), action: "delete" });
      const isSuccess = response.success || (response.message && (response.message.toLowerCase().includes("managed_branch") || response.message.toLowerCase().includes("does not have")));

      if (isSuccess) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteId));
        setTotalUsers((prev) => Math.max(0, prev - 1));
        if (users.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
        setDeleteId(null);
        toast({ title: "Success", description: "User deleted successfully" });
      } else {
        setError(response.message || "Failed to delete user");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to delete user" });
      }
    } catch {
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (user: User) => {
    setLoading(true);
    setError(null);
    try {
      const response = await manageAdminProfile({ user_id: user.id.toString() }, "GET");
      if (response.success && response.profile) {
        const p = response.profile as any;
        const fullUser: User = {
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.username || "N/A",
          email: p.email,
          role: p.role,
          status: p.is_active ? "Active" : "Inactive",
          username: p.username,
          profile_picture: p.profile_picture,
          address: p.address,
          bio: p.bio,
          extra: p.extra
        };
        setViewUser(fullUser);
        setViewModalOpen(true);
      } else {
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to fetch profile details" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonTable rows={10} cols={6} />
      </div>
    );
  }

  return (
    <>
      {/* User Profile View Modal */}
      <UserProfileModal user={viewUser} open={viewModalOpen} onClose={() => { setViewModalOpen(false); setViewUser(null); }} theme={theme} />

      <div className={`text-sm sm:text-base max-w-none mx-auto ${theme === "dark" ? "bg-background" : "bg-gray-50"}`}>
        <Card className={`${theme === "dark" ? "bg-card border border-border" : "bg-white border border-gray-200"}`}>
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-foreground" : "text-gray-900"}>User Management</CardTitle>
            <p className={`text-sm mt-1 ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>Manage all users in the system</p>
          </CardHeader>

          <CardContent>
            {/* Filters + Search */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div className="grid grid-cols-1 gap-3 md:flex md:gap-4">
                <SelectMenu label="Filter by Role" value={roleFilter} onChange={setRoleFilter} options={roles} theme={theme} />
                <SelectMenu label="Filter by Status" value={statusFilter} onChange={setStatusFilter} options={statuses} theme={theme} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div>
                  <label className={`block text-sm mb-1 ${theme === "dark" ? "text-muted-foreground" : "text-gray-600"}`}>Search</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className={`w-full md:w-52 ${theme === "dark" ? "bg-card border border-border text-foreground" : "bg-white border border-gray-300 text-gray-900"}`}
                    />
                    <Button onClick={performSearch} variant="outline" size="sm" className={theme === "dark" ? "bg-card border border-border text-foreground hover:bg-accent" : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${theme === "dark" ? "text-muted-foreground" : "text-gray-600"}`}>Export</label>
                  <Button
                    onClick={() => handleExportCSV(filteredUsers, roleFilter, toast)}
                    disabled={filteredUsers.length === 0 || loading}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <DownloadIcon className="h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="block overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`border-b ${theme === "dark" ? "border-border text-foreground" : "border-gray-200 text-gray-900"}`}>
                  <tr>
                    <th className="py-2 px-3 text-sm font-semibold">Full Name</th>
                    <th className="py-2 px-3 text-sm font-semibold">Email</th>
                    <th className="py-2 px-3 text-sm font-semibold">Role</th>
                    <th className="py-2 px-3 text-sm font-semibold">Status</th>
                    <th className="py-2 px-3 text-sm font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={`border-b transition-colors duration-200 ${theme === "dark" ? "border-border hover:bg-accent" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <td className="py-2.5 px-3 break-words whitespace-normal">
                          {editingId === user.id ? (
                            <Input name="name" value={editData?.name || ""} onChange={handleEditChange} className={`w-full ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"}`} />
                          ) : (
                            <span className="text-sm font-medium">{user.name}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 break-words whitespace-normal">
                          {editingId === user.id ? (
                            <Input name="email" value={editData?.email || ""} onChange={handleEditChange} className={`w-full ${theme === "dark" ? "bg-card text-foreground" : "bg-white text-gray-900"}`} />
                          ) : (
                            <span className="text-sm">{user.email}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">{getRoleBadge(user.role, theme)}</td>
                        <td className="py-2.5 px-3">
                          {editingId === user.id
                            ? <InlineStatusSelect value={editData?.status || "Active"} onChange={handleEditStatusChange} theme={theme} />
                            : getStatusBadge(user.status, theme)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {editingId === user.id ? (
                              <>
                                <Button size="sm" onClick={saveEdit} disabled={loading} className={theme === "dark" ? "text-foreground bg-card border border-border hover:bg-accent" : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"}>
                                  {loading ? "Saving..." : "Save"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditData(null); }} disabled={loading} className={theme === "dark" ? "text-muted-foreground hover:bg-accent" : "text-gray-500 hover:bg-gray-100"}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                {/* View */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewUser(user)}
                                  disabled={loading}
                                  title="View Profile"
                                  className={theme === "dark" ? "p-2 rounded hover:bg-accent" : "p-2 rounded hover:bg-gray-100"}
                                >
                                  <Eye className={theme === "dark" ? "w-4 h-4 text-blue-400" : "w-4 h-4 text-blue-500"} />
                                </Button>
                                {/* Edit */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(user)}
                                  disabled={loading}
                                  title="Edit User"
                                  className={theme === "dark" ? "p-2 rounded hover:bg-accent" : "p-2 rounded hover:bg-gray-100"}
                                >
                                  <Pencil1Icon className={theme === "dark" ? "w-4 h-4 text-primary" : "w-4 h-4 text-blue-500"} />
                                </Button>
                                {/* Delete */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirmDelete(user.id)}
                                  disabled={loading}
                                  title="Delete User"
                                  className={theme === "dark" ? "p-2 rounded hover:bg-accent" : "p-2 rounded hover:bg-gray-100"}
                                >
                                  <TrashIcon className={theme === "dark" ? "w-4 h-4 text-destructive" : "w-4 h-4 text-red-500"} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={`py-8 text-center text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-2">
                <div className={`text-sm ${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
                  Showing {((currentPage - 1) * pageSize) + 1} – {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="text-white bg-primary border-primary hover:bg-primary/90"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled className={theme === "dark" ? "text-muted-foreground bg-card border border-border" : "text-gray-700 bg-white border border-gray-300"}>
                    {currentPage} / {totalPages}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="text-white bg-primary border-primary hover:bg-primary/90"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className={`${theme === "dark" ? "bg-card border border-border text-foreground" : "bg-white border border-gray-200 text-gray-900"} w-[92%] max-w-[420px] rounded-lg mx-auto`}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className={`${theme === "dark" ? "text-muted-foreground" : "text-gray-500"}`}>
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={loading} className={theme === "dark" ? "text-foreground bg-card border border-border hover:bg-accent" : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteUser} disabled={loading} className={theme === "dark" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-red-600 hover:bg-red-700 text-white"}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersManagement;