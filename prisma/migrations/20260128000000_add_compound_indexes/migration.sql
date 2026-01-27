-- Add compound index on RSVP for (sessionId, status) queries
CREATE INDEX "RSVP_sessionId_status_idx" ON "RSVP"("sessionId", "status");

-- Add compound index on EventSession for (eventId, startTime) queries
CREATE INDEX "EventSession_eventId_startTime_idx" ON "EventSession"("eventId", "startTime");
