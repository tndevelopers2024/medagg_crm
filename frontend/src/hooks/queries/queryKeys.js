// Centralized query key factory for all React Query queries.
// Each key is a function returning an array for proper cache matching.

export const queryKeys = {
  // Config data (5min stale)
  leadFields: (params) => ["leadFields", params],
  bookingFields: (params) => ["bookingFields", params],
  leadStages: (params) => ["leadStages", params],
  campaigns: (params) => ["campaigns", params],
  users: (params) => ["users", params],

  // Lead list (30s stale)
  leadList: (params) => ["leadList", params],
  filterMeta: () => ["filterMeta"],

  // Lead detail (60s stale)
  leadDetail: (id) => ["leadDetail", id],
  leadActivities: (id, params) => ["leadActivities", id, params],
  leadCallLogs: (id) => ["leadCallLogs", id],

  // Caller data (60s stale)
  todayFollowUps: () => ["todayFollowUps"],
  tomorrowFollowUps: () => ["tomorrowFollowUps"],
  callerStats: () => ["callerStats"],
  dashboardStats: () => ["dashboardStats"],

  // Admin stats (2min stale)
  adminDashboardV2: (params) => ["adminDashboardV2", params],

  // Volatile (0 stale, polling)
  alarmsCount: () => ["alarmsCount"],
  alarms: (status) => ["alarms", status],
  leadAlarm: (leadId) => ["leadAlarm", leadId],

  // Help requests
  incomingHelpRequests: (params) => ["incomingHelpRequests", params],
  sentHelpRequests: (params) => ["sentHelpRequests", params],
};
