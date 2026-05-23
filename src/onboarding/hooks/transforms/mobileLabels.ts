/**
 * Applies mobile-specific title and content overrides for non-sidebar tutorial steps.
 * Returns the original title/content if no mobile override matches.
 */
export function applyMobileLabels(step: any): { title: string; content: string } {
  const lowercaseTitle = (step.title || '').toLowerCase();

  if (lowercaseTitle.includes('welcome')) {
    return { title: 'Welcome!', content: "Let's show you around your portal." };
  }
  if (lowercaseTitle.includes('schedule') || lowercaseTitle.includes('timetable')) {
    return { title: 'Check Classes', content: "Check today's classes here." };
  }
  if (lowercaseTitle.includes('attendance')) {
    return { title: 'Track Attendance', content: 'See your attendance here.' };
  }
  if (
    lowercaseTitle.includes('performance') ||
    lowercaseTitle.includes('marks') ||
    lowercaseTitle.includes('stats') ||
    lowercaseTitle.includes('metrics') ||
    lowercaseTitle.includes('overview') ||
    lowercaseTitle.includes('charts') ||
    lowercaseTitle.includes('analytics')
  ) {
    return { title: 'Track Performance', content: 'Track your performance and grades here.' };
  }
  if (lowercaseTitle.includes('timeline') || lowercaseTitle.includes('timer')) {
    return { title: 'Live Sessions', content: 'Monitor active live sessions here.' };
  }
  if (lowercaseTitle.includes('fees') || lowercaseTitle.includes('financial')) {
    return { title: 'Manage Fees', content: 'View and pay your fees here.' };
  }
  if (lowercaseTitle.includes('leave')) {
    return { title: 'Apply Leave', content: 'Submit and track leave requests.' };
  }
  if (lowercaseTitle.includes('notifications') || lowercaseTitle.includes('announcement')) {
    return { title: 'Read Updates', content: 'Important updates appear here.' };
  }
  if (lowercaseTitle.includes('profile')) {
    return { title: 'Manage Profile', content: 'Check and update your profile details.' };
  }
  if (
    lowercaseTitle.includes('users') ||
    lowercaseTitle.includes('resident') ||
    lowercaseTitle.includes('enroll')
  ) {
    return { title: 'Manage Users', content: 'Add and manage user profiles here.' };
  }
  if (lowercaseTitle.includes('branch')) {
    return { title: 'Manage Branches', content: 'Configure institution campuses here.' };
  }
  if (lowercaseTitle.includes('report')) {
    return { title: 'Generate Reports', content: 'Create and download summary reports.' };
  }
  if (lowercaseTitle.includes('search')) {
    return { title: 'Global Search', content: 'Search records across the system.' };
  }

  return { title: step.title, content: step.content };
}
