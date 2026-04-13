import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "employee"] }).notNull().default("employee"),
  designation: text("designation", {
    enum: ["academic_writer", "web_developer", "graphic_designer", "video_editor", "intern"],
  }).notNull(),
  employeeCode: text("employee_code").notNull().unique(),
  joiningDate: text("joining_date").notNull(),
  shiftTime: text("shift_time").notNull().default("10:00"),
  graceMinutes: integer("grace_minutes").notNull().default(15),
  officeLat: text("office_lat"),
  officeLng: text("office_lng"),
  allowedRadiusMeters: integer("allowed_radius_meters").notNull().default(200),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  monthlySalary: integer("monthly_salary").notNull().default(30000),
  failDeduction: integer("fail_deduction").notNull().default(0),
});

export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  date: text("date").notNull(),
  checkInTime: text("check_in_time").notNull(),
  status: text("status", { enum: ["present", "late", "half_day"] }).notNull(),
  isLate: integer("is_late", { mode: "boolean" }).notNull().default(false),
  isHalfDay: integer("is_half_day", { mode: "boolean" }).notNull().default(false),
  isManualOverride: integer("is_manual_override", { mode: "boolean" }).notNull().default(false),
  overrideBy: text("override_by"),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  distance: text("distance").notNull(),
  locationValid: integer("location_valid", { mode: "boolean" }).notNull().default(true),
  locationFlag: text("location_flag"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  assignedTo: text("assigned_to").references(() => employees.id),
  createdBy: text("created_by").references(() => employees.id),
  category: text("category", {
    enum: ["youtube_content", "academic", "e_invite", "justdial_leads", "digital_marketing", "other"],
  }).notNull(),
  clientName: text("client_name"),
  status: text("status", {
    enum: ["assigned", "not_started", "in_progress", "completed", "on_hold", "cancelled"],
  }).notNull().default("assigned"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  deadline: text("deadline"),
  estimatedHours: text("estimated_hours"),
  workedHours: text("worked_hours"),
  date: text("date").notNull(),
  dailySummary: text("daily_summary"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const taskLogs = sqliteTable("task_logs", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const failedDeductions = sqliteTable("failed_deductions", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  month: text("month").notNull(),
  amount: integer("amount").notNull().default(0),
  reason: text("reason"),
  createdBy: text("created_by").references(() => employees.id),
  createdAt: text("created_at").notNull(),
});

export const passwordResetRequests = sqliteTable("password_reset_requests", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  employeeName: text("employee_name").notNull(),
  employeeCode: text("employee_code"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  requestedAt: text("requested_at").notNull(),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by").references(() => employees.id),
  newPassword: text("new_password"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const taskProgressLogs = sqliteTable("task_progress_logs", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;