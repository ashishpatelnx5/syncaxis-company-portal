// Real Syncaxis employee roster (from the attendance summary sheet), with
// titles/departments/reporting lines from the hand-drawn org chart.
// Deepak Bisure (MD) isn't on the attendance sheet, so he has no employeeId.
// Sandeep Patil, Priyanka Kulkarni, Mayur Kulkarni, and Shripad Pathak weren't
// on that chart, so they're left unassigned until placed. Email/phone aren't
// known yet either — the UI hides empty fields.
export const employees = [
  { id: 1, employeeId: '0008', name: 'Mahesh Vishnu Babar', title: 'Department Head', department: 'Rexroth', email: '', phone: '', managerId: 17 },
  { id: 2, employeeId: '0027', name: 'Aditya Deepak Bisure', title: 'Product Design Head', department: 'Product Design', email: '', phone: '', managerId: 17 },
  { id: 3, employeeId: '0038', name: 'Shubham Rajesh Kale', title: 'Department Head', department: 'DOBOT', email: '', phone: '', managerId: 17 },
  { id: 4, employeeId: '0042', name: 'S Sivasankar', title: 'Project Supervisor', department: 'Rexroth', email: '', phone: '', managerId: 1 },
  { id: 5, employeeId: '0045', name: 'Rahul Gajanan Fokmare', title: 'Engineer', department: 'Rexroth', email: '', phone: '', managerId: 4 },
  { id: 6, employeeId: '0046', name: 'Atul Suresh Pundkar', title: 'Engineer', department: 'Rexroth', email: '', phone: '', managerId: 4 },
  { id: 7, employeeId: '0051', name: 'Sandeep Vasant Patil', title: '', department: '', email: '', phone: '', managerId: null },
  { id: 8, employeeId: '0052', name: 'Mohsin Salim Mulla', title: 'Marketing', department: 'Marketing', email: '', phone: '', managerId: 17 },
  { id: 9, employeeId: '0065', name: 'Pooja Shamsundar Surywanshi', title: 'Design Engineer', department: 'Rexroth', email: '', phone: '', managerId: 1 },
  { id: 10, employeeId: '0066', name: 'Priyanka Kulkarni', title: '', department: '', email: '', phone: '', managerId: null },
  { id: 11, employeeId: '0067', name: 'Gargi Nitin Kulkarni', title: 'HR & Finance', department: 'HR & Finance', email: '', phone: '', managerId: 17 },
  { id: 12, employeeId: '0068', name: 'Mayur Kulkarni', title: '', department: '', email: '', phone: '', managerId: null },
  { id: 13, employeeId: '0074', name: 'Kshitij Ram Bhosale', title: 'Robotics Engineer', department: 'DOBOT', email: '', phone: '', managerId: 3 },
  { id: 14, employeeId: '0075', name: 'Atharva Abhijit Kulkarni', title: 'Robotics Engineer', department: 'DOBOT', email: '', phone: '', managerId: 3 },
  { id: 15, employeeId: '77', name: 'Shripad Rajeshrwararao Pathak', title: '', department: '', email: '', phone: '', managerId: null },
  { id: 16, employeeId: '78', name: 'Ashish Kumar Patel', title: 'IT & Admin, Robotics Automation', department: 'IT & Admin', email: '', phone: '', managerId: 8 },
  { id: 17, employeeId: '', name: 'Deepak Bisure', title: 'Managing Director', department: 'Executive', email: '', phone: '', managerId: null },
]
