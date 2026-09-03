// One-time migration: loads the data that used to live in
// src/data/departments.js and src/data/employees.js into SQL Server, and
// creates the first admin login. Safe to re-run — departments/employees are
// only seeded if the tables are empty; the admin user is created or
// password-reset every time from SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD.
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { getPool, sql } from '../src/config/db.js'

const departments = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'IT' },
  { id: 3, name: 'Robotics' },
  { id: 4, name: 'Automation' },
  { id: 5, name: 'HR' },
  { id: 6, name: 'Finance' },
  { id: 7, name: 'Marketing' },
  { id: 8, name: 'Sales' },
  { id: 9, name: 'Purchase' },
  { id: 10, name: 'Store' },
]

const employees = [
  { id: 1, employeeId: '0008', name: 'Mahesh Vishnu Babar', title: 'Department Head', departmentIds: [3], managerId: 17 },
  { id: 2, employeeId: '0027', name: 'Aditya Deepak Bisure', title: 'Product Design Head', departmentIds: [], managerId: 17 },
  { id: 3, employeeId: '0038', name: 'Shubham Rajesh Kale', title: 'Department Head', departmentIds: [4], managerId: 17 },
  { id: 4, employeeId: '0042', name: 'S Sivasankar', title: 'Project Supervisor', departmentIds: [3], managerId: 1 },
  { id: 5, employeeId: '0045', name: 'Rahul Gajanan Fokmare', title: 'Engineer', departmentIds: [3], managerId: 4 },
  { id: 6, employeeId: '0046', name: 'Atul Suresh Pundkar', title: 'Engineer', departmentIds: [3], managerId: 4 },
  { id: 8, employeeId: '0052', name: 'Mohsin Salim Mulla', title: 'Marketing', departmentIds: [7], managerId: 17 },
  { id: 9, employeeId: '0065', name: 'Pooja Shamsundar Surywanshi', title: 'Design Engineer', departmentIds: [3], managerId: 1 },
  { id: 11, employeeId: '0067', name: 'Gargi Nitin Kulkarni', title: 'HR & Finance', departmentIds: [5, 6], managerId: 17 },
  { id: 13, employeeId: '0074', name: 'Kshitij Ram Bhosale', title: 'Robotics Engineer', departmentIds: [4], managerId: 3 },
  { id: 14, employeeId: '0075', name: 'Atharva Abhijit Kulkarni', title: 'Robotics Engineer', departmentIds: [4], managerId: 3 },
  { id: 15, employeeId: '77', name: 'Shripad Rajeshrwararao Pathak', title: '', departmentIds: [], managerId: null },
  { id: 16, employeeId: '78', name: 'Ashish Kumar Patel', title: 'IT & Admin, Robotics Automation', departmentIds: [1, 2], managerId: 17 },
  { id: 17, employeeId: '', name: 'Deepak Bisure', title: 'Managing Director', departmentIds: [], managerId: null },
]

async function seedDepartmentsAndEmployees(pool) {
  const existing = await pool.request().query('SELECT COUNT(*) AS n FROM portal.Employees')
  if (existing.recordset[0].n > 0) {
    console.log('portal.Employees already has data — skipping department/employee seed.')
    return
  }

  const transaction = new sql.Transaction(pool)
  await transaction.begin()
  try {
    const departmentIdMap = new Map() // old static id -> new DepartmentId
    for (const dept of departments) {
      const result = await new sql.Request(transaction)
        .input('name', sql.NVarChar(100), dept.name)
        .query('INSERT INTO portal.Departments (Name) OUTPUT INSERTED.DepartmentId VALUES (@name)')
      departmentIdMap.set(dept.id, result.recordset[0].DepartmentId)
    }

    const employeeIdMap = new Map() // old static id -> new EmployeeId
    for (const emp of employees) {
      const result = await new sql.Request(transaction)
        .input('employeeCode', sql.NVarChar(20), emp.employeeId || null)
        .input('name', sql.NVarChar(200), emp.name)
        .input('title', sql.NVarChar(200), emp.title || null)
        .query(
          'INSERT INTO portal.Employees (EmployeeCode, Name, Title) OUTPUT INSERTED.EmployeeId VALUES (@employeeCode, @name, @title)',
        )
      employeeIdMap.set(emp.id, result.recordset[0].EmployeeId)
    }

    for (const emp of employees) {
      if (emp.managerId == null) continue
      await new sql.Request(transaction)
        .input('id', sql.Int, employeeIdMap.get(emp.id))
        .input('managerId', sql.Int, employeeIdMap.get(emp.managerId))
        .query('UPDATE portal.Employees SET ManagerId = @managerId WHERE EmployeeId = @id')
    }

    for (const emp of employees) {
      for (const oldDeptId of emp.departmentIds) {
        await new sql.Request(transaction)
          .input('employeeId', sql.Int, employeeIdMap.get(emp.id))
          .input('departmentId', sql.Int, departmentIdMap.get(oldDeptId))
          .query('INSERT INTO portal.EmployeeDepartments (EmployeeId, DepartmentId) VALUES (@employeeId, @departmentId)')
      }
    }

    await transaction.commit()
    console.log(`Seeded ${departments.length} departments and ${employees.length} employees.`)
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

async function seedAdminUser(pool) {
  const username = process.env.SEED_ADMIN_USERNAME
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!username || !password) {
    console.log('SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD not set — skipping admin user.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const existing = await pool
    .request()
    .input('username', sql.NVarChar(100), username)
    .query('SELECT UserId FROM portal.Users WHERE Username = @username')

  if (existing.recordset[0]) {
    await pool
      .request()
      .input('id', sql.Int, existing.recordset[0].UserId)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query('UPDATE portal.Users SET PasswordHash = @passwordHash, IsActive = 1 WHERE UserId = @id')
    console.log(`Updated password for existing user "${username}".`)
  } else {
    await pool
      .request()
      .input('username', sql.NVarChar(100), username)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query('INSERT INTO portal.Users (Username, PasswordHash, Role) VALUES (@username, @passwordHash, \'admin\')')
    console.log(`Created admin user "${username}".`)
  }
}

async function main() {
  const pool = await getPool()
  await seedDepartmentsAndEmployees(pool)
  await seedAdminUser(pool)
  await pool.close()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
