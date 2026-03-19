-- Add lookup indexes used by roster, leave, and scheduling queries.
CREATE INDEX IF NOT EXISTS "Leave_userId_startDate_endDate_idx" ON "Leave"("userId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "Leave_startDate_endDate_idx" ON "Leave"("startDate", "endDate");

CREATE INDEX IF NOT EXISTS "AutomationRule_day_of_week_idx" ON "AutomationRule"("day_of_week");
CREATE INDEX IF NOT EXISTS "AutomationRule_department_id_day_of_week_idx" ON "AutomationRule"("department_id", "day_of_week");

CREATE INDEX IF NOT EXISTS "OperatingDay_date_idx" ON "OperatingDay"("date");

CREATE INDEX IF NOT EXISTS "UserBaseRule_user_id_day_of_week_idx" ON "UserBaseRule"("user_id", "day_of_week");
CREATE INDEX IF NOT EXISTS "UserBaseRule_template_id_idx" ON "UserBaseRule"("template_id");

CREATE INDEX IF NOT EXISTS "Shift_date_idx" ON "Shift"("date");
CREATE INDEX IF NOT EXISTS "Shift_user_id_date_idx" ON "Shift"("user_id", "date");
CREATE INDEX IF NOT EXISTS "Shift_department_id_date_idx" ON "Shift"("department_id", "date");
