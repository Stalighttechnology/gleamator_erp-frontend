import re

with open('d:/gleamator_erp-frontend/src/components/hod/EnrollmentManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add batchId state and sections state
content = content.replace('const [semesterId, setSemesterId] = useState<string>("");', 'const [batchId, setBatchId] = useState<string>("");\n  const [sections, setSections] = useState<any[]>([]);')
content = content.replace('const [sectionsBySemester, setSectionsBySemester] = useState<Record<string, any[]>>({});\n', '')

# 2. Update bootstrap mapping for sections
content = content.replace('''          if (Array.isArray(boot.data.sections)) {
            const map: Record<string, any[]> = {};
            boot.data.sections.forEach((sec: any) => {
              const semIdKey = String(sec.semester_id || "");
              if (!map[semIdKey]) map[semIdKey] = [];
              map[semIdKey].push({ ...sec, id: String(sec.id) });
            });
            setSectionsBySemester(map);
          }''', '''          if (Array.isArray(boot.data.sections)) {
            setSections(boot.data.sections.map((sec: any) => ({ ...sec, id: String(sec.id) })));
          }''')

# 3. Update loadSubjects dependencies
content = content.replace('if (!semesterId || !subjectType || !sectionId || selectedRole !== "student") return;', 'if (!batchId || !subjectType || !sectionId || selectedRole !== "student") return;')
content = content.replace('semester_id: semesterId,', 'batch_id: batchId,')
content = content.replace('[semesterId, subjectType, sectionId, electivePage, selectedRole]', '[batchId, subjectType, sectionId, electivePage, selectedRole]')

# 4. Update loadStudents logic
content = content.replace('if (selType !== \'open_elective\' && (!semesterId || !sectionId)) return;', 'if (selType !== \'open_elective\' && (!batchId || !sectionId)) return;')
content = content.replace('if (selType === \'open_elective\' && !semesterId) return;', 'if (selType === \'open_elective\' && !batchId) return;')
content = content.replace('if (semesterId) params.set(\'semester_id\', semesterId);', 'if (batchId) params.set(\'batch_id\', batchId);')
content = content.replace('[branchId, selectedSubjectId, semesterId, sectionId, selectedRole]', '[branchId, selectedSubjectId, batchId, sectionId, selectedRole]')

# 5. Update UI for Batch instead of Semester
ui_batch = '''            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Batch</Label>
              <Select 
                value={batchId} 
                onValueChange={(v) => { setBatchId(v); setSectionId(""); }}
                disabled={!selectedRole || selectedRole !== 'student'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>'''
content = re.sub(r'<div className="space-y-2">\s*<Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Semester</Label>.*?</div>', ui_batch, content, count=1, flags=re.DOTALL)

# 6. Update UI for Section
ui_section = '''            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Section</Label>
              <Select 
                value={sectionId} 
                onValueChange={setSectionId}
                disabled={!selectedRole || selectedRole !== 'student' || !batchId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((sec: any) => (
                    <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>'''
content = re.sub(r'<div className="space-y-2">\s*<Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Section</Label>.*?</div>', ui_section, content, count=1, flags=re.DOTALL)

# 7. Update resetFilters
content = content.replace('setSemesterId("");', 'setBatchId("");')

with open('d:/gleamator_erp-frontend/src/components/hod/EnrollmentManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
