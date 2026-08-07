import * as React from "react";
export type InstitutionType = 'engineering' | 'medical' | 'school';

interface InstitutionTerminology {
  branch: string;
  branches: string;
  semester: string;
  semesters: string;
  hod: string;
  coAttainment: string;
  labs: string;
  electives: string;
  proctor: string;
  mentoring: string;
}

const TERMINOLOGY_MAP: Record<InstitutionType, InstitutionTerminology> = {
  engineering: {
    branch: 'Branch',
    branches: 'Branches',
    semester: 'Semester',
    semesters: 'Semesters',
    hod: 'HOD',
    coAttainment: 'CO Attainment',
    labs: 'Labs',
    electives: 'Electives',
    proctor: 'Proctor',
    mentoring: 'Mentoring',
    admin: 'Admin',
    admins: 'Admins',
  },
  medical: {
    branch: 'Course',
    branches: 'Courses',
    semester: 'Year/Phase',
    semesters: 'Years/Phases',
    hod: 'HOD',
    coAttainment: 'Competency',
    labs: 'Clinical Postings',
    electives: 'Electives',
    proctor: 'Mentor',
    admin: 'Admin',
    admins: 'Admins',
  },
  school: {
    branch: 'Stream',
    branches: 'Streams',
    semester: 'Class',
    semesters: 'Classes',
    hod: 'Coordinator',
    admin: 'Principal',
    admins: 'Principals',
    coAttainment: 'Learning Outcomes',
    labs: 'Practicals',
    electives: 'Optional Subjects',
    proctor: 'Class Teacher',
    mentoring: 'Guidance',
  }
};

export const getInstitutionType = (): InstitutionType => {
  try {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return (user.org_institution_type || 'engineering') as InstitutionType;
    }
  } catch (e) {
    console.error('Failed to parse user from session storage', e);
  }
  return 'engineering';
};

export const getTerminology = (type?: InstitutionType): InstitutionTerminology => {
  const currentType = type || getInstitutionType();
  return TERMINOLOGY_MAP[currentType] || TERMINOLOGY_MAP.engineering;
};

export const getTerm = (key: keyof InstitutionTerminology, type?: InstitutionType): string => {
  return getTerminology(type)[key];
};

export const hasFeature = (feature: 'labs' | 'electives' | 'coAttainment', type?: InstitutionType): boolean => {
  const currentType = type || getInstitutionType();
  if (currentType === 'school') {
    if (feature === 'labs' || feature === 'coAttainment') {
      return false; // Example: Schools might not use standard engineering lab/coAttainment features
    }
  }
  if (currentType === 'medical') {
    if (feature === 'coAttainment') {
      return false; // Competency tracking is used, but CO attainment is engineering-specific
    }
  }
  return true;
};

export const translateTerminology = (content: any): any => {
  if (typeof content !== "string") return content;

  let result = content;
  const replacements = [
    { pattern: /\bBranch\b/gi, key: "branch" },
    { pattern: /\bBranches\b/gi, key: "branches" },
    { pattern: /\bDepartment\b/gi, key: "branch" },
    { pattern: /\bDepartments\b/gi, key: "branches" },
    { pattern: /\bSem\b/gi, key: "semester" },
    { pattern: /\bSemester\b/gi, key: "semester" },
    { pattern: /\bSemesters\b/gi, key: "semesters" },
    { pattern: /\bDepartment Admin\b/gi, key: "branchAdmin" },
    { pattern: /\bDepartment Admins\b/gi, key: "branchAdmins" },
    { pattern: /\bHOD\b/gi, key: "hod" },
    { pattern: /\bHODs\b/gi, key: "hod" },
    { pattern: /\bHead of Department\b/gi, key: "hod" },
    { pattern: /\bHeads of Departments\b/gi, key: "hod" },
    { pattern: /\bDept heads\b/gi, key: "hod" },
    { pattern: /\bDepartment heads\b/gi, key: "hod" },
    { pattern: /(?<!Library\s|Transport\s)\bAdmin\b(?!istrat)/g, key: "admin" },
    { pattern: /(?<!Library\s|Transport\s)\bAdmins\b(?!istrat)/g, key: "admins" },
    { pattern: /\bProctor\b/g, key: "proctor" },
    { pattern: /\bProctors\b/g, key: "proctor" },
    { pattern: /\bMentoring\b/g, key: "mentoring" },
    { pattern: /\bElective\b/g, key: "electives" },
    { pattern: /\bElectives\b/g, key: "electives" },
    { pattern: /\bCO Attainment\b/g, key: "coAttainment" },
  ];

  for (const { pattern, key } of replacements) {
    if (pattern.test(result)) {
      let replacement = getTerm(key as any);
      if (pattern.source.includes("HODs") || pattern.source.includes("Heads of Departments") || pattern.source.includes("Dept heads") || pattern.source.includes("Department heads") || pattern.source.includes("Proctors") || pattern.source.includes("Electives")) {
        replacement = replacement + "s";
      }

      result = result.replace(pattern, (match) => {
        if (match === match.toLowerCase()) {
          return replacement.toLowerCase();
        }
        if (key === 'hod') {
          return replacement;
        }
        if (match === match.toUpperCase()) {
          return replacement.toUpperCase();
        }
        if (match[0] === match[0].toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement;
      });
    }
  }

  return result;
};

export const translateChildren = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === "string") {
    return translateTerminology(children);
  }
  if (Array.isArray(children)) {
    return React.Children.map(children, child => translateChildren(child));
  }
  if (React.isValidElement(children)) {
    const props = children.props as any;
    if (props && props.children) {
      return React.cloneElement(children, {
        ...props,
        children: translateChildren(props.children),
      } as any);
    }
  }
  return children;
};
