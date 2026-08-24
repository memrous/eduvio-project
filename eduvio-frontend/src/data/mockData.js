// Unified Mock Database and Entity Definitions for StudyHub

export const INITIAL_USER = {
  id: 1,
  name: "Bořek Šarman",
  email: "borek.sarman@upol.cz",
  university: "Palacký University Olomouc",
  faculty: "Faculty of Science",
  program: "Applied Informatics",
  year: "1st Year",
  stagConnected: true
};

export const INITIAL_SUBJECTS = [
  {
    id: 1,
    code: 'KMI/DBS',
    name: 'Database Systems',
    credits: 6,
    lecturer: 'John Smith',
    completionType: 'Credit + Exam',
    isMandatory: true,
    semester: 'ZS 2024/2025',
    description: 'Exploration of relational databases, SQL optimization, database normalization, transactions, and modern schema design. Essential for backend integration.'
  },
  {
    id: 2,
    code: 'KMI/WA',
    name: 'Web Applications',
    credits: 4,
    lecturer: 'Jane Doe',
    completionType: 'Credit',
    isMandatory: true,
    semester: 'ZS 2024/2025',
    description: 'Building modern full-stack web applications using React, Node.js, and HTTP APIs. Emphasizes components, state management, and deployment.'
  },
  {
    id: 3,
    code: 'KMI/PROG',
    name: 'Programming',
    credits: 8,
    lecturer: 'Sarah Jenkins',
    completionType: 'Credit + Exam',
    isMandatory: true,
    semester: 'ZS 2024/2025',
    description: 'Foundational concepts of algorithms, data structures, and object-oriented programming. Covers sorting, design patterns, and debugging strategies.'
  },
  {
    id: 4,
    code: 'KMI/OS',
    name: 'Operating Systems',
    credits: 6,
    lecturer: 'Robert Miles',
    completionType: 'Credit + Exam',
    isMandatory: true,
    semester: 'ZS 2024/2025',
    description: 'Process scheduling, memory management, filesystems, virtual memory, and concurrent execution in modern operating system kernels.'
  },
  {
    id: 5,
    code: 'KMI/SE',
    name: 'Software Engineering',
    credits: 6,
    lecturer: 'Linda Gray',
    completionType: 'Credit',
    isMandatory: true,
    semester: 'ZS 2024/2025',
    description: 'Methodologies for software development life cycles (SDLC), Agile Scrum, team collaboration, version control, and testing techniques.'
  },
  {
    id: 6,
    code: 'KMI/NET',
    name: 'Computer Networks',
    credits: 4,
    lecturer: 'Kevin Wright',
    completionType: 'Credit + Exam',
    isMandatory: false,
    semester: 'ZS 2024/2025',
    description: 'Study of computer networking protocols, OSI model, IP routing, transport controls (TCP/UDP), and basic network security.'
  }
];

export const getRelativeDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const generateRecurringLectures = () => {
  const events = [];
  const start = new Date();
  start.setDate(start.getDate() - 30); // 30 days back
  const end = new Date();
  end.setDate(end.getDate() + 30); // 30 days forward
  
  let current = new Date(start);
  let id = 100;
  
  while (current <= end) {
    const day = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    
    if (day === 1) { // Monday
      events.push({
        id: id++,
        subjectId: 3, // Programming
        title: 'Programming Lecture',
        date: dateStr,
        startTime: '09:00',
        endTime: '10:30',
        type: 'Lecture'
      });
    } else if (day === 2) { // Tuesday
      events.push({
        id: id++,
        subjectId: 1, // Database Systems
        title: 'Database Systems Lecture',
        date: dateStr,
        startTime: '10:00',
        endTime: '11:30',
        type: 'Lecture'
      }, {
        id: id++,
        subjectId: 2, // Web Applications
        title: 'Web Applications Lecture',
        date: dateStr,
        startTime: '14:00',
        endTime: '15:30',
        type: 'Lecture'
      });
    } else if (day === 3) { // Wednesday
      events.push({
        id: id++,
        subjectId: 4, // Operating Systems
        title: 'Operating Systems Lecture',
        date: dateStr,
        startTime: '09:00',
        endTime: '10:30',
        type: 'Lecture'
      });
    } else if (day === 4) { // Thursday
      events.push({
        id: id++,
        subjectId: 5, // Software Engineering
        title: 'Software Engineering Seminar',
        date: dateStr,
        startTime: '11:30',
        endTime: '13:00',
        type: 'Lecture'
      });
    } else if (day === 5) { // Friday
      events.push({
        id: id++,
        subjectId: 6, // Computer Networks
        title: 'Computer Networks Lecture',
        date: dateStr,
        startTime: '10:00',
        endTime: '11:30',
        type: 'Lecture'
      });
    }
    
    current.setDate(current.getDate() + 1);
  }
  return events;
};

// Seed specific assignments, tests, and exams relative to today
const INITIAL_STATIC_EVENTS = [
  {
    id: 1,
    subjectId: 1,
    title: 'Database Project',
    date: getRelativeDate(2), // due in 2 days
    startTime: '23:59',
    endTime: '23:59',
    type: 'Assignment',
    status: 'In Progress'
  },
  {
    id: 2,
    subjectId: 2,
    title: 'Web Applications Test',
    date: getRelativeDate(5), // due in 5 days
    startTime: '14:00',
    endTime: '15:30',
    type: 'Test',
    status: 'Not Started'
  },
  {
    id: 3,
    subjectId: 3,
    title: 'Programming Exam',
    date: '2026-12-20', // hardcoded to match the December 20 spec
    startTime: '09:00',
    endTime: '11:00',
    type: 'Exam',
    status: 'Not Started'
  },
  {
    id: 4,
    subjectId: 4,
    title: 'Operating Systems Midterm',
    date: getRelativeDate(10),
    startTime: '10:00',
    endTime: '11:30',
    type: 'Test',
    status: 'Not Started'
  },
  {
    id: 5,
    subjectId: 5,
    title: 'Requirements Doc Draft',
    date: getRelativeDate(8),
    startTime: '11:59',
    endTime: '11:59',
    type: 'Assignment',
    status: 'Not Started'
  },
  {
    id: 6,
    subjectId: 1,
    title: 'SQL Practice Assignment',
    date: getRelativeDate(-4),
    startTime: '18:00',
    endTime: '19:30',
    type: 'Assignment',
    status: 'Submitted'
  },
  {
    id: 7,
    subjectId: 2,
    title: 'HTML & CSS Fundamentals',
    date: getRelativeDate(-7),
    startTime: '12:00',
    endTime: '13:00',
    type: 'Assignment',
    status: 'Submitted'
  }
];

export const INITIAL_EVENTS = [...generateRecurringLectures(), ...INITIAL_STATIC_EVENTS];

export const INITIAL_RESOURCES = [
  {
    id: 1,
    subjectId: 1,
    title: 'SQL Notes.pdf',
    type: 'PDF',
    description: 'Comprehensive notes covering core SQL operations, queries, and multi-table joins.',
    url: '#',
    uploadedAt: getRelativeDate(-12),
    size: '2.4 MB'
  },
  {
    id: 2,
    subjectId: 2,
    title: 'React Presentation.pdf',
    type: 'SLIDES',
    description: 'Course slides detailing functional components, state, hooks, and local styling structures.',
    url: '#',
    uploadedAt: getRelativeDate(-5),
    size: '4.8 MB'
  },
  {
    id: 3,
    subjectId: 1,
    title: 'Database Cheat Sheet.pdf',
    type: 'PDF',
    description: 'Single page quick reference sheet covering normalization forms and command syntax.',
    url: '#',
    uploadedAt: getRelativeDate(-2),
    size: '1.1 MB'
  },
  {
    id: 4,
    subjectId: 4,
    title: 'OS Memory Management.pdf',
    type: 'NOTES',
    description: 'Review of paging, segmentation, page replacement policies, and translation-lookaside buffers.',
    url: '#',
    uploadedAt: getRelativeDate(-10),
    size: '1.5 MB'
  },
  {
    id: 5,
    subjectId: 2,
    title: 'REST API Guide',
    type: 'LINK',
    description: 'External documentation summarizing design rules, status codes, and HTTP verb structures.',
    url: 'https://example.com/rest-guide',
    uploadedAt: getRelativeDate(-8),
    size: 'External Link'
  },
  {
    id: 6,
    subjectId: 5,
    title: 'git-cheatsheet.pdf',
    type: 'PDF',
    description: 'Visual reference guide covering repository setup, staging, branch merging, and rebasing.',
    url: '#',
    uploadedAt: getRelativeDate(-15),
    size: '0.8 MB'
  }
];
