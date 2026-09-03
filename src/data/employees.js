// Real Syncaxis employee roster (from the attendance summary sheet), with
// titles/departments/reporting lines from the hand-drawn org chart.
// Deepak Bisure (MD) isn't on the attendance sheet, so he has no employeeId.
// Shripad Pathak wasn't on that chart, so he's left unassigned until placed.
// Sandeep Patil, Priyanka Kulkarni, and Mayur Kulkarni have left the company
// and were removed. Email/phone and emergency contact info aren't known yet
// either — the UI hides empty fields. departmentIds reference src/data/departments.js.
// Departments were replaced with Admin/IT/Robotics/Automation/HR/Finance/
// Marketing/Sales/Purchase/Store; Rexroth -> Robotics and DOBOT -> Automation.
// "Executive" and "Product Design" no longer exist as departments, so Deepak
// and Aditya are left with no department rather than forced into a wrong fit.
const noEmergencyContact = { name: '', relation: '', phone: '' }

export const employees = [
  { id: 1, employeeId: '0008', name: 'Mahesh Vishnu Babar', title: 'Department Head', departmentIds: [3], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 17 },
  { id: 2, employeeId: '0027', name: 'Aditya Deepak Bisure', title: 'Product Design Head', departmentIds: [], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 17 },
  { id: 3, employeeId: '0038', name: 'Shubham Rajesh Kale', title: 'Department Head', departmentIds: [4], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 17 },
  { id: 4, employeeId: '0042', name: 'S Sivasankar', title: 'Project Supervisor', departmentIds: [3], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 1 },
  { id: 5, employeeId: '0045', name: 'Rahul Gajanan Fokmare', title: 'Engineer', departmentIds: [3], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 4 },
  { id: 6, employeeId: '0046', name: 'Atul Suresh Pundkar', title: 'Engineer', departmentIds: [3], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 4 },
  { id: 8, employeeId: '0052', name: 'Mohsin Salim Mulla', title: 'Marketing', departmentIds: [7], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 17 },
  { id: 9, employeeId: '0065', name: 'Pooja Shamsundar Surywanshi', title: 'Design Engineer', departmentIds: [3], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 1 },
  { id: 11, employeeId: '0067', name: 'Gargi Nitin Kulkarni', title: 'HR & Finance', departmentIds: [5, 6], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 17 },
  { id: 13, employeeId: '0074', name: 'Kshitij Ram Bhosale', title: 'Robotics Engineer', departmentIds: [4], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 3 },
  { id: 14, employeeId: '0075', name: 'Atharva Abhijit Kulkarni', title: 'Robotics Engineer', departmentIds: [4], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 3 },
  { id: 15, employeeId: '77', name: 'Shripad Rajeshrwararao Pathak', title: '', departmentIds: [], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: null },
  { id: 16, employeeId: '78', name: 'Ashish Kumar Patel', title: 'IT & Admin, Robotics Automation', departmentIds: [1, 2], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: 17 },
  { id: 17, employeeId: '', name: 'Deepak Bisure', title: 'Managing Director', departmentIds: [], email: '', phone: '', emergencyContact: noEmergencyContact, managerId: null },
]
